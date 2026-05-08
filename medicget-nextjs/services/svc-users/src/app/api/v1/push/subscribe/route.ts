import { NextRequest } from 'next/server';
import { withAuth } from '@medicget/shared/auth';
import { apiOk } from '@medicget/shared/response';
import { parseBody } from '@medicget/shared/validate';
import { z } from 'zod';
import { prisma } from '@medicget/shared/prisma';

export const dynamic = 'force-dynamic';

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth:   z.string().min(1),
  }),
});

/**
 * POST /api/v1/push/subscribe
 *
 * Registra una suscripción de Web Push. Si el `endpoint` ya existe (el
 * mismo dispositivo se re-suscribió), sobreescribe los keys + el userId
 * del dueño actual.
 */
export const POST = withAuth(async (req: NextRequest, { user }) => {
  const parsed = await parseBody(req, subscribeSchema);
  if ('error' in parsed) return parsed.error;

  const ua = req.headers.get('user-agent') ?? null;

  const sub = await prisma.pushSubscription.upsert({
    where:  { endpoint: parsed.data.endpoint },
    update: { userId: user.id, keys: parsed.data.keys, userAgent: ua },
    create: {
      userId:    user.id,
      endpoint:  parsed.data.endpoint,
      keys:      parsed.data.keys,
      userAgent: ua,
    },
  });

  return apiOk({ id: sub.id }, 'Suscripción guardada');
});

/**
 * DELETE /api/v1/push/subscribe?endpoint=...
 *
 * Elimina la suscripción del dispositivo actual. El frontend lo invoca
 * cuando el usuario apaga el toggle de "Activar notificaciones push".
 */
export const DELETE = withAuth(async (req: NextRequest, { user }) => {
  const endpoint = req.nextUrl.searchParams.get('endpoint');
  if (!endpoint) return apiOk({ removed: 0 });
  const result = await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: user.id },
  });
  return apiOk({ removed: result.count });
});
