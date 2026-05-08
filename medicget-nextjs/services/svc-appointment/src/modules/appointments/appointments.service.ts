import { appointmentsRepository, type AppointmentFilters } from './appointments.repository';
import type { PaginationParams } from '@medicget/shared/paginate';
import { paginate } from '@medicget/shared/paginate';
import type { AuthUser } from '@medicget/shared/auth';
import { generateMeetingUrl } from '@medicget/shared/meeting';
import { sendEmail }          from '@medicget/shared/email';
import { getAllowedModalities } from '@medicget/shared/subscription';
import { createNotification } from '@medicget/shared/notifications';
import { paymentService }     from '../payment/payment.service';
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  UpdatePaymentInput,
  CreateReviewInput,
} from './appointments.schemas';

type ServiceResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

export const appointmentsService = {
  async list(
    user: AuthUser,
    rawFilters: Record<string, string>,
    pagination: PaginationParams,
  ): Promise<ServiceResult<ReturnType<typeof paginate>>> {
    // Poor-man's cron: every list() call sweeps expired payments + dispara
    // recordatorios 24h. Bounded a 100 rows por call. Si la app está
    // viva (alguien navega), corren cada pocos segundos. Si nadie usa
    // la app por horas, los recordatorios se atrasan hasta que alguien
    // entra — es trade-off aceptable para MVP. Para producción seria
    // ponemos un cron real con node-cron o un worker dedicado.
    void paymentService.sweepExpired().catch(() => {/* swallow */});
    void sweepReminders().catch(() => {/* swallow */});

    const filters: AppointmentFilters = {};

    // Role-scoped filtering
    if (user.role === 'PATIENT') {
      // Patients only see their own appointments — we need to resolve patient.id from user.id
      const { prisma } = await import('@medicget/shared/prisma');
      const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
      if (!patient) return { ok: false, code: 'NOT_FOUND', message: 'Patient profile not found' };
      filters.patientId = patient.id;
    } else if (user.role === 'DOCTOR') {
      const { prisma } = await import('@medicget/shared/prisma');
      const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
      if (!doctor) return { ok: false, code: 'NOT_FOUND', message: 'Doctor profile not found' };
      filters.doctorId = doctor.id;
    } else if (user.role === 'CLINIC') {
      const { prisma } = await import('@medicget/shared/prisma');
      const clinic = await prisma.clinic.findUnique({ where: { userId: user.id } });
      if (!clinic) return { ok: false, code: 'NOT_FOUND', message: 'Clinic profile not found' };
      filters.clinicId = clinic.id;
    }

    // Apply optional query filters (only if not overriding role scope)
    if (rawFilters['status']) filters.status = rawFilters['status'];
    if (rawFilters['dateFrom']) filters.dateFrom = rawFilters['dateFrom'];
    if (rawFilters['dateTo']) filters.dateTo = rawFilters['dateTo'];
    // CLINIC can additionally filter by doctor/patient
    if (user.role === 'CLINIC') {
      if (rawFilters['doctorId']) filters.doctorId = rawFilters['doctorId'];
      if (rawFilters['patientId']) filters.patientId = rawFilters['patientId'];
    }

    const { data, total } = await appointmentsRepository.findMany(filters, pagination);
    return { ok: true, data: paginate(data, total, pagination) };
  },

  async create(
    body: CreateAppointmentInput,
    user: AuthUser,
  ): Promise<ServiceResult<unknown>> {
    const { prisma } = await import('@medicget/shared/prisma');

    // Validate doctor exists
    const doctor = await prisma.doctor.findUnique({ where: { id: body.doctorId } });
    if (!doctor) return { ok: false, code: 'NOT_FOUND', message: 'Doctor not found' };

    // Validate patient exists
    const patient = await prisma.patient.findUnique({ where: { id: body.patientId } });
    if (!patient) return { ok: false, code: 'NOT_FOUND', message: 'Patient not found' };

    // Reject bookings for past slots. Independent from frontend filtering
    // — protects against curl/devtools bypass. We assume the date+time pair
    // is in the platform's primary timezone (Ecuador, UTC-5). When the
    // platform expands across countries we'll need to look up the doctor's
    // timezone instead of hardcoding the offset.
    const PRIMARY_TZ_OFFSET = '-05:00'; // Ecuador / UTC-5 (no DST)
    const slotInstant = new Date(`${body.date}T${body.time}:00${PRIMARY_TZ_OFFSET}`);
    if (slotInstant.getTime() <= Date.now()) {
      return {
        ok: false,
        code: 'BAD_REQUEST',
        message: 'Ese horario ya pasó. Elige uno futuro.',
      };
    }

    // Validate the requested modality is actually offered by this doctor
    // AND allowed by his current plan. Esto cubre el caso de:
    //   • un médico que tenía PRESENCIAL/CHAT en `doctor.modalities` y
    //     después fue downgradeado a FREE (su plan ya no las incluye)
    //   • un médico que cambió su plan recientemente — la suscripción es
    //     la fuente de verdad, las modalidades del Doctor son sólo
    //     "qué quería ofrecer".
    const requestedModality = body.modality ?? 'ONLINE';
    const stored   = (doctor as { modalities?: string[] }).modalities ?? ['ONLINE'];
    const allowedByPlan = await getAllowedModalities(doctor.userId);
    const effective = stored.filter((m) => allowedByPlan.includes(m as 'ONLINE' | 'PRESENCIAL' | 'CHAT'));
    if (!effective.includes(requestedModality)) {
      return {
        ok: false,
        code: 'BAD_REQUEST',
        message: effective.length === 0
          ? 'Este médico todavía no tiene ninguna modalidad disponible. Pedile que active al menos una desde su perfil.'
          : `Este médico no acepta la modalidad ${requestedModality.toLowerCase()}. Modalidades disponibles: ${effective.map((m) => m.toLowerCase()).join(', ')}.`,
      };
    }

    // Resolve clinic. Two paths:
    //   1. Patient explicitly chose a clinic → validate it exists.
    //   2. No clinic supplied → fall back to the doctor's default clinic
    //      (if any). If the doctor is independent, clinicId stays null —
    //      that's allowed since the migration `appointment_optional_clinic`.
    let resolvedClinicId: string | null = null;
    if (body.clinicId) {
      const clinic = await prisma.clinic.findUnique({ where: { id: body.clinicId } });
      if (!clinic) return { ok: false, code: 'NOT_FOUND', message: 'Clinic not found' };
      resolvedClinicId = clinic.id;
    } else if (doctor.clinicId) {
      resolvedClinicId = doctor.clinicId;
    }

    // Check for conflicting appointment
    const existing = await prisma.appointment.findFirst({
      where: {
        doctorId: body.doctorId,
        date: new Date(body.date),
        time: body.time,
        status: { notIn: ['CANCELLED'] },
      },
    });
    if (existing) return { ok: false, code: 'CONFLICT', message: 'That slot is already booked' };

    // Find slot if available
    const slot = await prisma.appointmentSlot.findFirst({
      where: {
        doctorId: body.doctorId,
        date: new Date(body.date),
        time: body.time,
        isBooked: false,
      },
    });

    const appointment = await appointmentsRepository.createWithSideEffects(
      {
        patientId: body.patientId,
        doctorId: body.doctorId,
        clinicId: resolvedClinicId,
        date: new Date(body.date),
        time: body.time,
        modality: requestedModality,
        price: body.price,
        notes: body.notes,
        status: 'PENDING',
        createdBy: user.id,
      },
      slot?.id,
    );

    // ─── Side effects: meeting link + email ────────────────────────────
    // Only ONLINE appointments need a video room. PRESENCIAL is in-person
    // and CHAT happens in-app, so no Jitsi URL is generated for those.
    let meetingUrl: string | null = null;
    if (requestedModality === 'ONLINE') {
      meetingUrl = await generateMeetingUrl(appointment.id);
      await prisma.appointment.update({
        where: { id: appointment.id },
        data:  { meetingUrl },
      });
    }

    // Notify the patient by email. Best-effort — we don't block the API
    // response on a slow SMTP server, but we do log failures.
    void notifyAppointmentCreated(appointment.id, meetingUrl);

    return {
      ok: true,
      data: { ...appointment, meetingUrl },
    };
  },

  async getById(id: string, user: AuthUser): Promise<ServiceResult<unknown>> {
    const appointment = await appointmentsRepository.findById(id);
    if (!appointment) return { ok: false, code: 'NOT_FOUND', message: 'Appointment not found' };

    // Ownership check
    if (user.role !== 'CLINIC') {
      const { prisma } = await import('@medicget/shared/prisma');
      if (user.role === 'PATIENT') {
        const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
        if (!patient || appointment.patientId !== patient.id) {
          return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
        }
      } else if (user.role === 'DOCTOR') {
        const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
        if (!doctor || appointment.doctorId !== doctor.id) {
          return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
        }
      }
    } else {
      // CLINIC can only see appointments in their clinic
      const { prisma } = await import('@medicget/shared/prisma');
      const clinic = await prisma.clinic.findUnique({ where: { userId: user.id } });
      if (!clinic || appointment.clinicId !== clinic.id) {
        return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
      }
    }

    return { ok: true, data: appointment };
  },

  async update(
    id: string,
    body: UpdateAppointmentInput,
    user: AuthUser,
  ): Promise<ServiceResult<unknown>> {
    const appointment = await appointmentsRepository.findById(id);
    if (!appointment) return { ok: false, code: 'NOT_FOUND', message: 'Appointment not found' };

    // Ownership / role check
    if (user.role === 'PATIENT') {
      const { prisma } = await import('@medicget/shared/prisma');
      const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
      if (!patient || appointment.patientId !== patient.id) {
        return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
      }
      // Patients can only cancel their own appointment
      if (body.status && body.status !== 'CANCELLED') {
        return { ok: false, code: 'FORBIDDEN', message: 'Patients can only cancel appointments' };
      }
    } else if (user.role === 'DOCTOR') {
      const { prisma } = await import('@medicget/shared/prisma');
      const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
      if (!doctor || appointment.doctorId !== doctor.id) {
        return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
      }
    } else if (user.role === 'CLINIC') {
      const { prisma } = await import('@medicget/shared/prisma');
      const clinic = await prisma.clinic.findUnique({ where: { userId: user.id } });
      if (!clinic || appointment.clinicId !== clinic.id) {
        return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
      }
    }

    // If cancelling, unbook the slot AND attempt automatic refund. The
    // refund call is no-op-safe — it returns refunded:false with a reason
    // when the cita is <24h away (PATIENT path) or there's no PAID
    // payment to refund. We don't surface the refund result to the
    // update response because the existing UI doesn't expect it; the
    // patient's appointments list will pick up the new payment.status on
    // the next refetch.
    if (body.status === 'CANCELLED') {
      await appointmentsRepository.unbookSlot(id);
      void paymentService.refund(id, user).catch(() => {/* logged in service */});
      // Notificar a la otra parte de la cancelación.
      void notifyCancellation(id, user.id).catch(() => {/* swallow */});
    }

    const updated = await appointmentsRepository.update(id, {
      ...body,
      updatedBy: user.id,
    });

    return { ok: true, data: updated };
  },

  async cancel(id: string, user: AuthUser): Promise<ServiceResult<unknown>> {
    if (user.role !== 'CLINIC') {
      return { ok: false, code: 'FORBIDDEN', message: 'Only CLINIC can delete appointments' };
    }

    const appointment = await appointmentsRepository.findById(id);
    if (!appointment) return { ok: false, code: 'NOT_FOUND', message: 'Appointment not found' };

    const { prisma } = await import('@medicget/shared/prisma');
    const clinic = await prisma.clinic.findUnique({ where: { userId: user.id } });
    if (!clinic || appointment.clinicId !== clinic.id) {
      return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
    }

    await appointmentsRepository.unbookSlot(id);
    // Clinic-initiated cancel always refunds (no 24h rule for the clinic).
    void paymentService.refund(id, user).catch(() => {/* logged in service */});
    const deleted = await appointmentsRepository.softDelete(id, user.id);
    return { ok: true, data: deleted };
  },

  async getPayment(id: string, user: AuthUser): Promise<ServiceResult<unknown>> {
    const appointment = await appointmentsRepository.findById(id);
    if (!appointment) return { ok: false, code: 'NOT_FOUND', message: 'Appointment not found' };

    // Ownership check — any role that owns the appointment can see payment
    if (user.role === 'PATIENT') {
      const { prisma } = await import('@medicget/shared/prisma');
      const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
      if (!patient || appointment.patientId !== patient.id) {
        return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
      }
    } else if (user.role === 'DOCTOR') {
      const { prisma } = await import('@medicget/shared/prisma');
      const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
      if (!doctor || appointment.doctorId !== doctor.id) {
        return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
      }
    } else if (user.role === 'CLINIC') {
      const { prisma } = await import('@medicget/shared/prisma');
      const clinic = await prisma.clinic.findUnique({ where: { userId: user.id } });
      if (!clinic || appointment.clinicId !== clinic.id) {
        return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
      }
    }

    const payment = await appointmentsRepository.getPayment(id);
    if (!payment) return { ok: false, code: 'NOT_FOUND', message: 'Payment not found' };
    return { ok: true, data: payment };
  },

  async updatePayment(
    id: string,
    body: UpdatePaymentInput,
    user: AuthUser,
  ): Promise<ServiceResult<unknown>> {
    if (user.role !== 'CLINIC') {
      return { ok: false, code: 'FORBIDDEN', message: 'Only CLINIC can update payments' };
    }

    const appointment = await appointmentsRepository.findById(id);
    if (!appointment) return { ok: false, code: 'NOT_FOUND', message: 'Appointment not found' };

    const { prisma } = await import('@medicget/shared/prisma');
    const clinic = await prisma.clinic.findUnique({ where: { userId: user.id } });
    if (!clinic || appointment.clinicId !== clinic.id) {
      return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
    }

    const updateData: Record<string, unknown> = { ...body };

    // Set timestamps based on status transitions
    if (body.status === 'PAID') {
      updateData['paidAt'] = new Date();
    } else if (body.status === 'REFUNDED') {
      updateData['refundedAt'] = new Date();
    }

    const payment = await appointmentsRepository.updatePayment(id, updateData);

    // Send PAYMENT_RECEIVED notification to patient if paid
    if (body.status === 'PAID') {
      const patient = await prisma.patient.findUnique({
        where: { id: appointment.patientId },
        select: { userId: true },
      });
      if (patient) {
        await prisma.notification.create({
          data: {
            userId: patient.userId,
            type: 'PAYMENT_RECEIVED',
            title: 'Payment Confirmed',
            message: `Your payment of $${appointment.price} has been confirmed.`,
          },
        });
      }
    }

    return { ok: true, data: payment };
  },

  async createReview(
    id: string,
    body: CreateReviewInput,
    user: AuthUser,
  ): Promise<ServiceResult<unknown>> {
    if (user.role !== 'PATIENT') {
      return { ok: false, code: 'FORBIDDEN', message: 'Only PATIENT can create reviews' };
    }

    const appointment = await appointmentsRepository.findById(id);
    if (!appointment) return { ok: false, code: 'NOT_FOUND', message: 'Appointment not found' };

    // Must own the appointment
    const { prisma } = await import('@medicget/shared/prisma');
    const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
    if (!patient || appointment.patientId !== patient.id) {
      return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
    }

    // Appointment must be COMPLETED
    if (appointment.status !== 'COMPLETED') {
      return { ok: false, code: 'BAD_REQUEST', message: 'Can only review completed appointments' };
    }

    // No duplicate review
    if (appointment.review) {
      return { ok: false, code: 'CONFLICT', message: 'Review already exists for this appointment' };
    }

    const review = await appointmentsRepository.createReview({
      appointmentId: id,
      patientId: patient.id,
      doctorId: appointment.doctorId,
      rating: body.rating,
      comment: body.comment,
      isPublic: body.isPublic ?? true,
    });

    return { ok: true, data: review };
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
 *  Side-effect helpers
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Sends the patient a confirmation email with the appointment summary and
 * (when modality is ONLINE) the videollamada link. Called fire-and-forget
 * after appointment creation so a slow SMTP server doesn't block the API
 * response.
 *
 * Failures are logged but never thrown — the appointment still exists in
 * the DB and the patient sees their booking in the UI; we just couldn't
 * email them. They can always grab the link from the appointment detail
 * drawer in the calendar / appointments page.
 */
async function notifyAppointmentCreated(appointmentId: string, meetingUrl: string | null) {
  try {
    const { prisma } = await import('@medicget/shared/prisma');
    const appt = await prisma.appointment.findUnique({
      where:   { id: appointmentId },
      include: {
        patient: { include: { user: { include: { profile: true } } } },
        doctor:  { include: { user: { include: { profile: true } } } },
        clinic:  true,
      },
    });
    if (!appt) return;

    const patientEmail = appt.patient?.user?.email;
    if (!patientEmail) return;

    const patientName  = appt.patient?.user?.profile?.firstName ?? 'paciente';
    const doctorName   = `${appt.doctor?.user?.profile?.firstName ?? ''} ${appt.doctor?.user?.profile?.lastName ?? ''}`.trim();
    const dateStr      = new Date(appt.date).toLocaleDateString('es-ES', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    });

    const modalityCopy =
      appt.modality === 'ONLINE'     ? 'Videollamada (online)' :
      appt.modality === 'PRESENCIAL' ? `Presencial${appt.clinic ? ` en ${appt.clinic.name}` : ''}` :
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
      <!doctype html>
      <html><body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;margin:0;padding:24px">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0">
          <h1 style="font-size:22px;color:#0f172a;margin:0 0 8px">¡Hola ${patientName}!</h1>
          <p style="font-size:15px;color:#475569;margin:0 0 24px">
            Tu cita con <strong>Dr. ${doctorName}</strong> fue reservada con éxito. Acá los detalles:
          </p>

          <table style="width:100%;border-collapse:collapse;margin:0 0 16px">
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Fecha</td>
                <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right;text-transform:capitalize">${dateStr}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Hora</td>
                <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">${appt.time}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Modalidad</td>
                <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">${modalityCopy}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Especialidad</td>
                <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">${appt.doctor?.specialty ?? '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Precio</td>
                <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:700;text-align:right">$${appt.price.toFixed(2)}</td></tr>
          </table>

          ${meetingBlock}

          <p style="font-size:13px;color:#64748b;margin:24px 0 0;line-height:1.5">
            Recordá que la cita queda <strong>pendiente de pago</strong>. Una vez confirmado el pago,
            recibirás un correo final con la confirmación.
          </p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>
          <p style="font-size:11px;color:#94a3b8;margin:0">
            MedicGet · Este es un correo automático, por favor no respondas.
          </p>
        </div>
      </body></html>
    `;

    const textParts = [
      `Hola ${patientName},`,
      ``,
      `Tu cita con Dr. ${doctorName} (${appt.doctor?.specialty ?? '—'}) fue reservada.`,
      ``,
      `Fecha: ${dateStr}`,
      `Hora: ${appt.time}`,
      `Modalidad: ${modalityCopy}`,
      `Precio: $${appt.price.toFixed(2)}`,
      meetingUrl ? `\nEnlace de videollamada: ${meetingUrl}` : '',
      ``,
      `La cita está pendiente de pago. Recibirás otro correo cuando se confirme.`,
      ``,
      `— MedicGet`,
    ];

    await sendEmail({
      to:      patientEmail,
      subject: `Cita reservada con Dr. ${doctorName} · ${dateStr.split(',')[0]}`,
      html,
      text: textParts.join('\n'),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[notifyAppointmentCreated] failed:', err);
  }
}

/**
 * Sweeper de recordatorios. Busca citas que:
 *   • Están en las próximas 22-26 horas (ventana de 4h centrada en 24h)
 *   • Tienen status PENDING / UPCOMING / ONGOING
 *   • Todavía no recibieron una notificación de tipo APPOINTMENT_REMINDER
 *
 * Para cada una, crea una notificación in-app + dispara push + manda
 * email al paciente y al médico.
 *
 * Cómo evita duplicados: antes de mandar, busca si existe una
 * Notification de tipo APPOINTMENT_REMINDER con metadata.appointmentId
 * matcheando. Si sí, skip. Postgres maneja el read concurrente sin
 * problema, y dos requests racing sobre la misma cita en el mismo
 * segundo es muy improbable (la ventana es de 4h).
 */
async function sweepReminders(): Promise<number> {
  const { prisma } = await import('@medicget/shared/prisma');
  const now = new Date();
  const winStart = new Date(now.getTime() + 22 * 60 * 60 * 1000);
  const winEnd   = new Date(now.getTime() + 26 * 60 * 60 * 1000);

  // Citas con DATE en los próximos 2 días (filtro grueso a nivel DB)
  const candidates = await prisma.appointment.findMany({
    where: {
      status: { in: ['PENDING', 'UPCOMING', 'ONGOING'] },
      date:   {
        gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      },
    },
    include: {
      patient: { include: { user: { include: { profile: true } } } },
      doctor:  { include: { user: { include: { profile: true } } } },
      clinic:  true,
    },
    take: 200,
  });

  let sent = 0;
  for (const a of candidates) {
    // Construir el datetime real (date + "HH:MM" en UTC-5 Ecuador)
    const dateOnly = new Date(a.date).toISOString().slice(0, 10);
    const apptInstant = new Date(`${dateOnly}T${a.time}:00-05:00`);
    if (apptInstant < winStart || apptInstant > winEnd) continue;

    // ¿Ya hay notificación de recordatorio para esta cita?
    const existing = await prisma.notification.findFirst({
      where: {
        type: 'APPOINTMENT_REMINDER',
        metadata: { path: ['appointmentId'], equals: a.id },
      },
    });
    if (existing) continue;

    const dateStr = apptInstant.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' });
    const docName = `Dr. ${a.doctor.user.profile?.firstName ?? ''} ${a.doctor.user.profile?.lastName ?? ''}`.trim();
    const patientName = a.patient.user.profile?.firstName ?? 'paciente';

    // Notificación al paciente
    await createNotification({
      userId:  a.patient.userId,
      type:    'APPOINTMENT_REMINDER',
      title:   'Recordatorio de cita',
      message: `Tu cita con ${docName} es mañana ${dateStr} a las ${a.time}.`,
      metadata: { appointmentId: a.id },
      pushUrl: `/patient/appointments/${a.id}`,
    });
    // Notificación al médico
    await createNotification({
      userId:  a.doctor.userId,
      type:    'APPOINTMENT_REMINDER',
      title:   'Cita mañana',
      message: `Tenés cita con ${patientName} mañana ${dateStr} a las ${a.time}.`,
      metadata: { appointmentId: a.id },
      pushUrl: `/doctor/appointments/${a.id}`,
    });

    // Email al paciente — el médico recibe sólo la in-app/push
    if (a.patient.user.email) {
      const modalityCopy =
        a.modality === 'ONLINE'     ? 'Videollamada' :
        a.modality === 'PRESENCIAL' ? 'Presencial' :
                                       'Chat en vivo';
      const meetingBlock = a.meetingUrl
        ? `<p style="margin:16px 0"><a href="${a.meetingUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Unirme a la videollamada</a></p>`
        : '';
      void sendEmail({
        to:      a.patient.user.email,
        subject: `Recordatorio: tu cita mañana con ${docName}`,
        html: `
          <!doctype html><html><body style="font-family:system-ui,sans-serif;background:#f8fafc;padding:24px">
            <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0">
              <h1 style="font-size:20px;color:#0f172a;margin:0 0 8px">Hola ${patientName} 👋</h1>
              <p style="font-size:15px;color:#475569;margin:0 0 16px">
                Te recordamos que mañana tenés una cita con <strong>${docName}</strong>.
              </p>
              <div style="background:#dbeafe;border-radius:12px;padding:16px;margin:16px 0">
                <p style="margin:0;font-size:14px;color:#0f172a"><strong>📅</strong> ${dateStr}</p>
                <p style="margin:4px 0;font-size:14px;color:#0f172a"><strong>🕐</strong> ${a.time}</p>
                <p style="margin:0;font-size:14px;color:#0f172a"><strong>📍</strong> ${modalityCopy}${a.clinic ? ` · ${a.clinic.name}` : ''}</p>
              </div>
              ${meetingBlock}
              <p style="font-size:12px;color:#64748b;margin:24px 0 0">
                Si necesitás cancelar, hacelo lo antes posible para que otro paciente pueda aprovechar el horario.
              </p>
            </div>
          </body></html>`,
        text: `Recordatorio: tu cita con ${docName} es mañana ${dateStr} a las ${a.time} (${modalityCopy}).${a.meetingUrl ? `\n\nLink: ${a.meetingUrl}` : ''}`,
      }).catch(() => {/* swallow */});
    }

    sent++;
  }
  return sent;
}

