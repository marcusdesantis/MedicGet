import { NextRequest } from 'next/server';
import { withAuth } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { parseBody } from '@medicget/shared/validate';
import { z } from 'zod';
import { prisma } from '@medicget/shared/prisma';
import { payphone, toCents, buildPaymentBreakdown } from '@medicget/shared/payphone';

export const dynamic = 'force-dynamic';

const checkoutSchema = z.object({
  planId:          z.string().min(1),
  responseUrl:     z.string().url(),
  cancellationUrl: z.string().url().optional(),
});

/**
 * POST /api/v1/subscriptions/checkout
 *
 * Initiates a PayPhone payment for a 30-day subscription to the chosen
 * plan. Creates a Subscription row in PENDING_PAYMENT state. When the
 * user returns through PayPhone's redirect, the existing
 * /api/v1/subscriptions/confirm endpoint flips it to ACTIVE.
 *
 * Free plans don't go through PayPhone — we just create / refresh the
 * subscription row and set expiresAt to a far-future date. The UI
 * shouldn't even surface the checkout for FREE plans, but we accept it
 * defensively.
 */
export const POST = withAuth(async (req: NextRequest, { user }) => {
  const parsed = await parseBody(req, checkoutSchema);
  if ('error' in parsed) return parsed.error;

  const plan = await prisma.plan.findUnique({ where: { id: parsed.data.planId } });
  if (!plan || !plan.isActive) return apiError('NOT_FOUND', 'Plan no encontrado.');

  // Audience check — doctors can only buy DOCTOR plans, clinics CLINIC.
  const callerAudience = user.role === 'CLINIC' ? 'CLINIC' : 'DOCTOR';
  if (plan.audience !== callerAudience) {
    return apiError('BAD_REQUEST', 'Este plan no aplica a tu tipo de cuenta.');
  }

  const now = new Date();
  // FREE → no payment, just create/refresh
  if (plan.monthlyPrice === 0) {
    const farFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const sub = await prisma.subscription.upsert({
      where: { id: (await prisma.subscription.findFirst({ where: { userId: user.id } }))?.id ?? '___none___' },
      update: { planId: plan.id, status: 'ACTIVE', startsAt: now, expiresAt: farFuture },
      create: { userId: user.id, planId: plan.id, status: 'ACTIVE', startsAt: now, expiresAt: farFuture },
    });
    return apiOk({ subscriptionId: sub.id, redirectUrl: parsed.data.responseUrl + '?freeOk=1' });
  }

  // Paid plan → PayPhone Cajita.
  // El backend NO llama a PayPhone — solo arma los datos que el widget
  // (PPaymentButtonBox) necesita para renderizar la pasarela del lado
  // del frontend. Mismo cambio que hicimos en /appointments/checkout.
  //
  // El cliente paga `base + comisión por uso de plataforma`. La comisión
  // se configura desde /admin/settings (PLATFORM_FEE_PCT, default 10%).
  const breakdown = await buildPaymentBreakdown(plan.monthlyPrice);

  const reference            = `MedicGet · ${plan.name}`;
  const clientTransactionId  = `sub-${user.id}-${Date.now()}`;
  const session = await payphone.buildCheckoutSession({
    amountCents:        toCents(breakdown.totalAmount),
    amountWithTaxCents: toCents(breakdown.totalAmount),
    clientTransactionId,
    responseUrl:        parsed.data.responseUrl,
    reference,
  });
  if (!session.ok) return apiError('BAD_GATEWAY', session.error);

  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sub = await prisma.subscription.create({
    data: {
      userId:    user.id,
      planId:    plan.id,
      status:    'PENDING_PAYMENT',
      startsAt:  now,
      expiresAt,
      // lastPaymentId se setea cuando PayPhone redirige al callback con
      // su id numérico (ver /api/v1/subscriptions/confirm). Hasta
      // entonces queda null.
    },
  });

  return apiOk({
    subscriptionId: sub.id,
    // Desglose para que el frontend muestre "Plan + Comisión = Total"
    // antes del widget.
    breakdown,
    // Devolvemos la sesión completa para que el frontend monte el
    // widget en el navegador (flow Cajita).
    ...session,
  });
});
