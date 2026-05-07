/**
 * Helpers de suscripción reutilizables entre servicios.
 *
 * - `ensureFreeSubscription(userId, role)` crea una Subscription en el plan
 *   FREE correspondiente si el usuario no tiene ninguna activa. Idempotente.
 *
 * - `bootstrapPlanFeatures()` se asegura de que los planes seedeados tengan
 *   todos los módulos/limites correctos. Útil cuando agregamos un módulo
 *   nuevo después de que la migración inicial corrió.
 */

import { prisma } from './prisma';

const FAR_FUTURE_DAYS = 365 * 100; // 100 años — el FREE no expira en la práctica

export async function ensureFreeSubscription(
  userId: string,
  role:   'DOCTOR' | 'CLINIC',
): Promise<void> {
  const audience = role === 'CLINIC' ? 'CLINIC' : 'DOCTOR';

  // ¿Ya tiene una suscripción ACTIVA?
  const existing = await prisma.subscription.findFirst({
    where: { userId, status: 'ACTIVE' },
  });
  if (existing) return;

  // Buscar el plan FREE de su audiencia.
  const freePlan = await prisma.plan.findUnique({
    where: { audience_code: { audience, code: 'FREE' } },
  });
  if (!freePlan) {
    // El plan FREE no existe — la migración inicial todavía no corrió.
    // No hacemos nada (el bootstrap del servicio lo creará).
    return;
  }

  await prisma.subscription.create({
    data: {
      userId,
      planId:    freePlan.id,
      status:    'ACTIVE',
      startsAt:  new Date(),
      expiresAt: new Date(Date.now() + FAR_FUTURE_DAYS * 24 * 60 * 60 * 1000),
      autoRenew: false,
    },
  });
}

/**
 * Re-aplica los módulos canónicos a los planes seedeados. Esto cubre el
 * caso en que agregamos features nuevos (PAYMENTS_DASHBOARD para médicos,
 * por ejemplo) y los planes ya estaban en la DB con el set viejo.
 *
 * Sólo toca planes con `code` y `audience` conocidos — no afecta planes
 * custom que el superadmin haya creado.
 */
const CANONICAL_MODULES: Record<string, Record<string, string[]>> = {
  DOCTOR: {
    FREE:    ['ONLINE'],
    PRO:     ['ONLINE', 'PRESENCIAL', 'CHAT', 'PAYMENTS_DASHBOARD'],
    PREMIUM: ['ONLINE', 'PRESENCIAL', 'CHAT', 'PAYMENTS_DASHBOARD', 'REPORTS', 'PRIORITY_SEARCH', 'BRANDING'],
  },
  CLINIC: {
    FREE:    ['ONLINE'],
    PRO:     ['ONLINE', 'PRESENCIAL', 'CHAT', 'PAYMENTS_DASHBOARD'],
    PREMIUM: ['ONLINE', 'PRESENCIAL', 'CHAT', 'PAYMENTS_DASHBOARD', 'REPORTS', 'MULTI_LOCATION', 'PRIORITY_SUPPORT'],
  },
};

let plansBootstrapped = false;

export async function bootstrapPlanFeatures(): Promise<void> {
  if (plansBootstrapped) return;
  try {
    for (const [audience, planCodes] of Object.entries(CANONICAL_MODULES)) {
      for (const [code, modules] of Object.entries(planCodes)) {
        await prisma.plan.updateMany({
          where: {
            audience: audience as 'DOCTOR' | 'CLINIC',
            code:     code as 'FREE' | 'PRO' | 'PREMIUM',
          },
          data: { modules },
        });
      }
    }
    plansBootstrapped = true;
  } catch {
    // Silencioso — si la tabla todavía no existe (pre-migración) reintenta luego.
  }
}
