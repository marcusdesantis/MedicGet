import { NextRequest } from 'next/server';
import { withAuth } from '@medicget/shared/auth';
import { apiOk } from '@medicget/shared/response';
import { prisma } from '@medicget/shared/prisma';

export const dynamic = 'force-dynamic';

/**
 * Returns the current user's most recent subscription (with the plan
 * details inlined), plus a `freePlan` field that the frontend uses to
 * paint a fallback when the user has never subscribed.
 *
 * The Doctor/Clinic dashboards use this to show a "Tu plan: X · expira
 * el Y" header and gate features.
 */
export const GET = withAuth(async (_req: NextRequest, { user }) => {
  // Most recent active subscription, if any
  const subscription = await prisma.subscription.findFirst({
    where:   { userId: user.id, status: { in: ['ACTIVE', 'PENDING_PAYMENT'] } },
    include: { plan: true },
    orderBy: { expiresAt: 'desc' },
  });

  // Always return the FREE plan for the user's audience as a fallback
  const audience = user.role === 'CLINIC' ? 'CLINIC' : 'DOCTOR';
  const freePlan = await prisma.plan.findUnique({
    where: { audience_code: { audience, code: 'FREE' } },
  });

  return apiOk({
    subscription,
    freePlan,
  });
});
