/**
 * Admin-facing operational notifications via email.
 *
 * El superadmin configura desde /admin/settings → tab Notificaciones:
 *   • `NOTIFY_REGISTRATIONS_EMAILS` (CSV)
 *   • `NOTIFY_REGISTRATIONS_ROLES`  (CSV: PATIENT,DOCTOR,CLINIC)
 *   • `NOTIFY_PAYMENTS_EMAILS`      (CSV)
 *
 * Si la lista de emails está vacía o el rol no aparece en la lista de
 * roles habilitados, no se manda nada. Las funciones son fire-and-forget
 * (best-effort) — nunca lanzan: si el SMTP falla, se loguea pero no rompe
 * el flow del usuario.
 */

import { prisma }      from './prisma';
import { getSetting }  from './settings';
import { sendEmail }   from './email';

const ROLE_LABEL: Record<string, string> = {
  PATIENT: 'Paciente',
  DOCTOR:  'Médico',
  CLINIC:  'Clínica',
  ADMIN:   'Admin',
};

/** Valida estructura básica de email y normaliza. */
function parseCsvEmails(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;\n]/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

function parseCsvRoles(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;\n]/)
    .map((r) => r.trim().toUpperCase())
    .filter((r) => r === 'PATIENT' || r === 'DOCTOR' || r === 'CLINIC');
}

/* ═════════════════════════════════════════════════════════════════════════
 *  Registro de un nuevo usuario
 * ═══════════════════════════════════════════════════════════════════════ */

