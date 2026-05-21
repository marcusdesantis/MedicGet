/**
 * Endpoint removido tras eliminar el sistema de planes/suscripciones.
 * Cualquier llamada devuelve 404.
 */
import { apiError } from '@medicget/shared/response';
export const dynamic = 'force-dynamic';
const removed = () =>
  apiError('NOT_FOUND', 'Funcionalidad removida.');
export const GET    = removed;
export const POST   = removed;
export const PATCH  = removed;
export const DELETE = removed;
