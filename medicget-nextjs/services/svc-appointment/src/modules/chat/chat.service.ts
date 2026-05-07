import type { AuthUser } from '@medicget/shared/auth';
import type { SendMessageInput } from './chat.schemas';

type ServiceResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

/**
 * Status set in which the chat is read-write. After the appointment is
 * COMPLETED / CANCELLED / NO_SHOW the conversation goes read-only — both
 * parties can still read it (so the doctor has a record of what was said
 * and the patient can re-read instructions) but new messages are blocked.
 */
const ACTIVE_STATUSES = new Set(['PENDING', 'UPCOMING', 'ONGOING']);

/**
 * Resolves the participant context for a given appointment + user.
 *
 * The chat is gated by THREE conditions:
 *   1. The appointment exists and modality is CHAT.
 *   2. The caller is one of the two participants (the patient or the
 *      assigned doctor) — clinic admins cannot read chat messages, that
 *      would breach doctor-patient confidentiality.
 *   3. For sending: the appointment is in an active status.
 */
async function resolveParticipant(
  appointmentId: string,
  user: AuthUser,
): Promise<
  | { ok: true; appointment: Awaited<ReturnType<typeof loadAppointment>>; isPatient: boolean; isDoctor: boolean }
  | { ok: false; code: string; message: string }
> {
  const appointment = await loadAppointment(appointmentId);
  if (!appointment) {
    return { ok: false, code: 'NOT_FOUND', message: 'Appointment not found' };
  }

  if (appointment.modality !== 'CHAT') {
    return {
      ok:      false,
      code:    'BAD_REQUEST',
      message: 'Esta cita no es de modalidad chat. El chat sólo se habilita para citas tipo CHAT.',
    };
  }

  const isPatient = user.role === 'PATIENT' && appointment.patient.userId === user.id;
  const isDoctor  = user.role === 'DOCTOR'  && appointment.doctor.userId  === user.id;
  if (!isPatient && !isDoctor) {
    return { ok: false, code: 'FORBIDDEN', message: 'Sólo los participantes de la cita pueden ver el chat.' };
  }

  return { ok: true, appointment, isPatient, isDoctor };
}

async function loadAppointment(appointmentId: string) {
  const { prisma } = await import('@medicget/shared/prisma');
  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { include: { user: { include: { profile: true } } } },
      doctor:  { include: { user: { include: { profile: true } } } },
    },
  });
}

