/**
 * Refunds service (superadmin).
 *
 * Cola operacional de reembolsos pendientes. Cuando un paciente o clínica
 * cancela una cita pagada con derecho a reembolso, svc-appointment crea
 * un `RefundRequest(PENDING)`. Este módulo expone la cara de admin:
 *
 *   • `list`    — listado paginado, filtrable por status, ordenado por
 *                 requestedAt desc (los más viejos primero piden atención).
 *   • `process` — admin confirma que ya hizo el reverso en PayPhone
 *                 Business → Payment pasa a REFUNDED + se notifica al
 *                 paciente "tu reembolso fue procesado".
 *   • `reject`  — admin descarta el pedido (ej: paciente ya recibió la
 *                 atención, error operacional). Payment vuelve a PAID y se
 *                 notifica al paciente con el motivo.
 *
 * El service NUNCA llama a PayPhone directamente — la API Cajita no expone
 * reverso programático. La acción real la hace el operador desde el panel
 * PayPhone Business; MedicGet solo mantiene el estado contable y la
 * comunicación con el cliente.
 */

import { prisma }              from '@medicget/shared/prisma';
import { createNotification }  from '@medicget/shared/notifications';
import { sendEmail }           from '@medicget/shared/email';

export interface ListInput {
  page:     number;
  pageSize: number;
  /// Default = PENDING. Pasar `'ALL'` para traer todos.
  status?:  'PENDING' | 'PROCESSED' | 'REJECTED' | 'ALL';
}

export interface ProcessInput {
  /// ID del reverso en PayPhone Business — para auditoría cruzada.
  externalReference?: string;
  /// Notas internas opcionales del admin.
  processorNotes?:    string;
}

export interface RejectInput {
  /// OBLIGATORIO — se envía al paciente como explicación del rechazo.
  processorNotes:     string;
}

