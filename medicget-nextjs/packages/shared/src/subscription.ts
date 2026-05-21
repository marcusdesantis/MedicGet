/**
 * Subscription helpers - STUB tras eliminar el sistema de planes.
 *
 * Cuando se decidio mover a un modelo de "registro 100% gratis +
 * comision por consulta acordada offline", los helpers de gating por
 * plan quedaron sin proposito. Este archivo conserva los exports con
 * las mismas firmas para que los consumidores existentes sigan
 * compilando, pero todas las funciones devuelven valores "full
 * feature" o noop:
 *
 *   - `ensureFreeSubscription`      -> noop (no se crea Subscription)
 *   - `bootstrapPlanFeatures`       -> noop (no hay planes)
 *   - `getAllowedModalities`        -> todas las modalidades
 *   - `intersectModalities`         -> identidad sobre el input
 *   - `countActiveDoctorsInClinic`  -> 0 (sin limite)
 *   - `getEffectivePlan`            -> null (no hay plan)
 *
 * Borrar este archivo y quitar los imports en cada servicio es el
 * proximo paso de limpieza, pero por ahora dejamos el stub para
 * minimizar el churn.
 */

export const ALL_MODALITIES = ['ONLINE', 'PRESENCIAL', 'CHAT'] as const;
export type Modality = (typeof ALL_MODALITIES)[number];

export async function ensureFreeSubscription(
  _userId: string,
  _role:   'DOCTOR' | 'CLINIC',
): Promise<void> {
  // Sistema de planes eliminado.
}

export async function bootstrapPlanFeatures(): Promise<void> {
  // Sistema de planes eliminado.
}

export async function getAllowedModalities(
  _userId: string,
): Promise<Modality[]> {
  // Todos los medicos pueden ofrecer todas las modalidades.
  return [...ALL_MODALITIES];
}

export function intersectModalities(
  requested: string[],
  _allowed:  Modality[],
): Modality[] {
  // Sin limite por plan -> devolvemos solo las modalidades validas.
  return requested.filter((m): m is Modality =>
    (ALL_MODALITIES as readonly string[]).includes(m),
  );
}

export async function countActiveDoctorsInClinic(
  _clinicId: string,
): Promise<number> {
  return 0;
}

export async function getEffectivePlan(
  _userId: string,
): Promise<null> {
  return null;
}