export const chatService = {
  /**
   * Returns the chat thread for an appointment plus a "peer" descriptor so
   * the UI can paint the header without an extra round trip.
   *
   * `since` lets the client poll for new messages without re-fetching the
   * entire thread — pass the timestamp of the last seen message and you'll
   * get back only what's newer. The very first call should omit it.
   *
   * As a side effect, messages authored by the OTHER party that the
   * caller has not yet seen are flagged as read (`readAt` is set). That's
   * what powers the "Visto" / read-receipts indicator on the sender's
   * side.
   */
  async list(
    appointmentId: string,
    user: AuthUser,
    since?: string,
  ): Promise<ServiceResult<unknown>> {
    const ctx = await resolveParticipant(appointmentId, user);
    if (!ctx.ok) return ctx;

    const { prisma } = await import('@medicget/shared/prisma');

    const where = {
      appointmentId,
      deletedAt: null,
      ...(since ? { createdAt: { gt: new Date(since) } } : {}),
    };

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take:    500, // safety cap; chat threads >500 msgs need pagination later
    });

    // Mark the OTHER party's messages as read — only those that are still
    // unread. Use a separate updateMany so we don't pull in messages the
    // caller authored.
    await prisma.chatMessage.updateMany({
      where: {
        appointmentId,
        senderId: { not: user.id },
        readAt:   null,
      },
      data: { readAt: new Date() },
    });

    const peer =
      ctx.isPatient
        ? {
            // The patient sees the doctor as the peer
            userId:    ctx.appointment!.doctor.userId,
            firstName: ctx.appointment!.doctor.user.profile?.firstName ?? '',
            lastName:  ctx.appointment!.doctor.user.profile?.lastName  ?? '',
            avatarUrl: ctx.appointment!.doctor.user.profile?.avatarUrl ?? null,
            role:      'DOCTOR',
            specialty: ctx.appointment!.doctor.specialty,
          }
        : {
            userId:    ctx.appointment!.patient.userId,
            firstName: ctx.appointment!.patient.user.profile?.firstName ?? '',
            lastName:  ctx.appointment!.patient.user.profile?.lastName  ?? '',
            avatarUrl: ctx.appointment!.patient.user.profile?.avatarUrl ?? null,
            role:      'PATIENT',
            specialty: null,
          };

    return {
      ok:   true,
      data: {
        appointment: {
          id:       ctx.appointment!.id,
          date:     ctx.appointment!.date,
          time:     ctx.appointment!.time,
          status:   ctx.appointment!.status,
          modality: ctx.appointment!.modality,
        },
        peer,
        myUserId: user.id,
        canSend:  ACTIVE_STATUSES.has(ctx.appointment!.status),
        messages,
      },
    };
  },

  /**
   * Persists a new message in the appointment thread. Refuses to write
   * once the appointment is no longer active so a stale browser tab can't
   * keep posting after the consult is over.
   */
  async send(
    appointmentId: string,
    user:          AuthUser,
    body:          SendMessageInput,
  ): Promise<ServiceResult<unknown>> {
    const ctx = await resolveParticipant(appointmentId, user);
    if (!ctx.ok) return ctx;

    if (!ACTIVE_STATUSES.has(ctx.appointment!.status)) {
      return {
        ok:      false,
        code:    'BAD_REQUEST',
        message: 'La conversación está cerrada porque la cita ya finalizó.',
      };
    }

    const { prisma } = await import('@medicget/shared/prisma');

    const message = await prisma.chatMessage.create({
      data: {
        appointmentId,
        senderId:       user.id,
        content:        body.content,
        attachmentUrl:  body.attachmentUrl  ?? null,
        attachmentName: body.attachmentName ?? null,
        attachmentMime: body.attachmentMime ?? null,
      },
    });

    // Notify the other participant so they see a badge in their nav bar.
    // Best-effort — failure here does NOT break the send.
    try {
      const otherUserId =
        ctx.isPatient
          ? ctx.appointment!.doctor.userId
          : ctx.appointment!.patient.userId;
      const fromName =
        ctx.isPatient
          ? `${ctx.appointment!.patient.user.profile?.firstName ?? 'Paciente'}`
          : `Dr. ${ctx.appointment!.doctor.user.profile?.firstName ?? ''}`.trim();
      await prisma.notification.create({
        data: {
          userId:  otherUserId,
          type:    'SYSTEM',
          title:   'Nuevo mensaje',
          message: `${fromName}: ${body.content.slice(0, 80)}${body.content.length > 80 ? '…' : ''}`,
          metadata: { appointmentId, messageId: message.id },
        },
      });
    } catch {
      /* swallow — notification is best-effort */
    }

    return { ok: true, data: message };
  },

  /**
   * Soft-delete a message authored by the caller. Useful for the
   * Insta/FB-style "unsend" affordance.
   */
  async deleteMessage(
    appointmentId: string,
    messageId:     string,
    user:          AuthUser,
  ): Promise<ServiceResult<unknown>> {
    const ctx = await resolveParticipant(appointmentId, user);
    if (!ctx.ok) return ctx;

    const { prisma } = await import('@medicget/shared/prisma');
    const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!message || message.appointmentId !== appointmentId) {
      return { ok: false, code: 'NOT_FOUND', message: 'Message not found' };
    }
    if (message.senderId !== user.id) {
      return { ok: false, code: 'FORBIDDEN', message: 'Sólo podés eliminar tus propios mensajes.' };
    }

    const updated = await prisma.chatMessage.update({
      where: { id: messageId },
      data:  { deletedAt: new Date() },
    });
    return { ok: true, data: updated };
  },
};
