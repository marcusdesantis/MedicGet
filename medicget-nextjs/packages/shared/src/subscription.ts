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
  /** Cupo de médicos para planes de audiencia CLINIC. null = sin límite. */
  maxDoctors?:  number | null;
  sortOrder:    number;
}

const PLAN_CATALOG: Record<'DOCTOR' | 'CLINIC', Record<'FREE' | 'PRO' | 'PREMIUM', PlanSpec>> = {
  // Planes para médicos INDEPENDIENTES (sin clínica asociada). Los médicos
  // que pertenecen a una clínica heredan el plan de su clínica y no ven
  // este catálogo.
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
      description:  'Todo lo de Pro + reportes avanzados y prioridad en el directorio.',
      monthlyPrice: 50,
      // BRANDING quitado del catálogo — era feature fantasma sin
      // implementación. Si en el futuro habilitamos logo/colores
      // custom en el perfil público, se vuelve a agregar acá.
      modules:      ['ONLINE', 'PRESENCIAL', 'CHAT', 'PAYMENTS_DASHBOARD', 'REPORTS', 'PRIORITY_SEARCH'],
      limits:       { maxAppointmentsPerMonth: null },
      sortOrder:    3,
    },
  },
  // Planes para clínicas. El cupo `maxDoctors` cubre a todos sus médicos
  // y los features se heredan a cada uno. MULTI_LOCATION fue removido —
  // el dominio no modela sedes secundarias, era una feature fantasma.
  CLINIC: {
    FREE: {
      name:         'Free',
      description:  'Hasta 3 médicos en modalidad online. Ideal para empezar.',
      monthlyPrice: 0,
      modules:      ['ONLINE'],
      limits:       { maxAppointmentsPerMonth: 50 },
      maxDoctors:   3,
      sortOrder:    1,
    },
    PRO: {
      name:         'Pro',
      description:  'Hasta 15 médicos con online, presencial y chat. Panel de pagos.',
      monthlyPrice: 50,
      modules:      ['ONLINE', 'PRESENCIAL', 'CHAT', 'PAYMENTS_DASHBOARD'],
      limits:       { maxAppointmentsPerMonth: 1000 },
      maxDoctors:   15,
      sortOrder:    2,
    },
    PREMIUM: {
      name:         'Premium',
      description:  'Hasta 50 médicos. Reportes avanzados y prioridad en el directorio.',
      monthlyPrice: 130,
      // PRIORITY_SUPPORT quitado — no tenemos sistema de tickets ni
      // queue diferenciada, así que era una promesa sin sustento.
      modules:      ['ONLINE', 'PRESENCIAL', 'CHAT', 'PAYMENTS_DASHBOARD', 'REPORTS', 'PRIORITY_SEARCH'],
      limits:       { maxAppointmentsPerMonth: null },
      maxDoctors:   50,
      sortOrder:    3,
    },
  },
};

/**
 * Devuelve el plan EFECTIVO de un usuario, considerando la herencia
 * clínica → médicos asociados.
 *
 * - Si el user es DOCTOR y tiene `clinicId`, devuelve la suscripción
 *   ACTIVE de la clínica (con su plan).
 * - En cualquier otro caso devuelve la suscripción ACTIVE del propio
 *   user.
 * - Si no hay ninguna suscripción ACTIVE, devuelve null (el caller
 *   debería caer al plan FREE de su audiencia como fallback).
 *
 * Esta función es la fuente de verdad para gating de features. Reemplaza
 * el patrón antiguo de "lee `Subscription` directo del userId" que
 * dejaba a los médicos empleados estancados en FREE aunque su clínica
 * tuviera Premium.
 */
export async function getEffectivePlan(userId: string) {
  // Buscamos primero al doctor para saber si pertenece a una clínica.
  const doctor = await prisma.doctor.findUnique({
    where:  { userId },
    select: { clinicId: true, clinic: { select: { userId: true } } },
  });

  // Médico empleado: el plan vive en el user de la clínica.
  if (doctor?.clinicId && doctor.clinic?.userId) {
    const clinicSub = await prisma.subscription.findFirst({
      where:   { userId: doctor.clinic.userId, status: 'ACTIVE' },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    if (clinicSub) return clinicSub;
  }

  // Caso default: la suscripción propia del usuario.
  return prisma.subscription.findFirst({
    where:   { userId, status: 'ACTIVE' },
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
  });
}

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
  // Si el user es DOCTOR con clinicId, el plan efectivo es el de la
  // clínica — el médico hereda automáticamente las modalidades que la
  // clínica paga, sin tener que comprar su propio plan.
  const sub = await getEffectivePlan(userId);
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
    // 1) Re-aplicar módulos canónicos + cupo de médicos por plan.
    for (const audience of ['DOCTOR', 'CLINIC'] as const) {
      for (const code of ['FREE', 'PRO', 'PREMIUM'] as const) {
        const spec = PLAN_CATALOG[audience][code];
        await prisma.plan.updateMany({
          where: { audience, code },
          data:  {
            modules:    spec.modules,
            maxDoctors: audience === 'CLINIC' ? (spec.maxDoctors ?? null) : null,
          },
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
 * Pausa la suscripción personal de un médico cuando se une a una
 * clínica. La suscripción pasa a `PAUSED` (no se cobra ni renueva); la
 * `expiresAt` se preserva por si más adelante se desvincula y queremos
 * reanudarla con el saldo de tiempo que aún tenía.
 *
 * Idempotente — si no hay nada que pausar (el médico no tenía sub o ya
 * estaba PAUSED), no hace nada.
 */
export async function pausePersonalSubscriptionForDoctor(userId: string): Promise<void> {
  await prisma.subscription.updateMany({
    where: { userId, status: 'ACTIVE' },
    data:  { status: 'PAUSED' },
  });
}

/**
 * Re-activa la suscripción personal de un médico que se desvincula de
 * una clínica. Sólo reactiva si todavía no expiró; si ya expiró o el
 * médico nunca tuvo plan propio, dejamos que `ensureFreeSubscription`
 * lo ponga en FREE como fallback.
 */
export async function resumePersonalSubscriptionForDoctor(userId: string): Promise<void> {
  const paused = await prisma.subscription.findFirst({
    where:   { userId, status: 'PAUSED' },
    orderBy: { createdAt: 'desc' },
  });
  if (paused && paused.expiresAt.getTime() > Date.now()) {
    await prisma.subscription.update({
      where: { id: paused.id },
      data:  { status: 'ACTIVE' },
    });
  } else {
    // Cae a FREE si no hay pausada vigente.
    await ensureFreeSubscription(userId, 'DOCTOR');
  }
}

/**
 * Cuenta cuántos médicos ACTIVE (User.status='ACTIVE') tiene una clínica.
 * Usado por la validación de cupo cuando se intenta agregar uno nuevo.
 */
export async function countActiveDoctorsInClinic(clinicId: string): Promise<number> {
  return prisma.doctor.count({
    where: {
      clinicId,
      user: { status: 'ACTIVE' },
    },
  });
}

/**
 * Exporta el catálogo canónico para que `prisma/seed.ts` lo consuma.
 * Mantenerlo acá garantiza una sola fuente de verdad entre el seed
 * inicial y el bootstrap que actualiza módulos.
 */
export { PLAN_CATALOG };
