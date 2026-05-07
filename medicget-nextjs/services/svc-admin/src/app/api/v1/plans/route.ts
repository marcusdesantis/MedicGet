import { NextRequest } from 'next/server';
import { apiOk } from '@medicget/shared/response';
import { prisma } from '@medicget/shared/prisma';

export const dynamic = 'force-dynamic';

/**
 * Public endpoint — returns the list of active plans for the landing
 * page's pricing section. No auth required because pricing is meant
 * to be visible to anonymous visitors.
 *
 * Query params:
 *   ?audience=DOCTOR | CLINIC   filter to a single audience
 */
export async function GET(req: NextRequest) {
  const audience = req.nextUrl.searchParams.get('audience') ?? undefined;
  const where: Record<string, unknown> = { isActive: true };
  if (audience === 'DOCTOR' || audience === 'CLINIC') where.audience = audience;
  const plans = await prisma.plan.findMany({
    where,
    orderBy: [{ audience: 'asc' }, { sortOrder: 'asc' }],
  });
  return apiOk(plans);
}
