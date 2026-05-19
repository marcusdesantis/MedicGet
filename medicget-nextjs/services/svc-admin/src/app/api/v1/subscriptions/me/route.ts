import { NextRequest } from 'next/server';
import { withAuth } from '@medicget/shared/auth';
import { apiOk } from '@medicget/shared/response';
import { prisma } from '@medicget/shared/prisma';

export const dynamic = 'force-dynamic';

/**
 * Returns the current user's most recent subscription (with the plan
 * details inlined), plus a `freePlan` field that the frontend uses to
 * paint a fallback when the user has never subscribed.
 *
 * The Doctor/Clinic dashboards use this to show a "Tu plan: X · expira
 * el Y" header and gate features.
 *
 * IMPORTANTE: si el usuario tiene una `ACTIVE` Y también una
 * `PENDING_PAYMENT` (porque inició un upgrade pero todavía no lo
 * confirmó), DEBEMOS devolver la ACTIVE. Sino, la UI mostraría el plan
 * "nuevo" como si ya estuviese activo, lo cual es engañoso para el
 * usuario y para el admin (parecería que el plan se cambió sin pagar).
 *
 * Estrategia:
 *   1. Primero buscamos una ACTIVE — esa siempre gana.
 *   2. Si no hay ACTIVE, devolvemos la PENDING_PAYMENT más reciente
 *      (para que el frontend pueda mostrar el flow de "tu pago está
 *      pendiente, completalo" en su lugar).
 */
export const GET = withAuth(async (_req: NextRequest, { user }) => {
  // 1) Busca primero la suscripción ACTIVE — esta gana siempre.
  let subscription = await prisma.subscription.findFirst({
    where:   { userId: user.id, status: 'ACTIVE' },
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
  });

  // 2) Si no hay ACTIVE, devolvemos la PENDING_PAYMENT más reciente como
  //    fallback. Eso permite que el frontend ofrezca "completá tu pago".
  if (!subscription) {
    subscription = await prisma.subscription.findFirst({
      where:   { userId: user.id, status: 'PENDING_PAYMENT' },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Always return the FREE plan for the user's audience as a fallback
  // visual (cuando el usuario nunca se suscribió a nada).
  const audience = user.role === 'CLINIC' ? 'CLINIC' : 'DOCTOR';
  const freePlan = await prisma.plan.findUnique({
    where: { audience_code: { audience, code: 'FREE' } },
  });

  return apiOk({
    subscription,
    freePlan,
  });
});
