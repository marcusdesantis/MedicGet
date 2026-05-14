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
 * Catálogo canónico de planes. El bootstrap usa esto para hacer UPSERT
 * en la tabla `Plan` cada vez que arranca el sistema:
 *   • Si el plan no existe → se crea con name, monthlyPrice, modules,
 *     limits y sortOrder.
 *   • Si ya existe → se actualizan solo los `modules` para que un
 *     deploy nuevo no le borre al superadmin sus cambios de precio o
 *     descripción. El catálogo de módulos es la fuente de verdad.
 *
 * Si querés cambiar el precio o el copy, hacelo desde /admin/plans —
 * la edición persiste, este bootstrap respeta lo que vos hayas tocado.
 */
interface PlanSpec {
  name:         string;
  description:  string;
  monthlyPrice: number;
  modules:      string[];
  limits:       Record<string, unknown>;
  sortOrder:    number;
}

const PLAN_CATALOG: Record<'DOCTOR' | 'CLINIC', Record<'FREE' | 'PRO' | 'PREMIUM', PlanSpec>> = {
  DOCTOR: {
    FREE: {
      name:         'Free',
      description:  'Para empezar a recibir consultas online sin costo.',
      monthlyPrice: 0,
      modules:      ['ONLINE'],
      limits:       { maxAppointmentsPerMonth: 20 },
      sortOrder:    1,
    },
    PRO: {
      name:         'Pro',
      description:  'Atendé online, presencial y por chat con dashboard de pagos.',
      monthlyPrice: 20,
      modules:      ['ONLINE', 'PRESENCIAL', 'CHAT', 'PAYMENTS_DASHBOARD'],
      limits:       { maxAppointmentsPerMonth: 200 },
      sortOrder:    2,
    },
    PREMIUM: {
      name:         'Premium',
      description:  'Todo lo de Pro + reportes, búsqueda priorizada y branding propio.',
      monthlyPrice: 50,
      modules:      ['ONLINE', 'PRESENCIAL', 'CHAT', 'PAYMENTS_DASHBOARD', 'REPORTS', 'PRIORITY_SEARCH', 'BRANDING'],
      limits:       { maxAppointmentsPerMonth: null },
      sortOrder:    3,
    },
  },
  CLINIC: {
    FREE: {
      name:         'Free',
      description:  'Una clínica con un médico, modalidad online.',
      monthlyPrice: 0,
      modules:      ['ONLINE'],
      limits:       { maxDoctors: 1, maxAppointmentsPerMonth: 50 },
      sortOrder:    1,
    },
    PRO: {
      name:         'Pro',
      description:  'Multi-médico, todas las modalidades, dashboard de pagos.',
      monthlyPrice: 50,
      modules:      ['ONLINE', 'PRESENCIAL', 'CHAT', 'PAYMENTS_DASHBOARD'],
      limits:       { maxDoctors: 10, maxAppointmentsPerMonth: 1000 },
      sortOrder:    2,
    },
    PREMIUM: {
      name:         'Premium',
      description:  'Sin límites de médicos, reportes avanzados, multi-sede y soporte prioritario.',
      monthlyPrice: 130,
      modules:      ['ONLINE', 'PRESENCIAL', 'CHAT', 'PAYMENTS_DASHBOARD', 'REPORTS', 'MULTI_LOCATION', 'PRIORITY_SUPPORT'],
      limits:       { maxDoctors: null, maxAppointmentsPerMonth: null },
      sortOrder:    3,
    },
  },
};

// Compat con código existente que importa CANONICAL_MODULES.
const CANONICAL_MODULES: Record<string, Record<string, string[]>> = {
  DOCTOR: {
    FREE:    PLAN_CATALOG.DOCTOR.FREE.modules,
    PRO:     PLAN_CATALOG.DOCTOR.PRO.modules,
    PREMIUM: PLAN_CATALOG.DOCTOR.PREMIUM.modules,
  },
  CLINIC: {
    FREE:    PLAN_CATALOG.CLINIC.FREE.modules,
    PRO:     PLAN_CATALOG.CLINIC.PRO.modules,
    PREMIUM: PLAN_CATALOG.CLINIC.PREMIUM.modules,
  },
};