export const refundsService = {
  async list({ page, pageSize, status = 'PENDING' }: ListInput) {
    const where = status === 'ALL' ? {} : { status };
    const [data, total] = await Promise.all([
      prisma.refundRequest.findMany({
        where,
        orderBy: { requestedAt: 'asc' }, // FIFO: los más viejos primero
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        include: {
          payment: {
            include: {
              appointment: {
                include: {
                  patient: { include: { user: { include: { profile: true } } } },
                  doctor:  { include: { user: { include: { profile: true } } } },
                },
              },
            },
          },
        },
      }),
      prisma.refundRequest.count({ where }),
    ]);
    return { data, total };
  },

  async getById(id: string) {
    return prisma.refundRequest.findUnique({
      where: { id },
      include: {
        payment: {
          include: {
            appointment: {
              include: {
                patient: { include: { user: { include: { profile: true } } } },
                doctor:  { include: { user: { include: { profile: true } } } },
                clinic:  true,
              },
            },
          },
        },
      },
    });
  },

  /**
   * Marca la solicitud como PROCESSED. Operación idempotente: si ya está
   * en PROCESSED se devuelve la misma sin alterar nada (evita doble notif
   * si el admin clickea dos veces).
   */
  async process(id: string, adminUserId: string, input: ProcessInput) {
    const existing = await prisma.refundRequest.findUnique({
      where:   { id },
      include: { payment: true },
    });
    if (!existing)                       throw new Error('RefundRequest not found');
    if (existing.status === 'PROCESSED') return existing;
    if (existing.status === 'REJECTED')  throw new Error('No se puede procesar: la solicitud fue rechazada antes.');

    const updated = await prisma.$transaction(async (tx) => {
      const refund = await tx.refundRequest.update({
        where: { id },
        data: {
          status:            'PROCESSED',
          processedAt:       new Date(),
          processedByUserId: adminUserId,
          externalReference: input.externalReference?.trim() || null,
          processorNotes:    input.processorNotes?.trim() || null,
        },
      });
      await tx.payment.update({
        where: { id: existing.paymentId },
        data:  { status: 'REFUNDED', refundedAt: new Date() },
      });
      return refund;
    });

    void notifyRefundProcessed(id).catch(() => {/* swallow */});
    return updated;
  },

  /**
   * Descarta la solicitud. Payment vuelve a PAID (la atención se considera
   * cobrada). El motivo se envía al paciente — por eso es obligatorio.
   * Idempotente como `process`.
   */
  async reject(id: string, adminUserId: string, input: RejectInput) {
    const reason = input.processorNotes.trim();
    if (!reason) throw new Error('El motivo de rechazo es obligatorio.');

    const existing = await prisma.refundRequest.findUnique({
      where:   { id },
      include: { payment: true },
    });
    if (!existing)                       throw new Error('RefundRequest not found');
    if (existing.status === 'REJECTED')  return existing;
    if (existing.status === 'PROCESSED') throw new Error('No se puede rechazar: la solicitud ya fue procesada.');

    const updated = await prisma.$transaction(async (tx) => {
      const refund = await tx.refundRequest.update({
        where: { id },
        data: {
          status:            'REJECTED',
          processedAt:       new Date(),
          processedByUserId: adminUserId,
          processorNotes:    reason,
        },
      });
      await tx.payment.update({
        where: { id: existing.paymentId },
        data:  { status: 'PAID' },
      });
      return refund;
    });

    void notifyRefundRejected(id, reason).catch(() => {/* swallow */});
    return updated;
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
 *  Side-effect helpers
 * ═══════════════════════════════════════════════════════════════════════════ */

async function notifyRefundProcessed(refundRequestId: string): Promise<void> {
  const refund = await prisma.refundRequest.findUnique({
    where: { id: refundRequestId },
    include: {
      payment: {
        include: {
          appointment: {
            include: {
              patient: { include: { user: { include: { profile: true } } } },
              doctor:  { include: { user: { include: { profile: true } } } },
            },
          },
        },
      },
    },
  });
  if (!refund || !refund.payment.appointment) return;
  const appt   = refund.payment.appointment;
  const patientFirst = appt.patient.user.profile?.firstName ?? 'paciente';
  const docName      = `${appt.doctor.user.profile?.firstName ?? ''} ${appt.doctor.user.profile?.lastName ?? ''}`.trim();
  const amount       = refund.payment.amount;
  const dateShort    = new Date(appt.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

  await createNotification({
    userId:   appt.patient.userId,
    type:     'REFUND_PROCESSED',
    title:    'Reembolso procesado',
    message:  `Devolvimos $${amount.toFixed(2)} de tu cita con Dr. ${docName} del ${dateShort}. Lo vas a ver en tu medio de pago en las próximas 24-48h.`,
    metadata: { appointmentId: appt.id, refundRequestId },
    pushUrl:  `/patient/appointments/${appt.id}`,
  }).catch(() => {/* swallow */});

  if (appt.patient.user.email) {
    await sendEmail({
      to:      appt.patient.user.email,
      subject: `Reembolso procesado · $${amount.toFixed(2)}`,
      html: `
        <!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;margin:0;padding:24px">
          <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0">
            <h1 style="font-size:22px;color:#0f172a;margin:0 0 8px">Tu reembolso fue procesado, ${patientFirst}</h1>
            <p style="font-size:15px;color:#475569;margin:0 0 16px;line-height:1.5">
              Devolvimos <strong>$${amount.toFixed(2)}</strong> al mismo medio con el que pagaste tu cita con Dr. ${docName} del ${dateShort}.
            </p>
            <p style="font-size:14px;color:#475569;margin:0 0 14px;line-height:1.6">
              Según tu banco emisor, el monto se verá reflejado entre <strong>24 y 48 horas hábiles</strong>.
            </p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>
            <p style="font-size:11px;color:#94a3b8;margin:0">MedicGet · Correo automático.</p>
          </div>
        </body></html>`,
      text: `Reembolso procesado por $${amount.toFixed(2)}. Lo verás reflejado en 24-48h hábiles.`,
    });
  }
}

async function notifyRefundRejected(refundRequestId: string, reason: string): Promise<void> {
  const refund = await prisma.refundRequest.findUnique({
    where: { id: refundRequestId },
    include: {
      payment: {
        include: {
          appointment: {
            include: {
              patient: { include: { user: { include: { profile: true } } } },
              doctor:  { include: { user: { include: { profile: true } } } },
            },
          },
        },
      },
    },
  });
  if (!refund || !refund.payment.appointment) return;
  const appt   = refund.payment.appointment;
  const patientFirst = appt.patient.user.profile?.firstName ?? 'paciente';
  const docName      = `${appt.doctor.user.profile?.firstName ?? ''} ${appt.doctor.user.profile?.lastName ?? ''}`.trim();
  const dateShort    = new Date(appt.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

  await createNotification({
    userId:   appt.patient.userId,
    type:     'REFUND_REJECTED',
    title:    'Reembolso no procedente',
    message:  `Tu solicitud de reembolso de la cita con Dr. ${docName} (${dateShort}) fue revisada y no procede. Motivo: ${reason}`,
    metadata: { appointmentId: appt.id, refundRequestId, reason },
    pushUrl:  `/patient/appointments/${appt.id}`,
  }).catch(() => {/* swallow */});

  if (appt.patient.user.email) {
    await sendEmail({
      to:      appt.patient.user.email,
      subject: `Sobre tu solicitud de reembolso`,
      html: `
        <!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;margin:0;padding:24px">
          <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0">
            <h1 style="font-size:22px;color:#0f172a;margin:0 0 8px">Hola ${patientFirst}</h1>
            <p style="font-size:15px;color:#475569;margin:0 0 16px;line-height:1.5">
              Revisamos tu solicitud de reembolso por la cita con Dr. ${docName} del ${dateShort} y no podemos procesarla.
            </p>
            <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:14px 18px;margin:18px 0;border-radius:8px">
              <p style="margin:0;font-size:14px;color:#78350f;line-height:1.5"><strong>Motivo:</strong> ${reason}</p>
            </div>
            <p style="font-size:13px;color:#64748b;margin:18px 0 0">
              Si querés discutir la decisión, escribinos a <a href="mailto:soportemedicget@abisoft.it" style="color:#2563eb">soportemedicget@abisoft.it</a>.
            </p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>
            <p style="font-size:11px;color:#94a3b8;margin:0">MedicGet · Correo automático.</p>
          </div>
        </body></html>`,
      text: `Tu reembolso para la cita del ${dateShort} no procede.\nMotivo: ${reason}\n\nDudas: soportemedicget@abisoft.it`,
    });
  }
}
