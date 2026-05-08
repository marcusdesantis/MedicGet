import { NextRequest } from 'next/server';
import { apiOk, apiError } from '@medicget/shared/response';
import { getVapidPublicKey } from '@medicget/shared/webpush';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/push/vapid-public-key
 *
 * Endpoint público — el frontend lo usa al registrar el Service
 * Worker para suscribirse a Web Push. La clave es necesaria para que
 * el browser cifre el push hacia nuestro servidor.
 */
export async function GET(_req: NextRequest) {
  const key = await getVapidPublicKey();
  if (!key) return apiError('SERVICE_UNAVAILABLE', 'Push no configurado.');
  return apiOk({ publicKey: key });
}