export async function notifyAdminRegistration(userId: string): Promise<void> {
  try {
    const [recipientsRaw, rolesRaw] = await Promise.all([
      getSetting('NOTIFY_REGISTRATIONS_EMAILS', ''),
      getSetting('NOTIFY_REGISTRATIONS_ROLES',  ''),
    ]);
    const recipients = parseCsvEmails(recipientsRaw);
    const roles      = parseCsvRoles(rolesRaw);
    if (recipients.length === 0 || roles.length === 0) return;

    const user = await prisma.user.findUnique({
      where:   { id: userId },
      include: { profile: true, doctor: true, clinic: true },
    });
    if (!user) return;
    if (!roles.includes(user.role)) return;

    const roleLabel = ROLE_LABEL[user.role] ?? user.role;
    const fullName  = `${user.profile?.firstName ?? ''} ${user.profile?.lastName ?? ''}`.trim() || '(sin nombre)';
    const extra: string[] = [];
    if (user.role === 'DOCTOR' && user.doctor?.specialty) {
      extra.push(`Especialidad: <strong>${user.doctor.specialty}</strong>`);
    }
    if (user.role === 'CLINIC' && user.clinic?.name) {
      extra.push(`Clínica: <strong>${user.clinic.name}</strong>`);
    }

    const subject = `Nuevo registro · ${roleLabel} · ${fullName}`;
    const html = `
      <!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;margin:0;padding:24px">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0">
          <p style="font-size:12px;font-weight:600;color:#2563eb;text-transform:uppercase;letter-spacing:.05em;margin:0 0 8px">Aviso operacional</p>
          <h1 style="font-size:22px;color:#0f172a;margin:0 0 8px">Nuevo registro en MedicGet</h1>
          <p style="font-size:14px;color:#475569;margin:0 0 16px">Se registró un nuevo <strong>${roleLabel.toLowerCase()}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:0 0 16px">
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Nombre</td>
                <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">${fullName}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Email</td>
                <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">${user.email}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Rol</td>
                <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">${roleLabel}</td></tr>
            ${extra.map((line) => `<tr><td colspan="2" style="padding:8px 0;color:#475569;font-size:13px">${line}</td></tr>`).join('')}
          </table>
          <p style="font-size:12px;color:#94a3b8;margin:24px 0 0">
            Recibís este correo porque tu dirección figura en la lista de notificaciones de registro
            del panel admin (Configuración → Notificaciones).
          </p>
        </div>
      </body></html>`;
    const text = [
      `Nuevo registro en MedicGet`,
      `Rol: ${roleLabel}`,
      `Nombre: ${fullName}`,
      `Email: ${user.email}`,
      ...extra.map((l) => l.replace(/<[^>]+>/g, '')),
    ].join('\n');

    await Promise.all(
      recipients.map((to) =>
        sendEmail({ to, subject, html, text }).catch((err: unknown) => {
          // eslint-disable-next-line no-console
          console.error('[notifyAdminRegistration] sendEmail failed for', to, err);
        }),
      ),
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[notifyAdminRegistration] failed:', err);
  }
}

/* ═════════════════════════════════════════════════════════════════════════
 *  Pago de cita aprobado
 * ═══════════════════════════════════════════════════════════════════════ */

export async function notifyAdminPaymentConfirmed(appointmentId: string): Promise<void> {
  try {
    const recipientsRaw = await getSetting('NOTIFY_PAYMENTS_EMAILS', '');
    const recipients = parseCsvEmails(recipientsRaw);
    if (recipients.length === 0) return;

    const appt = await prisma.appointment.findUnique({
      where:   { id: appointmentId },
      include: {
        patient: { include: { user: { include: { profile: true } } } },
        doctor:  { include: { user: { include: { profile: true } } } },
        clinic:  true,
        payment: true,
      },
    });
    if (!appt || !appt.payment) return;

    const pat = appt.patient.user.profile;
    const doc = appt.doctor.user.profile;
    const patientName = `${pat?.firstName ?? ''} ${pat?.lastName ?? ''}`.trim() || 'Paciente';
    const doctorName  = `${doc?.firstName ?? ''} ${doc?.lastName ?? ''}`.trim() || 'Médico';
    const dateStr     = new Date(appt.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    const amount      = appt.payment.amount.toFixed(2);

    const subject = `Pago confirmado · $${amount} · ${patientName} → Dr. ${doctorName}`;
    const html = `
      <!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;margin:0;padding:24px">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0">
          <p style="font-size:12px;font-weight:600;color:#10b981;text-transform:uppercase;letter-spacing:.05em;margin:0 0 8px">Aviso operacional</p>
          <h1 style="font-size:22px;color:#0f172a;margin:0 0 8px">Pago confirmado</h1>
          <p style="font-size:14px;color:#475569;margin:0 0 20px">
            Se procesó correctamente un pago de cita en MedicGet.
          </p>
          <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin:0 0 20px">
            <p style="margin:0 0 6px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Monto cobrado</p>
            <p style="margin:0;font-size:28px;font-weight:700;color:#0f172a">$${amount}</p>
          </div>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px">Paciente</td>
                <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">${patientName}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px">Médico</td>
                <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">Dr. ${doctorName} (${appt.doctor.specialty})</td></tr>
            ${appt.clinic ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px">Clínica</td><td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">${appt.clinic.name}</td></tr>` : ''}
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px">Fecha de la cita</td>
                <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">${dateStr} · ${appt.time}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px">Modalidad</td>
                <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">${appt.modality}</td></tr>
            ${appt.payment.transactionId ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px">ID Transacción</td><td style="padding:6px 0;color:#0f172a;font-size:13px;font-family:monospace;text-align:right">${appt.payment.transactionId}</td></tr>` : ''}
          </table>
          <p style="font-size:12px;color:#94a3b8;margin:24px 0 0">
            Recibís este correo porque tu dirección figura en la lista de notificaciones de pagos
            del panel admin (Configuración → Notificaciones).
          </p>
        </div>
      </body></html>`;
    const text = [
      `Pago confirmado en MedicGet`,
      `Monto: $${amount}`,
      `Paciente: ${patientName}`,
      `Médico: Dr. ${doctorName} (${appt.doctor.specialty})`,
      appt.clinic ? `Clínica: ${appt.clinic.name}` : '',
      `Fecha: ${dateStr} ${appt.time}`,
      `Modalidad: ${appt.modality}`,
      appt.payment.transactionId ? `Transacción: ${appt.payment.transactionId}` : '',
    ].filter(Boolean).join('\n');

    await Promise.all(
      recipients.map((to) =>
        sendEmail({ to, subject, html, text }).catch((err: unknown) => {
          // eslint-disable-next-line no-console
          console.error('[notifyAdminPaymentConfirmed] sendEmail failed for', to, err);
        }),
      ),
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[notifyAdminPaymentConfirmed] failed:', err);
  }
}
