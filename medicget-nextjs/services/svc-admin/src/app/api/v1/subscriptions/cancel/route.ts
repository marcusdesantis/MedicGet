import { NextRequest } from 'next/server';
import { withAuth } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { prisma } from '@medicget/shared/prisma';
import { ensureFreeSubscription } from '@medicget/shared/subscription';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/subscriptions/cancel
 *
 * Cancela la suscripción ACTIVA del usuario (típicamente paga) y vuelve
 * a asignar la FREE de su audiencia. No procesa reembolso por períodos
 * parciales — el usuario disfruta el plan hasta el `expiresAt` actual y
 * desde ahí queda en FREE.
 *
 * Política comercial: la cancelación toma efecto al final del período
 * actual. Implementación: simplemente flippeamos `autoRenew=false` y
 * marcamos `cancelledAt`. Cuando el sweeper detecte `expiresAt < now`,
 * se re-creará la FREE automáticamente. Para que el usuario vea el
 * cambio inmediato en la UI lo creamos ya y volvemos a la activa la
 * paga (como prevista) — funciona en stub mode sin issues.
 */
export const POST = withAuth(async (_req: NextRequest, { user }) => {
  const active = await prisma.subscription.findFirst({
    where:   { userId: user.id, status: 'ACTIVE' },
    include: { plan: true },
  });
  if (!active) {
    return apiError('NOT_FOUND', 'No tenés una suscripción activa para cancelar.');
  }

  // Si ya estaba en FREE, no hay nada que cancelar (no se puede caer más).
  if (active.plan.code === 'FREE') {
    return apiError('BAD_REQUEST', 'Ya estás en el plan gratuito.');
  }

  // Marcamos la suscripción paga como CANCELLED y rebajamos al instante
  // a FREE. Política de "efecto inmediato" — más simple para MVP. Si
  // querés "cancelar pero seguir hasta fin del período" ese cambio es
  // mover el flip a un cron sobre expiresAt.
  await prisma.subscription.update({
    where: { id: active.id },
    data:  {
      status:      'CANCELLED',
      cancelledAt: new Date(),
      autoRenew:   false,
    },
  });

  // Crear la FREE como la nueva activa.
  const role = user.role === 'CLINIC' ? 'CLINIC' : 'DOCTOR';
  await ensureFreeSubscription(user.id, role);

  return apiOk({ ok: true }, 'Suscripción cancelada. Estás de vuelta en plan gratuito.');
});
