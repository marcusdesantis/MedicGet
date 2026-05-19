import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@medicget/shared/auth';
import { apiError } from '@medicget/shared/response';
import { prisma } from '@medicget/shared/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/payments/:id/receipt
 *
 * Devuelve un HTML imprimible (vía `window.print()` o "Guardar como PDF"
 * del browser) con el detalle del pago.
 *
 * Soporta DOS tipos de pago:
 *   1. Pago de cita        → Payment.appointmentId  (paciente → médico/clínica)
 *   2. Pago de suscripción → Payment.subscriptionId (médico/clínica → MedicGet)
 *
 * Para cada tipo se renderiza un template distinto. La autorización
 * también difiere:
 *   - Cita        → caller debe ser paciente/médico/clínica de la cita, o ADMIN.
 *   - Suscripción → caller debe ser el dueño de la suscripción, o ADMIN.
 */
export const GET = withAuth<{ id: string }>(async (_req: NextRequest, { user, params }) => {
  const { id } = params;
  const payment = await prisma.payment.findUnique({
    where:   { id },
    include: {
      appointment: {
        include: {
          patient: { include: { user: { include: { profile: true } } } },
          doctor:  { include: { user: { include: { profile: true } } } },
          clinic:  true,
        },
      },
      subscription: {
        include: {
          plan: true,
          user: { include: { profile: true } },
        },
      },
    },
  });
  if (!payment) return apiError('NOT_FOUND', 'Pago no encontrado.');

  // ─── Authorisation ──────────────────────────────────────────────────
  // ADMIN bypass para todo. Para los demás, el chequeo depende del tipo.
  if (user.role !== 'ADMIN') {
    if (payment.appointment) {
      // Recibo de pago de CITA.
      const a = payment.appointment;
      if (user.role === 'PATIENT') {
        const p = await prisma.patient.findUnique({ where: { userId: user.id } });
        if (!p || a.patientId !== p.id) return apiError('FORBIDDEN', 'Sin permiso para ver este recibo.');
      } else if (user.role === 'DOCTOR') {
        const d = await prisma.doctor.findUnique({ where: { userId: user.id } });
        if (!d || a.doctorId !== d.id) return apiError('FORBIDDEN', 'Sin permiso para ver este recibo.');
      } else if (user.role === 'CLINIC') {
        const c = await prisma.clinic.findUnique({ where: { userId: user.id } });
        if (!c || a.clinicId !== c.id) return apiError('FORBIDDEN', 'Sin permiso para ver este recibo.');
      } else {
        return apiError('FORBIDDEN', 'Sin permiso para ver este recibo.');
      }
    } else if (payment.subscription) {
      // Recibo de pago de SUSCRIPCIÓN: solo el dueño del plan puede verlo.
      if (payment.subscription.userId !== user.id) {
        return apiError('FORBIDDEN', 'Sin permiso para ver este recibo.');
      }
    } else {
      // Pago huérfano (no debería existir). Bloqueamos.
      return apiError('FORBIDDEN', 'Sin permiso para ver este recibo.');
    }
  }

  const paidAtStr  = payment.paidAt
    ? new Date(payment.paidAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';
  const statusCopy = payment.status === 'PAID'      ? 'Pagado'
                   : payment.status === 'REFUNDED'  ? 'Reembolsado'
                   : payment.status === 'FAILED'    ? 'Fallido'
                                                    : 'Pendiente';

  // Estilos compartidos por ambos templates.
  const sharedStyles = `
    @page { size: A4; margin: 18mm; }
    * { box-sizing: border-box; }
    body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; color: #0f172a; margin: 0; padding: 24px; background: #fff; }
    .receipt { max-width: 720px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
    .brand h1 { margin: 0; font-size: 28px; color: #2563eb; }
    .brand p  { margin: 4px 0 0; font-size: 13px; color: #64748b; }
    .meta { text-align: right; font-size: 12px; color: #64748b; }
    .meta .num { font-size: 14px; color: #0f172a; font-weight: 700; }
    h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin: 24px 0 8px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    table tr td { padding: 8px 0; vertical-align: top; border-bottom: 1px solid #f1f5f9; }
    table tr td.label { color: #64748b; width: 40%; }
    table tr td.value { color: #0f172a; font-weight: 500; text-align: right; text-transform: capitalize; }
    .total-box { background: #dbeafe; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .total-box .label { font-size: 12px; color: #1e40af; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
    .total-box .amount { font-size: 32px; color: #1e3a8a; font-weight: 800; margin-top: 4px; }
    .split { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; font-size: 12px; color: #475569; }
    .split div strong { display: block; font-size: 16px; color: #0f172a; }
    .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; }
    .status { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
    .status.paid     { background: #dcfce7; color: #166534; }
    .status.refunded { background: #fef3c7; color: #92400e; }
    .status.failed   { background: #fee2e2; color: #991b1b; }
    .status.pending  { background: #f1f5f9; color: #475569; }
    .actions { text-align: center; margin: 24px 0; }
    .actions button { background: #2563eb; color: #fff; border: 0; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
    @media print { .actions { display: none; } }
  `;

  // ─── Template según tipo de pago ────────────────────────────────────
  let html: string;

  if (payment.appointment) {
    // ─── Recibo de cita ──────────────────────────────────────────────
    const a = payment.appointment;
    const patientName = `${a.patient.user.profile?.firstName ?? ''} ${a.patient.user.profile?.lastName ?? ''}`.trim();
    const doctorName  = `${a.doctor.user.profile?.firstName ?? ''} ${a.doctor.user.profile?.lastName ?? ''}`.trim();
    const dateLong    = new Date(a.date).toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const modality    = a.modality === 'ONLINE' ? 'Videollamada' : a.modality === 'PRESENCIAL' ? 'Presencial' : 'Chat en vivo';

    html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Recibo de pago #${payment.id.slice(-8).toUpperCase()} · MedicGet</title>
  <style>${sharedStyles}</style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="brand">
        <h1>MedicGet</h1>
        <p>Comprobante de pago de consulta médica</p>
      </div>
      <div class="meta">
        Recibo Nº <span class="num">${payment.id.slice(-8).toUpperCase()}</span><br/>
        Emitido el ${paidAtStr}<br/>
        <span class="status ${payment.status.toLowerCase()}">${statusCopy}</span>
      </div>
    </div>

    <div class="actions">
      <button onclick="window.print()">Imprimir / Guardar como PDF</button>
    </div>

    <h2>Detalle de la consulta</h2>
    <table>
      <tr><td class="label">Paciente</td><td class="value">${patientName || '—'}</td></tr>
      <tr><td class="label">Email paciente</td><td class="value" style="text-transform:none">${a.patient.user.email}</td></tr>
      <tr><td class="label">Médico</td><td class="value">Dr. ${doctorName || '—'}</td></tr>
      <tr><td class="label">Especialidad</td><td class="value">${a.doctor.specialty}</td></tr>
      ${a.clinic ? `<tr><td class="label">Clínica</td><td class="value">${a.clinic.name}</td></tr>` : ''}
      <tr><td class="label">Fecha de la cita</td><td class="value">${dateLong}</td></tr>
      <tr><td class="label">Hora</td><td class="value">${a.time}</td></tr>
      <tr><td class="label">Modalidad</td><td class="value">${modality}</td></tr>
    </table>

    <div class="total-box">
      <div class="label">Total cobrado</div>
      <div class="amount">$${payment.amount.toFixed(2)} USD</div>
      ${payment.platformFee != null && payment.doctorAmount != null ? `
      <div class="split">
        <div><span>Comisión plataforma</span><strong>$${payment.platformFee.toFixed(2)}</strong></div>
        <div><span>Importe al médico</span><strong>$${payment.doctorAmount.toFixed(2)}</strong></div>
      </div>` : ''}
    </div>

    <h2>Datos del pago</h2>
    <table>
      <tr><td class="label">Método</td><td class="value">${payment.method}</td></tr>
      ${payment.transactionId ? `<tr><td class="label">ID de transacción</td><td class="value" style="text-transform:none;font-family:monospace;font-size:12px">${payment.transactionId}</td></tr>` : ''}
      ${payment.notes ? `<tr><td class="label">Notas</td><td class="value" style="text-transform:none">${payment.notes}</td></tr>` : ''}
      ${payment.paidAt ? `<tr><td class="label">Pagado el</td><td class="value">${paidAtStr}</td></tr>` : ''}
      ${payment.refundedAt ? `<tr><td class="label">Reembolsado el</td><td class="value">${new Date(payment.refundedAt).toLocaleDateString('es-ES')}</td></tr>` : ''}
    </table>

    <div class="footer">
      Procesado por PayPhone. Este recibo es un comprobante automático sin valor fiscal.<br/>
      MedicGet · ${new Date().getFullYear()}
    </div>
  </div>
</body>
</html>`;
  } else if (payment.subscription) {
    // ─── Recibo de suscripción ───────────────────────────────────────
    const s         = payment.subscription;
    const subscriberName = `${s.user.profile?.firstName ?? ''} ${s.user.profile?.lastName ?? ''}`.trim();
    const audience  = s.plan.audience === 'CLINIC' ? 'Clínica' : 'Especialista';
    const startsAt  = new Date(s.startsAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    const expiresAt = new Date(s.expiresAt).toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

    html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Recibo de suscripción #${payment.id.slice(-8).toUpperCase()} · MedicGet</title>
  <style>${sharedStyles}</style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="brand">
        <h1>MedicGet</h1>
        <p>Comprobante de pago de suscripción</p>
      </div>
      <div class="meta">
        Recibo Nº <span class="num">${payment.id.slice(-8).toUpperCase()}</span><br/>
        Emitido el ${paidAtStr}<br/>
        <span class="status ${payment.status.toLowerCase()}">${statusCopy}</span>
      </div>
    </div>

    <div class="actions">
      <button onclick="window.print()">Imprimir / Guardar como PDF</button>
    </div>

    <h2>Detalle de la suscripción</h2>
    <table>
      <tr><td class="label">Titular</td><td class="value">${subscriberName || '—'}</td></tr>
      <tr><td class="label">Email</td><td class="value" style="text-transform:none">${s.user.email}</td></tr>
      <tr><td class="label">Tipo de cuenta</td><td class="value">${audience}</td></tr>
      <tr><td class="label">Plan</td><td class="value">${s.plan.name} (${s.plan.code})</td></tr>
      <tr><td class="label">Inicio del período</td><td class="value">${startsAt}</td></tr>
      <tr><td class="label">Próxima renovación</td><td class="value">${expiresAt}</td></tr>
    </table>

    <div class="total-box">
      <div class="label">Total cobrado</div>
      <div class="amount">$${payment.amount.toFixed(2)} USD</div>
      <div class="split">
        <div><span>Período</span><strong>30 días</strong></div>
        <div><span>Plan</span><strong>${s.plan.name}</strong></div>
      </div>
    </div>

    <h2>Datos del pago</h2>
    <table>
      <tr><td class="label">Método</td><td class="value">${payment.method}</td></tr>
      ${payment.transactionId ? `<tr><td class="label">ID de transacción</td><td class="value" style="text-transform:none;font-family:monospace;font-size:12px">${payment.transactionId}</td></tr>` : ''}
      ${payment.notes ? `<tr><td class="label">Notas</td><td class="value" style="text-transform:none">${payment.notes}</td></tr>` : ''}
      ${payment.paidAt ? `<tr><td class="label">Pagado el</td><td class="value">${paidAtStr}</td></tr>` : ''}
      ${payment.refundedAt ? `<tr><td class="label">Reembolsado el</td><td class="value">${new Date(payment.refundedAt).toLocaleDateString('es-ES')}</td></tr>` : ''}
    </table>

    <div class="footer">
      Procesado por PayPhone. Este recibo es un comprobante automático sin valor fiscal.<br/>
      MedicGet · ${new Date().getFullYear()}
    </div>
  </div>
</body>
</html>`;
  } else {
    // Pago huérfano — no debería existir. Devolvemos 404 lógico.
    return apiError('NOT_FOUND', 'Pago sin cita ni suscripción asociada.');
  }

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Inline para que abra en la pestaña, no force download.
      'Content-Disposition': `inline; filename="recibo-${payment.id.slice(-8)}.html"`,
    },
  });
});
