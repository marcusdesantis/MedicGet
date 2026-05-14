import { NextRequest } from 'next/server';
import { withAuth } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { parseBody } from '@medicget/shared/validate';
import { z } from 'zod';
import { prisma } from '@medicget/shared/prisma';
import { payphone, buildPaymentBreakdown } from '@medicget/shared/payphone';
import { sendEmail } from '@medicget/shared/email';
import { createNotification } from '@medicget/shared/notifications';

export const dynamic = 'force-dynamic';

const confirmSchema = z.object({
  subscriptionId:    z.string().min(1),
  /** Aceptamos ambos nombres por compatibilidad. */
  payphoneId:        z.string().min(1).optional(),
  payphonePaymentId: z.string().min(1).optional(),
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
    include: { plan: true, user: { include: { profile: true } } },
  });
  if (!sub)                       return apiError('NOT_FOUND',  'Suscripción no encontrada.');
  if (sub.userId !== user.id)     return apiError('FORBIDDEN',  'No es tu suscripción.');
  if (sub.status === 'ACTIVE')    return apiOk({ status: 'ACTIVE' });

  const payphoneId = parsed.data.payphoneId ?? parsed.data.payphonePaymentId;
  if (!payphoneId && parsed.data.fakeOk !== true) {
    return apiError('BAD_REQUEST', 'Falta el id de la transacción de PayPhone.');
  }

  const result = await payphone.confirmSale(
    payphoneId ?? 'stub',
    parsed.data.subscriptionId,
    parsed.data.fakeOk === true,
  );
  if (!result.ok) return apiError('BAD_GATEWAY', result.error);

  if (result.status === 'Approved') {
    // Activamos la nueva Y cancelamos cualquier OTRA suscripción activa
    // del mismo usuario en una transacción. Esto es lo que convierte el
    // "checkout" en un "cambio de plan" sin endpoints adicionales.
    const [, updated] = await prisma.$transaction([
      prisma.subscription.updateMany({
        where: {
          userId: user.id,
          id:     { not: sub.id },
          status: 'ACTIVE',
        },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      }),
      prisma.subscription.update({
        where: { id: sub.id },
        data:  { status: 'ACTIVE', lastPaymentId: result.transactionId ?? payphoneId ?? null },
      }),
    ]);

    // Side-effects: voucher email + notif in-app. Best-effort,
    // fire-and-forget — la suscripción ya está activa, no bloqueamos
    // la respuesta si el SMTP tarda.
    void sendSubscriptionVoucher(sub.id, result.transactionId ?? payphoneId ?? '').catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[subscriptions/confirm] voucher email failed:', err);
    });
    void createNotification({
      userId:   sub.userId,
      type:     'PAYMENT_RECEIVED',
      title:    'Suscripción activada',
      message:  `Tu plan ${sub.plan.name} ya está activo. Te enviamos el comprobante por correo.`,
      metadata: { subscriptionId: sub.id, planCode: sub.plan.code },
      pushUrl:  sub.plan.audience === 'CLINIC' ? '/clinic/plan' : '/doctor/plan',
    }).catch(() => {/* swallow */});

    return apiOk({ status: 'ACTIVE', subscription: updated });
  }
  if (result.status === 'Rejected' || result.status === 'Cancelled') {
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'CANCELLED' } });
    return apiOk({ status: 'FAILED' });
  }
  return apiOk({ status: 'PENDING' });
});

/**
 * Manda el voucher (comprobante) de la suscripción por email al usuario.
 * Best-effort — si falla solo se loggea, el plan ya está activo en DB.
 */
