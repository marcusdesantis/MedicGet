/**
 * Email sending utility — wraps `nodemailer` with a graceful fallback for
 * development environments without real SMTP credentials.
 *
 * Configuration (env vars):
 *   • SMTP_HOST   — e.g. smtp.gmail.com / smtp.mailtrap.io / smtp.sendgrid.net
 *   • SMTP_PORT   — 587 (default) or 465 for SSL
 *   • SMTP_SECURE — "true" to force TLS (port 465); leave empty for STARTTLS
 *   • SMTP_USER   — username (often the email address itself)
 *   • SMTP_PASS   — password or app-specific token
 *   • SMTP_FROM   — sender address: "MedicGet <noreply@medicget.com>"
 *
 * If SMTP_HOST is missing, every send is a no-op except for a console.log
 * with the recipient + subject. That keeps local dev working without
 * requiring devs to configure an SMTP server. To verify formatting locally
 * point the vars at https://mailtrap.io (free, gives you a fake inbox).
 */

import nodemailer, { type Transporter } from 'nodemailer';
import { getSetting, getSettingBool, getSettingNumber } from './settings';

interface EmailPayload {
  to:       string;
  subject:  string;
  /** HTML body — preferred for rich content. */
  html:     string;
  /** Optional plain-text fallback for clients that strip HTML. */
  text?:    string;
}

const DEFAULT_FROM = 'MedicGet <noreply@medicget.local>';

/**
 * Build a fresh transporter from the current settings (DB-first,
 * env-fallback). The transporter is cheap to create and we want admin
 * edits to take effect immediately, so we don't cache it at module level
 * — the `getSetting` cache (30s) is enough to keep DB load minimal.
 */
async function getTransporter(): Promise<Transporter | null> {
  const host = await getSetting('SMTP_HOST');
  if (!host) return null;

  const user = await getSetting('SMTP_USER');
  const pass = await getSetting('SMTP_PASS');

  return nodemailer.createTransport({
    host,
    port:   await getSettingNumber('SMTP_PORT', 587),
    secure: await getSettingBool('SMTP_SECURE', false),
    auth:   user ? { user, pass: pass ?? '' } : undefined,
  });
}

/**
 * Send an email. Never throws — logs the error and returns the result so
 * callers (e.g. the appointment service) can decide whether to swallow
 * the failure or surface it.
 */
export async function sendEmail(payload: EmailPayload): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = await getTransporter();
  if (!t) {
    // eslint-disable-next-line no-console
    console.log(
      '[email][stub] SMTP not configured. Pretending to send email:\n',
      `  to:      ${payload.to}\n`,
      `  subject: ${payload.subject}\n`,
      '  (configure SMTP from the admin panel or set SMTP_HOST in env to enable real sending)',
    );
    return { ok: true };
  }

  try {
    const from = await getSetting('SMTP_FROM', DEFAULT_FROM);
    await t.sendMail({
      from,
      to:   payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    // eslint-disable-next-line no-console
    console.error('[email] send failed:', msg);
    return { ok: false, error: msg };
  }
}
