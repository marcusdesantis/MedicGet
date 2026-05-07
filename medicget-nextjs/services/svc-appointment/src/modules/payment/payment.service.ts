import type { AuthUser } from '@medicget/shared/auth';
import { payphone, splitAmount, toCents } from '@medicget/shared/payphone';
import { sendEmail }                       from '@medicget/shared/email';
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
   * Step 1 — register a sale with PayPhone. Returns the redirect URL
   * the frontend opens.
   *
   * Idempotent-ish: if there's already a non-expired payment URL on
   * the appointment we return the same one instead of creating a new
   * PayPhone session.
   */
  async checkout(
    appointmentId: string,
    user:          AuthUser,
    input:         CheckoutInput,
  ): Promise<ServiceResult<{ redirectUrl: string; expiresAt: Date }>> {
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

    // Reuse a non-expired session if it exists. Avoids racking up
    // PayPhone sessions when the patient closes the tab and comes back.
    const now = new Date();
    if (appt.payment?.paymentUrl &&
        appt.payment.expiresAt && appt.payment.expiresAt > now) {
      return {
        ok:   true,
        data: { redirectUrl: appt.payment.paymentUrl, expiresAt: appt.payment.expiresAt },
      };
    }

    const profile  = appt.patient.user.profile;
    const docName  = `${appt.doctor.user.profile?.firstName ?? ''} ${appt.doctor.user.profile?.lastName ?? ''}`.trim();
    const dateStr  = new Date(appt.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    const reference = `MedicGet · Dr. ${docName} · ${dateStr} ${appt.time}`.slice(0, 100);

    // PayPhone requires cents and round numbers. We don't compute the
    // platformFee yet — that happens on confirm so the % can change
    // between booking and payment without splitting incorrectly.
    const amountCents = toCents(appt.price);

    const expiresAt = new Date(now.getTime() + PAYMENT_WINDOW_MS);
    const cancellationUrl = input.cancellationUrl ?? input.responseUrl;

    const sale = await payphone.prepareSale({
      amountCents,
      amountWithTaxCents: amountCents,
      taxCents:           0,
      clientTransactionId: appt.id,
      responseUrl:         input.responseUrl,
      cancellationUrl,
      reference,
      email:       appt.patient.user.email,
      phoneNumber: profile?.phone ?? undefined,
    });
    if (!sale.ok) {
      return { ok: false, code: 'BAD_GATEWAY', message: `No se pudo iniciar el pago: ${sale.error}` };
    }

    // Persist the prep so confirm can find it again. We use upsert
    // because the appointment-create flow already inserts a Payment row.
    await prisma.payment.upsert({
      where:  { appointmentId: appt.id },
      update: {
        method:            'CARD',
        status:            'PENDING',
        payphonePaymentId: sale.paymentId,
        paymentToken:      sale.token,
        paymentUrl:        sale.redirectUrl,
        expiresAt,
      },
      create: {
        appointmentId:     appt.id,
        amount:            appt.price,
        method:            'CARD',
        status:            'PENDING',
        payphonePaymentId: sale.paymentId,
        paymentToken:      sale.token,
        paymentUrl:        sale.redirectUrl,
        expiresAt,
      },
    });

    return { ok: true, data: { redirectUrl: sale.redirectUrl, expiresAt } };
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
    if (!appt.payment?.payphonePaymentId)               return { ok: false, code: 'BAD_REQUEST', message: 'No hay un pago iniciado para esta cita.' };

    // Idempotent: if it's already PAID just report current state.
    if (appt.payment.status === 'PAID') {
      return { ok: true, data: { status: 'PAID' } };
    }

    const result = await payphone.confirmSale(
      appt.payment.payphonePaymentId,
      appt.id,
      input.fakeOk === true,
    );
    if (!result.ok) {
      return { ok: false, code: 'BAD_GATEWAY', message: `PayPhone rechazó la confirmación: ${result.error}` };
    }

    if (result.status === 'Approved') {
      const { platformFee, doctorAmount } = await splitAmount(appt.price);
      await prisma.payment.update({
        where: { appointmentId: appt.id },
        data:  {
          status:        'PAID',
          paidAt:        new Date(),
          transactionId: result.transactionId ?? appt.payment.payphonePaymentId,
          platformFee,
          doctorAmount,
          notes: result.cardBrand
            ? `${result.cardBrand} ****${result.cardLast4 ?? ''}`
            : undefined,
        },
      });
      // Promote the appointment from PENDING (awaiting payment) to UPCOMING.
      if (appt.status === 'PENDING') {
        await prisma.appointment.update({
          where: { id: appt.id },
          data:  { status: 'UPCOMING' },
        });
      }
      // Notify the patient by email — best-effort.
      void notifyPaymentApproved(appt.id);
      return { ok: true, data: { status: 'PAID' } };
    }

    if (result.status === 'Rejected' || result.status === 'Cancelled') {
      await prisma.payment.update({
        where: { appointmentId: appt.id },
        data:  { status: 'FAILED' },
      });
      return { ok: true, data: { status: 'FAILED' } };
    }

    // Pending — PayPhone will notify later. Leave the row alone.
    return { ok: true, data: { status: 'PENDING' } };
  },

  /**
   * Step 3 — issue a refund. Both clinic admins and the auto-cancel
   * flow call this. Returns the amount actually refunded.
   *
   * Refund eligibility:
   *   • caller is CLINIC of this appointment, OR
   *   • caller is the PATIENT and cancellation is >24h before the cita.
   */
  async refund(
    appointmentId: string,
    user:          AuthUser,
  ): Promise<ServiceResult<{ refunded: boolean; reason: string }>> {
    const { prisma } = await import('@medicget/shared/prisma');
    const appt = await prisma.appointment.findUnique({
      where:   { id: appointmentId },
      include: { patient: true, payment: true, clinic: true },
    });
    if (!appt)                                  return { ok: false, code: 'NOT_FOUND',  message: 'Cita no encontrada.' };
    if (!appt.payment || appt.payment.status !== 'PAID') {
      return { ok: true, data: { refunded: false, reason: 'No había pago aprobado.' } };
    }

    // Authorisation
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
            refunded: false,
            reason: `Las cancelaciones con menos de ${REFUND_HOURS_THRESHOLD}h de anticipación no son reembolsables.`,
          },
        };
      }
    } else {
      return { ok: false, code: 'FORBIDDEN', message: 'No tenés permiso para reembolsar.' };
    }

    if (!appt.payment.payphonePaymentId) {
      return { ok: false, code: 'BAD_REQUEST', message: 'Pago sin id de PayPhone — reembolso manual.' };
    }

    const cancel = await payphone.cancelSale(appt.payment.payphonePaymentId);
    if (!cancel.ok) {
      return { ok: false, code: 'BAD_GATEWAY', message: `PayPhone rechazó el reembolso: ${cancel.error}` };
    }

    await prisma.payment.update({
      where: { appointmentId: appt.id },
      data:  { status: 'REFUNDED', refundedAt: new Date() },
    });

    return { ok: true, data: { refunded: true, reason: 'Reembolsado al medio de pago original.' } };
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
    const expired = await prisma.payment.findMany({
      where: {
        status:    'PENDING',
        expiresAt: { lt: now },
      },
      select: { id: true, appointmentId: true },
      take:   100,
    });

    if (expired.length === 0) return 0;

    for (const p of expired) {
      try {
        // Flip Appointment + Payment + Slot in a transaction.
        await prisma.$transaction([
          prisma.appointment.update({
            where: { id: p.appointmentId },
            data:  { status: 'CANCELLED', cancelReason: 'Pago no completado a tiempo.' },
          }),
          prisma.payment.update({
            where: { id: p.id },
            data:  { status: 'FAILED' },
          }),
          prisma.appointmentSlot.updateMany({
            where: { appointmentId: p.appointmentId },
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

async function notifyPaymentApproved(appointmentId: string) {
  try {
    const { prisma } = await import('@medicget/shared/prisma');
    const a = await prisma.appointment.findUnique({
      where:   { id: appointmentId },
      include: {
        patient: { include: { user: { include: { profile: true } } } },
        doctor:  { include: { user: { include: { profile: true } } } },
        payment: true,
      },
    });
    if (!a || !a.patient.user.email) return;
    const patientName = a.patient.user.profile?.firstName ?? 'paciente';
    const docName     = `${a.doctor.user.profile?.firstName ?? ''} ${a.doctor.user.profile?.lastName ?? ''}`.trim();
    const dateStr     = new Date(a.date).toLocaleDateString('es-ES', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    });

    const html = `
      <!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;margin:0;padding:24px">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0">
          <h1 style="font-size:22px;color:#0f172a;margin:0 0 8px">¡Pago confirmado, ${patientName}!</h1>
          <p style="font-size:15px;color:#475569;margin:0 0 24px">
            Tu cita con <strong>Dr. ${docName}</strong> queda confirmada para el
            <strong style="text-transform:capitalize">${dateStr}</strong> a las
            <strong>${a.time}</strong>.
          </p>
          <div style="background:#dcfce7;border-radius:12px;padding:16px;margin:0 0 16px">
            <p style="margin:0;font-size:13px;color:#166534;font-weight:600">
              ✓ Importe pagado: $${a.price.toFixed(2)}
            </p>
            ${a.payment?.notes ? `<p style="margin:6px 0 0;font-size:12px;color:#475569">${a.payment.notes}</p>` : ''}
          </div>
          <p style="font-size:13px;color:#64748b;margin:24px 0 0">
            Si necesitás cancelar, hacelo con al menos 24h de antelación para que la devolución sea automática.
          </p>
        </div>
      </body></html>`;

    await sendEmail({
      to:      a.patient.user.email,
      subject: `Pago confirmado · Dr. ${docName}`,
      html,
      text: `Pago confirmado por $${a.price.toFixed(2)}. Cita con Dr. ${docName} el ${dateStr} a las ${a.time}.`,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[notifyPaymentApproved] failed:', err);
  }
}
