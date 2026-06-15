import type { AuthUser } from '@medicget/shared/auth';
import {
  payphone,
  toCents,
  buildPaymentBreakdown,
  type CheckoutSession,
  type PaymentBreakdown,
} from '@medicget/shared/payphone';
import { sendEmail }                       from '@medicget/shared/email';
import { generateMeetingUrl }              from '@medicget/shared/meeting';
import { createNotification }              from '@medicget/shared/notifications';
import { notifyAdminPaymentConfirmed }     from '@medicget/shared/admin-notifications';
import type { CheckoutInput, ConfirmInput } from './payment.schemas';

type ServiceResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

/**
 * Window during which the patient must complete payment. After this we
 * auto-cancel the appointment and free the booked slot. 15 minutes is
 * the de-facto standard on most LatAm booking platforms (long enough
 * for the patient to pull out a card, short enough that the slot
 * doesn't sit idle).
 */
const PAYMENT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Hours-before-appointment threshold for full-refund eligibility.
 * Cancellations later than this get NO refund (configurable later via
 * env var if business changes its mind).
 */
const REFUND_HOURS_THRESHOLD = 24;

export const paymentService = {
  /**
   * Step 1 — el backend NO llama a PayPhone. Solo persiste un Payment
   * PENDING y devuelve los datos que el frontend necesita para montar
   * el widget Cajita de Pagos.
   *
   * El widget de PayPhone se renderiza completamente en el navegador.
   * Nuestro server actúa de "preparador" persistiendo el estado y
   * devolviendo `token + storeId + amount` al frontend.
   */
  async checkout(
    appointmentId: string,
    user:          AuthUser,
    input:         CheckoutInput,
  ): Promise<ServiceResult<CheckoutSession & { expiresAt: Date; breakdown: PaymentBreakdown }>> {
    if (user.role !== 'PATIENT') {
      return { ok: false, code: 'FORBIDDEN', message: 'Sólo el paciente puede iniciar el pago.' };
    }

    const { prisma } = await import('@medicget/shared/prisma');
    const appt = await prisma.appointment.findUnique({
      where:   { id: appointmentId },
      include: {
        patient: { include: { user: { include: { profile: true } } } },
        doctor:  { include: { user: { include: { profile: true } } } },
        payment: true,
      },
    });
    if (!appt)                                  return { ok: false, code: 'NOT_FOUND',  message: 'Cita no encontrada.' };
    if (appt.patient.userId !== user.id)        return { ok: false, code: 'FORBIDDEN',  message: 'No podés pagar esta cita.' };
    if (appt.status === 'CANCELLED')            return { ok: false, code: 'BAD_REQUEST', message: 'La cita fue cancelada.' };
    if (appt.payment?.status === 'PAID')        return { ok: false, code: 'BAD_REQUEST', message: 'Esta cita ya está pagada.' };

    const now = new Date();

    const docName  = `${appt.doctor.user.profile?.firstName ?? ''} ${appt.doctor.user.profile?.lastName ?? ''}`.trim();
    const dateStr  = new Date(appt.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    const reference = `MedicGet · Dr. ${docName} · ${dateStr} ${appt.time}`.slice(0, 100);

    // El paciente paga `honorarios del médico + comisión por uso de
    // plataforma`. La comisión se configura desde /admin/settings
    // (PLATFORM_FEE_PCT, default 10%). Cobramos el total al cliente y
    // guardamos el desglose en el Payment para auditoría / liquidación.
    const breakdown = await buildPaymentBreakdown(appt.price);
    const amountCents = toCents(breakdown.totalAmount);

    const expiresAt = new Date(now.getTime() + PAYMENT_WINDOW_MS);

    const session = await payphone.buildCheckoutSession({
      amountCents,
      amountWithTaxCents:  amountCents,
      taxCents:            0,
      clientTransactionId: appt.id,
      responseUrl:         input.responseUrl,
      reference,
    });
    if (!session.ok) {
      return { ok: false, code: 'BAD_GATEWAY', message: `No se pudo iniciar el pago: ${session.error}` };
    }

    // Persist el estado PENDING. Idempotente: cualquier intento previo
    // se sobreescribe con la sesión nueva (el widget de PayPhone vive 10
    // min y nosotros le damos otros 5 de margen).
    //
    // `amount` guarda lo cobrado al paciente (incluye fee). `platformFee`
    // y `doctorAmount` se llenan recién en confirm — acá los dejamos en 0
    // por si la transacción se cancela antes de aprobarse.
    await prisma.payment.upsert({
      where:  { appointmentId: appt.id },
      update: {
        method:            'CARD',
        status:            'PENDING',
        amount:            breakdown.totalAmount,
        // payphonePaymentId se setea recién cuando PayPhone redirige al
        // /return con `?id=N`. Hasta ese momento sigue null.
        payphonePaymentId: null,
        paymentToken:      session.token,
        paymentUrl:        null,
        expiresAt,
      },
      create: {
        appointmentId:     appt.id,
        amount:            breakdown.totalAmount,
        method:            'CARD',
        status:            'PENDING',
        payphonePaymentId: null,
        paymentToken:      session.token,
        paymentUrl:        null,
        expiresAt,
      },
    });

    return { ok: true, data: { ...session, expiresAt, breakdown } };
  },

  /**
   * Step 2 — confirm the sale after the user returns. Always callable
   * (even if the user navigates back manually) — this is what
   * actually flips the Payment row to PAID and the Appointment to
   * UPCOMING.
   */
  async confirm(
    appointmentId: string,
    user:          AuthUser,
    input:         ConfirmInput,
  ): Promise<ServiceResult<{ status: string }>> {
    const { prisma } = await import('@medicget/shared/prisma');
    const appt = await prisma.appointment.findUnique({
      where:   { id: appointmentId },
      include: {
        patient: { include: { user: { include: { profile: true } } } },
        doctor:  { include: { user: { include: { profile: true } } } },
        payment: true,
      },
    });
    if (!appt)                                          return { ok: false, code: 'NOT_FOUND',  message: 'Cita no encontrada.' };
    if (user.role === 'PATIENT' && appt.patient.userId !== user.id) {
      return { ok: false, code: 'FORBIDDEN', message: 'Esta cita no es tuya.' };
    }
    if (!appt.payment)                                  return { ok: false, code: 'BAD_REQUEST', message: 'No hay un pago iniciado para esta cita.' };

    // Idempotent: if it's already PAID just report current state.
    if (appt.payment.status === 'PAID') {
      return { ok: true, data: { status: 'PAID' } };
    }

    // En el flow Cajita, PayPhone redirige con `?id=N` que es el
    // identificador propio de PayPhone. El frontend nos lo pasa en
    // `input.payphoneId` (o el alias legado `payphonePaymentId`).
    // Lo persistimos ANTES de confirmar para tener el rastro aunque la
    // llamada al confirm falle.
    const payphoneId =
      input.payphoneId ?? input.payphonePaymentId ?? appt.payment.payphonePaymentId;
    if (!payphoneId && input.fakeOk !== true) {
      return { ok: false, code: 'BAD_REQUEST', message: 'Falta el id de la transacción de PayPhone.' };
    }
    if (payphoneId && payphoneId !== appt.payment.payphonePaymentId) {
      await prisma.payment.update({
        where: { appointmentId: appt.id },
        data:  { payphonePaymentId: payphoneId },
      });
    }

    const result = await payphone.confirmSale(
      payphoneId ?? 'stub',
      appt.id,
      input.fakeOk === true,
    );
    if (!result.ok) {
      return { ok: false, code: 'BAD_GATEWAY', message: `PayPhone rechazó la confirmación: ${result.error}` };
    }

    if (result.status === 'Approved') {
      // Recalculamos el desglose por si el % cambió entre el checkout y
      // el confirm. La base sigue siendo `appt.price` (lo del médico).
      const breakdown = await buildPaymentBreakdown(appt.price);
      await prisma.payment.update({
        where: { appointmentId: appt.id },
        data:  {
          status:        'PAID',
          paidAt:        new Date(),
          transactionId: result.transactionId ?? appt.payment.payphonePaymentId,
          // amount = total cobrado al cliente (incluye fee)
          // doctorAmount = honorarios del médico (precio base)
          // platformFee = comisión por uso de plataforma (adicional)
          // Invariante: amount = doctorAmount + platformFee.
          amount:        breakdown.totalAmount,
          platformFee:   breakdown.platformFee,
          doctorAmount:  breakdown.baseAmount,
          notes: result.cardBrand
            ? `${result.cardBrand} ****${result.cardLast4 ?? ''}`
            : undefined,
        },
      });

      // ─── Side effects de "cita confirmada" ─────────────────────────
      // Acá pasa todo lo que ANTES se disparaba en appointmentsService.create.
      // El pago ya entró, así que ahora sí podemos:
      //   1. Generar el link de Jitsi (solo si ONLINE).
      //   2. Promover a UPCOMING.
      //   3. Notificar in-app + email + push a paciente y médico.

      let meetingUrl: string | null = null;
      if (appt.modality === 'ONLINE') {
        try {
          meetingUrl = await generateMeetingUrl(appt.id);
          await prisma.appointment.update({
            where: { id: appt.id },
            data:  { meetingUrl },
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[paymentService.confirm] generateMeetingUrl failed:', err);
        }
      }

      if (appt.status === 'PENDING') {
        await prisma.appointment.update({
          where: { id: appt.id },
          data:  { status: 'UPCOMING' },
        });
      }

      // Disparamos las notificaciones in-app + email en background. Si
      // alguna falla, no rompemos el confirm (la cita ya está pagada).
      void notifyAppointmentConfirmed(appt.id, meetingUrl);

      // Aviso operacional a los admins configurados desde /admin/settings →
      // tab Notificaciones. Fire-and-forget.
      void notifyAdminPaymentConfirmed(appt.id).catch(() => {/* logged */});

      return { ok: true, data: { status: 'PAID' } };
    }

    if (result.status === 'Pending') {
      // PayPhone aún no terminó de procesar — raro pero posible.
      return { ok: true, data: { status: 'PENDING' } };
    }

    // Cualquier otro status (Rejected, Cancelled, Error, Annulled, etc.) → fallo.
    await prisma.payment.update({
      where: { appointmentId: appt.id },
      data:  { status: 'FAILED' },
    });
    return { ok: true, data: { status: 'FAILED' } };
  },

  /**
   * Step 3 — abre una solicitud de reembolso. NO ejecuta el reverso real
   * en PayPhone (Cajita no expone API de reverso); en cambio crea un
   * `RefundRequest(PENDING)` que el superadmin procesa manualmente desde
   * /admin/refunds tras hacer el reverso en PayPhone Business.
   *
   * Resultado para el caller:
   *   • `queued: true`  → solicitud creada, Payment quedó en PENDING_REFUND.
   *   • `queued: false` → no aplica reembolso (sin pago aprobado, fuera
   *     de ventana <24h, etc) — el motivo está en `reason`.
   *
   * Refund eligibility:
   *   • caller es CLINIC dueña de la cita → siempre eligible.
   *   • caller es el PATIENT y faltan >=24h para la cita → eligible.
   *   • cualquier otro caso → no eligible (returns queued:false).
   *
   * Idempotente: si ya hay una RefundRequest en PENDING/PROCESSED para
   * este Payment, devuelve esa misma sin crear otra.
   */
  async refund(
    appointmentId: string,
    user:          AuthUser,
    requestReason?: string,
  ): Promise<ServiceResult<{ queued: boolean; reason: string; refundRequestId?: string }>> {
    const { prisma } = await import('@medicget/shared/prisma');
    const appt = await prisma.appointment.findUnique({
      where:   { id: appointmentId },
      include: { patient: true, payment: { include: { refundRequest: true } }, clinic: true },
    });
    if (!appt) return { ok: false, code: 'NOT_FOUND',  message: 'Cita no encontrada.' };
    if (!appt.payment || appt.payment.status !== 'PAID') {
      // Si el pago ya está en PENDING_REFUND devolvemos la request existente
      // (cubre el caso "el paciente clickea cancelar dos veces seguidas").
      if (appt.payment?.status === 'PENDING_REFUND' && appt.payment.refundRequest) {
        return {
          ok: true,
          data: {
            queued: true,
            reason: 'Ya hay una solicitud de reembolso en curso para esta cita.',
            refundRequestId: appt.payment.refundRequest.id,
          },
        };
      }
      return { ok: true, data: { queued: false, reason: 'No había pago aprobado.' } };
    }

    // Authorisation + ventana de tiempo.
    if (user.role === 'CLINIC') {
      const clinic = await prisma.clinic.findUnique({ where: { userId: user.id } });
      if (!clinic || appt.clinicId !== clinic.id) {
        return { ok: false, code: 'FORBIDDEN', message: 'Esta cita no pertenece a tu clínica.' };
      }
    } else if (user.role === 'PATIENT') {
      if (appt.patient.userId !== user.id) {
        return { ok: false, code: 'FORBIDDEN', message: 'Esta cita no es tuya.' };
      }
      const hoursUntil = (new Date(`${appt.date.toISOString().slice(0, 10)}T${appt.time}:00-05:00`).getTime() - Date.now()) / (60 * 60 * 1000);
      if (hoursUntil < REFUND_HOURS_THRESHOLD) {
        return {
          ok: true,
          data: {
            queued: false,
            reason: `Las cancelaciones con menos de ${REFUND_HOURS_THRESHOLD}h de anticipación no son reembolsables.`,
          },
        };
      }
    } else {
      return { ok: false, code: 'FORBIDDEN', message: 'No tenés permiso para reembolsar.' };
    }

    // Transacción: crear RefundRequest + marcar Payment como PENDING_REFUND.
    // Usamos upsert sobre paymentId (único) para resistir double-clicks.
    const refundRequest = await prisma.refundRequest.upsert({
      where:  { paymentId: appt.payment.id },
      update: {}, // no-op si ya existe
      create: {
        paymentId:         appt.payment.id,
        appointmentId:     appt.id,
        status:            'PENDING',
        requestedByUserId: user.id,
        requestReason:     requestReason?.trim() || null,
      },
    });

    if (appt.payment.status === 'PAID') {
      await prisma.payment.update({
        where: { id: appt.payment.id },
        data:  { status: 'PENDING_REFUND' },
      });
    }

    // Side effects fire-and-forget — el caller no espera por las notifs.
    void notifyRefundRequested(appt.id, refundRequest.id).catch(() => {/* swallow */});

    return {
      ok: true,
      data: {
        queued: true,
        reason: 'Solicitud de reembolso creada. El equipo la procesa en 3-5 días hábiles.',
        refundRequestId: refundRequest.id,
      },
    };
  },

  /**
   * Sweeper — finds all PENDING appointments whose payment window
   * elapsed and cancels them (frees the slot too). Called inline at
   * the top of `appointmentsService.list()` as a poor-man's cron.
   * Cheap because of the partial index on `Payment.expiresAt`.
   */
  async sweepExpired(): Promise<number> {
    const { prisma } = await import('@medicget/shared/prisma');
    const now = new Date();
    // OJO: solo hacemos sweep de pagos DE CITA (los que tienen
    // appointmentId). Los pagos de suscripción usan otro flow y no
    // expiran con esta lógica — los maneja el endpoint de confirm.
    const expired = await prisma.payment.findMany({
      where: {
        status:        'PENDING',
        expiresAt:     { lt: now },
        appointmentId: { not: null },
      },
      select: { id: true, appointmentId: true },
      take:   100,
    });

    if (expired.length === 0) return 0;

    for (const p of expired) {
      // El filtro ya garantiza appointmentId != null; este guard sólo
      // satisface al type-checker estricto (Payment.appointmentId es
      // nullable a nivel de schema).
      if (!p.appointmentId) continue;
      const apptId = p.appointmentId;
      try {
        // Flip Appointment + Payment + Slot in a transaction.
        await prisma.$transaction([
          prisma.appointment.update({
            where: { id: apptId },
            data:  { status: 'CANCELLED', cancelReason: 'Pago no completado a tiempo.' },
          }),
          prisma.payment.update({
            where: { id: p.id },
            data:  { status: 'FAILED' },
          }),
          prisma.appointmentSlot.updateMany({
            where: { appointmentId: apptId },
            data:  { isBooked: false, appointmentId: null },
          }),
        ]);
      } catch {
        // Don't blow up the whole sweep if one row is weird; the next
        // tick will retry.
      }
    }
    return expired.length;
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
 *  Side-effect helpers
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Side effect global de "cita confirmada": notifica a paciente y médico
 * (in-app + push + email al paciente) que la cita quedó reservada y
 * pagada. Reemplaza al viejo `notifyPaymentApproved` + el flow que antes
 * estaba en `appointmentsService.create` (correos prematuros).
 *
 * Best-effort. Se llama fire-and-forget desde `paymentService.confirm`.
 */
async function notifyAppointmentConfirmed(
  appointmentId: string,
  meetingUrl:    string | null,
): Promise<void> {
  try {
    const { prisma } = await import('@medicget/shared/prisma');
    const a = await prisma.appointment.findUnique({
      where:   { id: appointmentId },
      include: {
        patient: { include: { user: { include: { profile: true } } } },
        doctor:  { include: { user: { include: { profile: true } } } },
        clinic:  true,
        payment: true,
      },
    });
    if (!a) return;

    const patientFirst = a.patient.user.profile?.firstName ?? 'paciente';
    const docName      = `${a.doctor.user.profile?.firstName ?? ''} ${a.doctor.user.profile?.lastName ?? ''}`.trim();
    const dateShort    = new Date(a.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    const dateLong     = new Date(a.date).toLocaleDateString('es-ES', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    });

    // ─── Notificaciones in-app + push ────────────────────────────────
    await Promise.all([
      createNotification({
        userId:   a.patient.userId,
        type:     'APPOINTMENT_CONFIRMED',
        title:    'Cita confirmada',
        message:  `Tu cita con Dr. ${docName} para el ${dateShort} a las ${a.time} fue confirmada y pagada.`,
        metadata: { appointmentId },
        pushUrl:  `/patient/appointments/${appointmentId}`,
      }).catch(() => {/* swallow */}),
      createNotification({
        userId:   a.doctor.userId,
        type:     'APPOINTMENT_CONFIRMED',
        title:    'Nueva cita pagada',
        message:  `${patientFirst} confirmó y pagó la cita del ${dateShort} a las ${a.time}.`,
        metadata: { appointmentId },
        pushUrl:  `/doctor/appointments/${appointmentId}`,
      }).catch(() => {/* swallow */}),
    ]);

    // ─── Email al paciente con todos los detalles ───────────────────
    if (!a.patient.user.email) return;

    const modalityCopy =
      a.modality === 'ONLINE'     ? 'Videollamada (online)' :
      a.modality === 'PRESENCIAL' ? `Presencial${a.clinic ? ` en ${a.clinic.name}` : ''}` :
                                    'Chat en vivo';

    const meetingBlock = meetingUrl
      ? `
        <div style="background:#dbeafe;border-radius:12px;padding:20px;margin:24px 0;text-align:center">
          <p style="margin:0 0 12px;font-size:13px;color:#1e40af;font-weight:600;letter-spacing:.05em;text-transform:uppercase">
            Enlace de la videollamada
          </p>
          <a href="${meetingUrl}"
             style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">
            Unirme a la consulta
          </a>
          <p style="margin:14px 0 0;font-size:12px;color:#475569">
            Guardá este enlace. Lo necesitarás el día de la consulta:<br/>
            <a href="${meetingUrl}" style="color:#2563eb;word-break:break-all">${meetingUrl}</a>
          </p>
        </div>`
      : '';

    const html = `
      <!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;margin:0;padding:24px">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0">
          <h1 style="font-size:22px;color:#0f172a;margin:0 0 8px">¡Pago confirmado, ${patientFirst}!</h1>
          <p style="font-size:15px;color:#475569;margin:0 0 16px">
            Tu cita con <strong>Dr. ${docName}</strong> queda reservada y pagada.
          </p>

          <table style="width:100%;border-collapse:collapse;margin:0 0 16px">
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Fecha</td>
                <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right;text-transform:capitalize">${dateLong}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Hora</td>
                <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">${a.time}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Modalidad</td>
                <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">${modalityCopy}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Especialidad</td>
                <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">${a.doctor.specialty}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Honorarios profesionales</td>
                <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">$${(a.payment?.doctorAmount ?? a.price).toFixed(2)}</td></tr>
            ${a.payment && a.payment.platformFee > 0 ? `
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Comisión por uso de plataforma</td>
                <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">$${a.payment.platformFee.toFixed(2)}</td></tr>` : ''}
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Importe total pagado</td>
                <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:700;text-align:right">$${(a.payment?.amount ?? a.price).toFixed(2)}</td></tr>
          </table>

          ${meetingBlock}

          <p style="font-size:13px;color:#64748b;margin:24px 0 0;line-height:1.5">
            Si necesitás cancelar, hacelo con al menos 24h de antelación para que la devolución sea automática.
          </p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>
          <p style="font-size:11px;color:#94a3b8;margin:0">
            MedicGet · Este es un correo automático, por favor no respondas.
          </p>
        </div>
      </body></html>`;

    const totalPaid    = a.payment?.amount       ?? a.price;
    const platformFee  = a.payment?.platformFee  ?? 0;
    const doctorAmount = a.payment?.doctorAmount ?? a.price;
    const text = [
      `Pago confirmado por $${totalPaid.toFixed(2)}.`,
      `Cita con Dr. ${docName} (${a.doctor.specialty}).`,
      ``,
      `Fecha: ${dateLong}`,
      `Hora: ${a.time}`,
      `Modalidad: ${modalityCopy}`,
      platformFee > 0
        ? `\nDesglose:\n  Honorarios: $${doctorAmount.toFixed(2)}\n  Comisión plataforma: $${platformFee.toFixed(2)}\n  Total: $${totalPaid.toFixed(2)}`
        : '',
      meetingUrl ? `\nEnlace de videollamada: ${meetingUrl}` : '',
    ].join('\n');

    await sendEmail({
      to:      a.patient.user.email,
      subject: `Cita confirmada · Dr. ${docName}`,
      html,
      text,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[notifyAppointmentConfirmed] failed:', err);
  }
}

/**
 * Side effect de "solicitud de reembolso creada". Notifica:
 *   • Al paciente (in-app + push + email): "tu reembolso está en proceso".
 *   • A todos los ADMIN (in-app + push): "hay una nueva solicitud pendiente".
 *
 * Best-effort — si el envío de algún email falla, swalloweamos para no
 * romper el flow de cancelación.
 */
async function notifyRefundRequested(
  appointmentId:   string,
  refundRequestId: string,
): Promise<void> {
  try {
    const { prisma } = await import('@medicget/shared/prisma');
    const appt = await prisma.appointment.findUnique({
      where:   { id: appointmentId },
      include: {
        patient: { include: { user: { include: { profile: true } } } },
        doctor:  { include: { user: { include: { profile: true } } } },
        payment: true,
      },
    });
    if (!appt) return;

    const patientFirst = appt.patient.user.profile?.firstName ?? 'paciente';
    const docName      = `${appt.doctor.user.profile?.firstName ?? ''} ${appt.doctor.user.profile?.lastName ?? ''}`.trim();
    const dateShort    = new Date(appt.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    const amount       = appt.payment?.amount ?? 0;

    // ─── 1. Notif al paciente ───────────────────────────────────────────
    await createNotification({
      userId:   appt.patient.userId,
      type:     'REFUND_REQUESTED',
      title:    'Reembolso en proceso',
      message:  `Tu cita con Dr. ${docName} fue cancelada. Procesamos tu reembolso de $${amount.toFixed(2)} en 3-5 días hábiles.`,
      metadata: { appointmentId, refundRequestId },
      pushUrl:  `/patient/appointments/${appointmentId}`,
    }).catch(() => {/* swallow */});

    // ─── 2. Notif in-app a todos los ADMIN ──────────────────────────────
    // Lista chica (≤decenas), no hace falta paginar.
    const admins = await prisma.user.findMany({
      where:  { role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });
    await Promise.all(
      admins.map((admin) =>
        createNotification({
          userId:   admin.id,
          type:     'REFUND_REQUESTED',
          title:    'Nueva solicitud de reembolso',
          message:  `${patientFirst} canceló su cita con Dr. ${docName} (${dateShort} ${appt.time}). Monto $${amount.toFixed(2)} pendiente de reverso en PayPhone.`,
          metadata: { appointmentId, refundRequestId },
          pushUrl:  `/admin/refunds`,
        }).catch(() => {/* swallow */}),
      ),
    );

    // ─── 3. Email al paciente ──────────────────────────────────────────
    if (!appt.patient.user.email) return;

    const html = `
      <!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;margin:0;padding:24px">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0">
          <h1 style="font-size:22px;color:#0f172a;margin:0 0 8px">Reembolso en proceso, ${patientFirst}</h1>
          <p style="font-size:15px;color:#475569;margin:0 0 16px;line-height:1.5">
            Tu cita con <strong>Dr. ${docName}</strong> del ${dateShort} a las ${appt.time} fue cancelada y aplicaste a reembolso.
          </p>
          <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin:24px 0">
            <p style="margin:0 0 6px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Monto a reembolsar</p>
            <p style="margin:0;font-size:28px;font-weight:700;color:#0f172a">$${amount.toFixed(2)}</p>
          </div>
          <p style="font-size:14px;color:#475569;margin:0 0 14px;line-height:1.6">
            Nuestro equipo procesa el reverso en <strong>3 a 5 días hábiles</strong>. Vas a verlo reflejado en el mismo medio con el que pagaste.
          </p>
          <p style="font-size:13px;color:#94a3b8;margin:24px 0 0">
            Si tenés dudas, escribinos a <a href="mailto:soportemedicget@abisoft.it" style="color:#2563eb">soportemedicget@abisoft.it</a>.
          </p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>
          <p style="font-size:11px;color:#94a3b8;margin:0">MedicGet · Correo automático, no respondas a este mensaje.</p>
        </div>
      </body></html>`;
    const text = [
      `Reembolso en proceso.`,
      `Cita con Dr. ${docName} (${dateShort} ${appt.time}) cancelada.`,
      `Monto a reembolsar: $${amount.toFixed(2)}.`,
      `Lo procesamos en 3-5 días hábiles al mismo medio de pago.`,
    ].join('\n');

    await sendEmail({
      to:      appt.patient.user.email,
      subject: `Reembolso en proceso · $${amount.toFixed(2)}`,
      html,
      text,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[notifyRefundRequested] failed:', err);
  }
}