/**
 * Modalidades válidas en el dominio. Filtramos las strings del array
 * `Plan.modules` por estos valores antes de cruzarlos con
 * `Doctor.modalities` (porque modules incluye también REPORTS,
 * BRANDING, etc. que no son modalidades).
 */
const VALID_MODALITIES = ['ONLINE', 'PRESENCIAL', 'CHAT'] as const;
export type Modality = typeof VALID_MODALITIES[number];

/**
 * Devuelve la lista de modalidades que el plan ACTIVO del usuario le
 * permite ofrecer. Fallback: ['ONLINE'] si no tiene suscripción.
 *
 * Esta es la fuente de verdad para gating de funcionalidades por plan.
 * La columna `Doctor.modalities` registra las que EL MÉDICO eligió
 * tener visibles, pero la intersección con esta función es lo que
 * efectivamente puede usar.
 */
export async function getAllowedModalities(userId: string): Promise<Modality[]> {
  const sub = await prisma.subscription.findFirst({
    where:   { userId, status: 'ACTIVE' },
    include: { plan: true },
    orderBy: { expiresAt: 'desc' },
  });
  const modules = sub?.plan.modules ?? ['ONLINE'];
  return VALID_MODALITIES.filter((m) => modules.includes(m));
}

/**
 * Versión no-async que cruza `doctor.modalities` con un array de
 * modules ya cargados. Útil cuando ya tenés el plan cargado y querés
 * sanitizar inline sin otra query.
 */
export function intersectModalities(
  doctorModalities: string[],
  planModules:      string[],
): Modality[] {
  return VALID_MODALITIES.filter(
    (m) => doctorModalities.includes(m) && planModules.includes(m),
  );
}

let plansBootstrapped = false;

/**
 * Re-aplica los módulos canónicos a los planes existentes. Sólo hace
 * `updateMany` — NO crea planes que no existan. La creación inicial
 * vive en el seed (`prisma/seed.ts`), que es la fuente de verdad para
 * la instalación.
 *
 * Esto cubre el caso en que agregamos un módulo nuevo en el catálogo
 * (ej. `PAYMENTS_DASHBOARD`) y queremos que los planes existentes lo
 * reciban sin re-correr el seed.
 *
 * Idempotente.
 */
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

    // ─── Migración de precios .99 → redondos ─────────────────────────
    // El catálogo cambió de ($19.99, $49.99, $129.99) a ($20, $50, $130)
    // para evitar la incoherencia "card dice $20 y checkout dice $19.99"
    // (los cards usan toFixed(0)). Sólo actualizamos cuando el precio en
    // DB coincide EXACTO con el valor antiguo — si el superadmin ya tocó
    // el precio desde /admin/plans, lo respetamos.
    const PRICE_MIGRATIONS: Array<{
      audience: 'DOCTOR' | 'CLINIC';
      code:     'PRO' | 'PREMIUM';
      from:     number;
      to:       number;
    }> = [
      { audience: 'DOCTOR', code: 'PRO',     from: 19.99,  to: 20  },
      { audience: 'DOCTOR', code: 'PREMIUM', from: 49.99,  to: 50  },
      { audience: 'CLINIC', code: 'PRO',     from: 49.99,  to: 50  },
      { audience: 'CLINIC', code: 'PREMIUM', from: 129.99, to: 130 },
    ];
    for (const m of PRICE_MIGRATIONS) {
      await prisma.plan.updateMany({
        where: { audience: m.audience, code: m.code, monthlyPrice: m.from },
        data:  { monthlyPrice: m.to },
      });
    }

    plansBootstrapped = true;
  } catch {
    // Silencioso — si la tabla todavía no existe (pre-migración) reintenta luego.
  }
}

/**
 * Exporta el catálogo canónico para que `prisma/seed.ts` lo consuma.
 * Mantenerlo acá garantiza una sola fuente de verdad entre el seed
 * inicial y el bootstrap que actualiza módulos.
 */
export { PLAN_CATALOG };
