import { NextRequest } from 'next/server';
import { withAuth } from '@medicget/shared/auth';
import { apiOk } from '@medicget/shared/response';
import { prisma } from '@medicget/shared/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/notifications/read-all
 *
 * Marca como leídas todas las notificaciones del usuario. Útil para
 * el botón "Marcar todo como leído" del dropdown.
 */
export const POST = withAuth(async (_req: NextRequest, { user }) => {
  const result = await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data:  { isRead: true },
  });
  return apiOk({ updated: result.count });
});
