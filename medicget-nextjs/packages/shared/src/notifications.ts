/**
 * Helper unificado para crear notificaciones.
 *
 * Hace DOS cosas en una sola llamada:
 *   1. Inserta la fila en `Notification` (campanita + dropdown).
 *   2. Dispara un Web Push a todos los dispositivos del usuario.
 *
 * El push es best-effort y NO bloquea la inserción. Si el usuario no
 * habilitó push, simplemente no se envía nada y la notificación queda
 * sólo in-app.
 *
 * USO:
 *   await createNotification({
 *     userId:   patient.userId,
 *     type:     'PAYMENT_RECEIVED',
 *     title:    'Pago confirmado',
 *     message:  `Tu pago de $${amount} fue procesado.`,
 *     metadata: { appointmentId },
 *     pushUrl:  `/patient/appointments/${appointmentId}`,
 *   });
 */

import { prisma } from './prisma';
import { sendPushToUser } from './webpush';

type NotificationType =
  | 'APPOINTMENT_CONFIRMED'
  | 'APPOINTMENT_CANCELLED'
  | 'APPOINTMENT_REMINDER'
  | 'PAYMENT_RECEIVED'
  | 'REVIEW_RECEIVED'
  | 'SYSTEM';

export interface CreateNotificationInput {
  userId:    string;
  type:      NotificationType;
  title:     string;
  message:   string;
  metadata?: Record<string, unknown>;
  /** URL relativa para abrir al click del push. */
  pushUrl?:  string;
}

export async function createNotification(input: CreateNotificationInput) {
  const n = await prisma.notification.create({
    data: {
      userId:   input.userId,
      type:     input.type,
      title:    input.title,
      message:  input.message,
      metadata: input.metadata as object | undefined,
    },
  });

  // Push fire-and-forget — si no hay suscripciones o las VAPID no están
  // generadas, sendPushToUser sale silencioso.
  void sendPushToUser(input.userId, {
    title: input.title,
    body:  input.message,
    url:   input.pushUrl,
    tag:   input.type,
  }).catch(() => {/* swallow */});

  return n;
}