async function sendSubscriptionVoucher(subscriptionId: string, transactionId: string): Promise<void> {
  const sub = await prisma.subscription.findUnique({
    where:   { id: subscriptionId },
    include: { plan: true, user: { include: { profile: true } } },
  });
  if (!sub || !sub.user.email) return;

  const firstName = sub.user.profile?.firstName ?? '';
  const expDate   = sub.expiresAt.toLocaleDateString('es-ES', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
  const paidAt    = new Date().toLocaleDateString('es-ES', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const modulesHtml = sub.plan.modules
    .map((m: string) => `<li style="padding:4px 0;color:#475569">✓ ${m}</li>`)
    .join('');

  // Desglose: plan + comisión por uso de plataforma = total cobrado.
  const breakdown = await buildPaymentBreakdown(sub.plan.monthlyPrice);
  const breakdownRowsHtml = breakdown.platformFee > 0
    ? `
        <tr><td style="padding:4px 0;color:#64748b">Plan</td>
            <td style="padding:4px 0;color:#0f172a;text-align:right">$${breakdown.baseAmount.toFixed(2)}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Comisión por uso de plataforma (${breakdown.feePct}%)</td>
            <td style="padding:4px 0;color:#0f172a;text-align:right">$${breakdown.platformFee.toFixed(2)}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;font-weight:600">Total cobrado</td>
            <td style="padding:4px 0;color:#0f172a;font-weight:700;text-align:right">$${breakdown.totalAmount.toFixed(2)}</td></tr>`
    : `
        <tr><td style="padding:4px 0;color:#64748b">Importe</td>
            <td style="padding:4px 0;color:#0f172a;font-weight:700;text-align:right">$${breakdown.totalAmount.toFixed(2)}</td></tr>`;

  const html = `
    <!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;margin:0;padding:24px">
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0">
        <h1 style="font-size:22px;color:#0f172a;margin:0 0 8px">¡Gracias por suscribirte${firstName ? ', ' + firstName : ''}!</h1>
        <p style="font-size:15px;color:#475569;margin:0 0 16px">
          Tu plan <strong>${sub.plan.name}</strong> ya está activo en MedicGet.
        </p>

        <div style="background:#dcfce7;border-radius:12px;padding:16px;margin:16px 0">
          <p style="margin:0;font-size:13px;color:#166534;font-weight:600">
            ✓ Comprobante de pago
          </p>
          <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:13px">
            <tr><td style="padding:4px 0;color:#64748b">Plan</td>
                <td style="padding:4px 0;color:#0f172a;font-weight:600;text-align:right">${sub.plan.name} (${sub.plan.code})</td></tr>
            ${breakdownRowsHtml}
            <tr><td style="padding:4px 0;color:#64748b">Fecha de pago</td>
                <td style="padding:4px 0;color:#0f172a;text-align:right">${paidAt}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b">Próxima renovación</td>
                <td style="padding:4px 0;color:#0f172a;text-align:right;text-transform:capitalize">${expDate}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b">Transacción</td>
                <td style="padding:4px 0;color:#0f172a;text-align:right;font-family:monospace;font-size:11px">${transactionId}</td></tr>
          </table>
        </div>

        <h3 style="font-size:14px;color:#0f172a;margin:24px 0 8px">Funciones incluidas</h3>
        <ul style="margin:0;padding-left:18px;font-size:13px;list-style:none">${modulesHtml}</ul>

        <p style="font-size:12px;color:#64748b;margin:24px 0 0;line-height:1.5">
          El cobro se renueva automáticamente cada 30 días. Podés cancelar cuando quieras desde tu panel.
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>
        <p style="font-size:11px;color:#94a3b8;margin:0">
          MedicGet · Comprobante automático.
        </p>
      </div>
    </body></html>`;

  const text = [
    `Hola${firstName ? ' ' + firstName : ''},`,
    ``,
    `Tu plan ${sub.plan.name} ya está activo en MedicGet.`,
    ``,
    breakdown.platformFee > 0
      ? `Plan: $${breakdown.baseAmount.toFixed(2)}\n` +
        `Comisión por uso de plataforma (${breakdown.feePct}%): $${breakdown.platformFee.toFixed(2)}\n` +
        `Total cobrado: $${breakdown.totalAmount.toFixed(2)}`
      : `Importe: $${breakdown.totalAmount.toFixed(2)}`,
    `Fecha de pago: ${paidAt}`,
    `Próxima renovación: ${expDate}`,
    `Transacción: ${transactionId}`,
    ``,
    `Podés cancelar cuando quieras desde tu panel.`,
  ].join('\n');

  await sendEmail({
    to:      sub.user.email,
    subject: `Comprobante de pago · Plan ${sub.plan.name} · MedicGet`,
    html,
    text,
  });
}
