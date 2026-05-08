import { NextRequest } from 'next/server';
import { withRole } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { parseBody } from '@medicget/shared/validate';
import { z } from 'zod';
import { prisma } from '@medicget/shared/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/admin/subscriptions/:id/change-plan
 *
 * Permite al superadmin reasignar el plan de una suscripción existente sin
 * pasar por PayPhone. Casos de uso:
 *   • Soporte: el usuario reportó un cobro mal aplicado
 *   • Comercial: regalo de Pro a un médico estratégico
 *   • Migración: pasar a todos los del plan PRO viejo a uno nuevo
 *
 * Cambios que aplica:
 *   1. Verifica que el plan destino exista y matchee la audiencia.
 *   2. Cancela CUALQUIER OTRA suscripción ACTIVA del mismo usuario
 *      (defensa contra duplicados).
 *   3. Actualiza la suscripción objetivo: planId nuevo, status ACTIVE,
 *      expiresAt extendida 30 días desde hoy (o ahora+100 años si el
 *      plan destino es FREE).
 */

const changePlanSchema = z.object({
  planId: z.string().min(1),
});

const FAR_FUTURE_DAYS = 365 * 100;

export const POST = withRole<{ id: string }>(
  ['ADMIN'],
  async (req: NextRequest, { params }) => {
    const parsed = await parseBody(req, changePlanSchema);
    if ('error' in parsed) return parsed.error;

    const sub = await prisma.subscription.findUnique({
      where: { id: params.id },
      include: { plan: true },
    });
    if (!sub) return apiError('NOT_FOUND', 'Suscripción no encontrada.');

    const newPlan = await prisma.plan.findUnique({
      where: { id: parsed.data.planId },
    });
    if (!newPlan)         return apiError('NOT_FOUND',  'Plan no encontrado.');
    if (!newPlan.isActive) return apiError('BAD_REQUEST', 'El plan destino está desactivado.');
    if (newPlan.audience !== sub.plan.audience) {
      return apiError(
        'BAD_REQUEST',
        `El plan destino es para ${newPlan.audience} y el usuario es ${sub.plan.audience}.`,
      );
    }

    const now = new Date();
    const isFree = newPlan.monthlyPrice === 0;
    const newExpires = new Date(
      now.getTime() + (isFree ? FAR_FUTURE_DAYS : 30) * 24 * 60 * 60 * 1000,
    );

    // Transacción: cancelar otras activas + reescribir la objetivo.
    const [, updated] = await prisma.$transaction([
      prisma.subscription.updateMany({
        where:  {
          userId: sub.userId,
          id:     { not: sub.id },
          status: 'ACTIVE',
        },
        data: { status: 'CANCELLED', cancelledAt: now },
      }),
      prisma.subscription.update({
        where: { id: sub.id },
        data: {
          planId:      newPlan.id,
          status:      'ACTIVE',
          startsAt:    now,
          expiresAt:   newExpires,
          cancelledAt: null,
        },
        include: { plan: true, user: { include: { profile: true } } },
      }),
    ]);

    return apiOk(updated, `Plan cambiado a ${newPlan.name}`);
  },
);