/**
 * Crea una notificación in-app para la "otra parte" cuando una cita se
 * cancela. Si quien cancela es el paciente → notifica al médico, y
 * viceversa. Best-effort.
 */
async function notifyCancellation(appointmentId: string, cancellerUserId: string): Promise<void> {
  const { prisma } = await import('@medicget/shared/prisma');
  const a = await prisma.appointment.findUnique({
    where:   { id: appointmentId },
    include: {
      patient: { include: { user: { include: { profile: true } } } },
      doctor:  { include: { user: { include: { profile: true } } } },
    },
  });
  if (!a) return;

  const patientUserId = a.patient.userId;
  const doctorUserId  = a.doctor.userId;
  const cancelledByPatient = cancellerUserId === patientUserId;
  const targetUserId       = cancelledByPatient ? doctorUserId : patientUserId;

  const dateStr = new Date(a.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  const otherName = cancelledByPatient
    ? (a.patient.user.profile?.firstName ?? 'El paciente')
    : `Dr. ${a.doctor.user.profile?.firstName ?? ''}`.trim();

  await createNotification({
    userId:   targetUserId,
    type:     'APPOINTMENT_CANCELLED',
    title:    'Cita cancelada',
    message:  `${otherName} canceló la cita del ${dateStr} a las ${a.time}.`,
    metadata: { appointmentId },
    pushUrl:  cancelledByPatient ? `/doctor/appointments` : `/patient/appointments`,
  });
}
