import { NextRequest } from 'next/server';
import { withAuth } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { prisma } from '@medicget/shared/prisma';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/v1/notifications/:id/read
 *
 * Marca una notificación específica como leída. Sólo el dueño puede
 * marcarla.
 */
export const PATCH = withAuth<{ id: string }>(
  async (_req: NextRequest, { user, params }) => {
    const n = await prisma.notification.findUnique({ where: { id: params.id } });
    if (!n) return apiError('NOT_FOUND', 'Notificación no encontrada.');
    if (n.userId !== user.id) return apiError('FORBIDDEN', 'No es tu notificación.');
    const updated = await prisma.notification.update({
      where: { id: params.id },
      data:  { isRead: true },
    });
    return apiOk(updated);
  },
);
