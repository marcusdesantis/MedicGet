import { NextRequest } from 'next/server';
import { withAuth } from '@medicget/shared/auth';
import { apiOk } from '@medicget/shared/response';
import { prisma } from '@medicget/shared/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/notifications
 *
 * Devuelve las notificaciones del usuario logueado, ordenadas de más
 * recientes a más viejas. Por default trae las últimas 30. Sirve para
 * el dropdown del topbar que muestra el contador de no leídas y la
 * lista al hacer clic.
 *
 * Query params:
 *   ?limit=N      cuántas traer (default 30, max 100)
 *   ?onlyUnread=1 sólo no-leídas
 */
export const GET = withAuth(async (req: NextRequest, { user }) => {
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(100, Math.max(1, Number(sp.get('limit')) || 30));
  const onlyUnread = sp.get('onlyUnread') === '1';

  const where: Record<string, unknown> = { userId: user.id };
  if (onlyUnread) where.isRead = false;

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take:    limit,
    }),
    prisma.notification.count({
      where: { userId: user.id, isRead: false },
    }),
  ]);

  return apiOk({ items, unreadCount });
});
