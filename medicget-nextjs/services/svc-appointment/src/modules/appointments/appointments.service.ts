import { appointmentsRepository, type AppointmentFilters } from './appointments.repository';
import type { PaginationParams } from '@medicget/shared/paginate';
import { paginate } from '@medicget/shared/paginate';
import type { AuthUser } from '@medicget/shared/auth';
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
    void sweepStaleAppointments().catch(() => {/* swallow */});

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

    // El médico NO debe ver citas PENDING (impagas). Mientras el
    // paciente no completa el pago, la cita reserva el slot pero no
    // genera notificación ni email — el médico recibe la cita (UPCOMING
    // + notificación) recién cuando `paymentService.confirm` aprueba
    // el cobro. Si el paciente no paga en 15 min, el sweeper auto-cancela.
    //
    // Sólo aplicamos el filtro cuando NO pidió explícitamente un status
    // — si necesita ver pendientes (auditoría) puede pasar `?status=PENDING`.
    if (user.role === 'DOCTOR' && !rawFilters['status']) {
      filters.statusNotIn = ['PENDING'];
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

    // ─── NO side effects hasta que el pago esté confirmado ────────────
    // El meetingUrl (Jitsi) y los emails de confirmación se generan en
    // `paymentService.confirm` cuando PayPhone aprueba el pago. Antes
    // de eso la cita existe en estado PENDING reservando el slot, pero
    // el paciente todavía no recibió email ni link de videollamada —
    // así evitamos mandar links a citas que después se auto-cancelan
    // por falta de pago.

    return {
      ok: true,
      data: { ...appointment, meetingUrl: null },
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

    // ─── Doble validación de finalización ───────────────────────────────
    // Cuando el MÉDICO intenta marcar `status: COMPLETED`, NO cerramos la
    // cita directamente — el flujo correcto es:
    //   1. Setear `doctorCompletedAt` (médico marcó atendida).
    //   2. Notificar al paciente para que confirme.
    //   3. La cita queda en ONGOING hasta que el paciente confirme.
    //   4. Cuando el paciente confirma, `patientConfirmedAt` se setea y
    //      ahí sí pasa a COMPLETED (en `confirmCompletion`).
    //   5. Si 24h después no confirmó, el sweeper la cierra.
    //
    // Si el CLINIC marca COMPLETED, asumimos que tiene autoridad y
    // cerramos directo (caso "admin de la clínica corrige a mano").
    // PATIENT no puede llegar acá por el role check de arriba.
    if (body.status === 'COMPLETED' && user.role === 'DOCTOR') {
      const updated = await appointmentsRepository.update(id, {
        // Forzamos status a ONGOING — pendiente de confirmación del paciente.
        status:            'ONGOING',
        doctorCompletedAt: new Date(),
        notes:             body.notes,
        updatedBy:         user.id,
      });
      void notifyDoctorMarkedCompleted(id).catch(() => {/* swallow */});
      return { ok: true, data: updated };
    }

    const updated = await appointmentsRepository.update(id, {
      ...body,
      updatedBy: user.id,
    });

    // Si la cita pasa a COMPLETED por otra vía (clinic admin, sweeper) y
    // todavía no había sido notificada la finalización al paciente, lo
    // hacemos ahora.
    if (body.status === 'COMPLETED') {
      void notifyAppointmentFinalized(id).catch(() => {/* swallow */});
    }

    return { ok: true, data: updated };
  },

  /**
   * Paciente confirma que la atención se realizó. Cierra la doble
   * validación: setea `patientConfirmedAt`, transiciona a COMPLETED y
   * dispara la notificación de finalización a ambas partes.
   *
   * Requiere que el médico haya marcado previamente con
   * `doctorCompletedAt` — si no, devolvemos 400 con mensaje claro.
   */
  async confirmCompletion(id: string, user: AuthUser): Promise<ServiceResult<unknown>> {
    if (user.role !== 'PATIENT') {
      return { ok: false, code: 'FORBIDDEN', message: 'Solo el paciente puede confirmar la atención.' };
    }

    const appointment = await appointmentsRepository.findById(id);
    if (!appointment) return { ok: false, code: 'NOT_FOUND', message: 'Appointment not found' };

    const { prisma } = await import('@medicget/shared/prisma');
    const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
    if (!patient || appointment.patientId !== patient.id) {
      return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
    }

    if (!(appointment as { doctorCompletedAt?: Date | null }).doctorCompletedAt) {
      return { ok: false, code: 'BAD_REQUEST', message: 'El médico todavía no marcó la cita como atendida.' };
    }
    if (appointment.status === 'COMPLETED') {
      return { ok: false, code: 'CONFLICT', message: 'La cita ya estaba finalizada.' };
    }

    const updated = await appointmentsRepository.update(id, {
      status:             'COMPLETED',
      patientConfirmedAt: new Date(),
      updatedBy:          user.id,
    });
    void notifyAppointmentFinalized(id).catch(() => {/* swallow */});
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
// `notifyAppointmentCreated` se eliminó. Antes se disparaba en
// `appointmentsService.create` y mandaba un email tipo "Cita reservada
// · Pendiente de pago" al paciente. Como la cita ahora SOLO se notifica
// cuando el pago fue confirmado, esa función ya no aplica. La nueva
// función equivalente vive en `payment.service.ts` →
// `notifyAppointmentConfirmed`.

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
 * Notifica al PACIENTE que el médico marcó la cita como atendida y le
 * pide que confirme. Disparado al ejecutar la primera mitad de la doble
 * validación.
 */
async function notifyDoctorMarkedCompleted(appointmentId: string): Promise<void> {
  const { prisma } = await import('@medicget/shared/prisma');
  const a = await prisma.appointment.findUnique({
    where:   { id: appointmentId },
    include: {
      patient: { select: { userId: true, user: { select: { profile: { select: { firstName: true } } } } } },
      doctor:  { select: { user: { select: { profile: { select: { firstName: true, lastName: true } } } } } },
    },
  });
  if (!a) return;

  const docName = `Dr. ${a.doctor.user.profile?.firstName ?? ''} ${a.doctor.user.profile?.lastName ?? ''}`.trim();

  await createNotification({
    userId:   a.patient.userId,
    type:     'APPOINTMENT_COMPLETED_BY_DOCTOR',
    title:    'Tu médico finalizó la consulta',
    message:  `${docName} marcó la atención como realizada. Por favor, confirmá desde la app que se hizo correctamente.`,
    metadata: { appointmentId },
    pushUrl:  `/patient/appointments/${appointmentId}`,
  });
}

/**
 * Notifica a AMBAS partes que la cita quedó finalizada (doble validación
 * cerrada o cierre administrativo). Best-effort.
 */
async function notifyAppointmentFinalized(appointmentId: string): Promise<void> {
  const { prisma } = await import('@medicget/shared/prisma');
  const a = await prisma.appointment.findUnique({
    where:   { id: appointmentId },
    include: {
      patient: { select: { userId: true, user: { select: { profile: { select: { firstName: true } } } } } },
      doctor:  { select: { userId: true, user: { select: { profile: { select: { firstName: true, lastName: true } } } } } },
    },
  });
  if (!a) return;

  const patientFirst = a.patient.user.profile?.firstName ?? 'paciente';
  const docName = `Dr. ${a.doctor.user.profile?.firstName ?? ''} ${a.doctor.user.profile?.lastName ?? ''}`.trim();

  await Promise.all([
    createNotification({
      userId:   a.patient.userId,
      type:     'APPOINTMENT_FINALIZED',
      title:    'Cita finalizada',
      message:  `La consulta con ${docName} se completó. Si querés, dejale una reseña.`,
      metadata: { appointmentId },
      pushUrl:  `/patient/appointments/${appointmentId}`,
    }),
    createNotification({
      userId:   a.doctor.userId,
      type:     'APPOINTMENT_FINALIZED',
      title:    'Atención confirmada',
      message:  `${patientFirst} confirmó la atención. La cita quedó cerrada.`,
      metadata: { appointmentId },
      pushUrl:  `/doctor/appointments/${appointmentId}`,
    }),
  ]);
}

/**
 * Sweeper de citas vencidas. Cierra automáticamente las citas cuyo
 * `date + time` ya pasó hace suficiente tiempo y nadie tocó:
 *
 *   • PENDING con paso > 24 h         → NO_SHOW (paciente nunca pagó)
 *   • UPCOMING / ONGOING con paso > 4 h → COMPLETED (asumimos atendida)
 *
 * Esto resuelve el síntoma reportado de "citas atendidas que siguen
 * apareciendo como programadas" — antes nada movía esos registros y se
 * quedaban indefinidamente en la pestaña "Próximas" del paciente y del
 * médico.
 *
 * NOTA: cuando se implemente la doble validación (médico finaliza →
 * paciente confirma), el sweeper también auto-confirmará las que el
 * médico marcó como completadas y el paciente nunca confirmó después
 * de 24 h. Por ahora cubre el caso del MVP.
 *
 * Best-effort. Sin transacción global — cada cita se actualiza
 * individualmente para no bloquear si una falla.
 */
async function sweepStaleAppointments(): Promise<number> {
  const { prisma } = await import('@medicget/shared/prisma');
  const now = Date.now();
  const FOUR_HOURS_MS  = 4  * 60 * 60 * 1000;
  const TWENTYFOUR_MS  = 24 * 60 * 60 * 1000;

  // Filtro grueso a nivel DB: solo citas de los últimos 30 días con status
  // potencialmente "vivo". El bound evita escanear años de historial.
  const lookbackStart = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const candidates = await prisma.appointment.findMany({
    where: {
      status: { in: ['PENDING', 'UPCOMING', 'ONGOING'] },
      date:   { gte: lookbackStart, lte: new Date(now) },
    },
    select: {
      id: true, date: true, time: true, status: true,
      doctorCompletedAt: true,
    },
    take: 500,
  });

  let updated = 0;
  for (const a of candidates) {
    // Asumimos TZ del médico = Ecuador (UTC-5) — alineado con `create()`.
    // Cuando se implemente la TZ por país del médico, este offset se
    // resuelve via doctor.profile.country.
    const dateOnly    = new Date(a.date).toISOString().slice(0, 10);
    const apptInstant = new Date(`${dateOnly}T${a.time}:00-05:00`).getTime();
    const elapsed     = now - apptInstant;

    let nextStatus: 'NO_SHOW' | 'COMPLETED' | null = null;
    let autoConfirm = false;

    // Caso "doble validación expirada": el médico marcó atendida hace
    // >24h y el paciente nunca confirmó → la cerramos como COMPLETED de
    // oficio (asumimos buena fe; el paciente podía reportar disputa).
    const doctorMarkedAt = a.doctorCompletedAt ? new Date(a.doctorCompletedAt).getTime() : null;
    if (a.status === 'ONGOING' && doctorMarkedAt && now - doctorMarkedAt > TWENTYFOUR_MS) {
      nextStatus = 'COMPLETED';
      autoConfirm = true;
    } else if (a.status === 'PENDING' && elapsed > TWENTYFOUR_MS) {
      nextStatus = 'NO_SHOW';
    } else if ((a.status === 'UPCOMING' || a.status === 'ONGOING') && elapsed > FOUR_HOURS_MS) {
      nextStatus = 'COMPLETED';
    }
    if (!nextStatus) continue;

    try {
      await prisma.appointment.update({
        where: { id: a.id },
        data:  {
          status: nextStatus,
          ...(autoConfirm ? { patientConfirmedAt: new Date() } : {}),
        },
      });
      if (nextStatus === 'COMPLETED') {
        void notifyAppointmentFinalized(a.id).catch(() => {/* swallow */});
      }
      updated++;
    } catch {
      /* swallow — la próxima pasada lo reintenta */
    }
  }
  return updated;
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
