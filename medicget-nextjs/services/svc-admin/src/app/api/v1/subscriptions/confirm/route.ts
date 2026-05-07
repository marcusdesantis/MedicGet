import { NextRequest } from 'next/server';
import { withAuth } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { parseBody } from '@medicget/shared/validate';
import { z } from 'zod';
import { prisma } from '@medicget/shared/prisma';
import { payphone } from '@medicget/shared/payphone';

export const dynamic = 'force-dynamic';

const confirmSchema = z.object({
  subscriptionId:    z.string().min(1),
  payphonePaymentId: z.string().min(1),
  fakeOk:            z.boolean().optional(),
});

/**
 * POST /api/v1/subscriptions/confirm
 *
 * Called from the frontend after PayPhone redirects the user back. Confirms
 * with PayPhone and flips the local Subscription to ACTIVE. Idempotent.
 */
export const POST = withAuth(async (req: NextRequest, { user }) => {
  const parsed = await parseBody(req, confirmSchema);
  if ('error' in parsed) return parsed.error;

  const sub = await prisma.subscription.findUnique({
    where:   { id: parsed.data.subscriptionId },
    include: { plan: true },
  });
  if (!sub)                       return apiError('NOT_FOUND',  'Suscripción no encontrada.');
  if (sub.userId !== user.id)     return apiError('FORBIDDEN',  'No es tu suscripción.');
  if (sub.status === 'ACTIVE')    return apiOk({ status: 'ACTIVE' });

  const result = await payphone.confirmSale(
    parsed.data.payphonePaymentId,
    parsed.data.subscriptionId,
    parsed.data.fakeOk === true,
  );
  if (!result.ok) return apiError('BAD_GATEWAY', result.error);

  if (result.status === 'Approved') {
    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data:  { status: 'ACTIVE' },
    });
    return apiOk({ status: 'ACTIVE', subscription: updated });
  }
  if (result.status === 'Rejected' || result.status === 'Cancelled') {
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'CANCELLED' } });
    return apiOk({ status: 'FAILED' });
  }
  return apiOk({ status: 'PENDING' });
});
