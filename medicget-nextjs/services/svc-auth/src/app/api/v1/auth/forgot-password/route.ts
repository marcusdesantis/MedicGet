import { NextRequest } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { apiOk, apiError } from '@medicget/shared/response';
import { prisma }          from '@medicget/shared/prisma';
import { sendEmail }       from '@medicget/shared/email';
import { getSetting }      from '@medicget/shared/settings';
import { parseBody }       from '@/lib/validate';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/auth/forgot-password
 *
 * Genera un token de un solo uso (60 min de vida), guarda el HASH en
 * `PasswordResetToken` y manda el token plano por email al usuario.
 *
 * Validaciones:
 *  - El email no puede estar vacío (Zod `.email().min(1)`).
 *  - El email DEBE existir y pertenecer a un usuario ACTIVE — si no, se
 *    devuelve `NOT_FOUND` así el frontend puede mostrar el error.
 *
 * Nota de seguridad: muchas apps prefieren no revelar si el email existe
 * (para evitar enumeración). Acá el usuario explícitamente pidió validar
 * que existe antes de enviar, así que lo hacemos. Si en el futuro querés
 * volver a la postura "silenciosa", reemplazá el `apiError` por `apiOk`.
 */
const schema = z.object({
  email: z.string().min(1, 'El correo es obligatorio').email('Introduce un correo válido'),
});

const TOKEN_TTL_MIN = 60;

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, schema);
  if ('error' in parsed) return parsed.error;

  const email = parsed.data.email.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where:   { email, status: 'ACTIVE' },
    include: { profile: true },
  });
  if (!user) {
    return apiError(
      'NOT_FOUND',
      'No encontramos una cuenta activa con ese correo.',
      { field: 'email' },
    );
  }

  // Generamos token aleatorio de 32 bytes (256 bits) → hex de 64 chars.
  // Lo enviamos PLANO por email; en la DB guardamos sólo el SHA-256.
  const plain = crypto.randomBytes(32).toString('hex');
  const hash  = crypto.createHash('sha256').update(plain).digest('hex');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000);

  // Limpiamos tokens anteriores no usados — un usuario sólo necesita el
  // último link válido, evita "dejar puertas abiertas" si pidió varios.
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  await prisma.passwordResetToken.create({
    data: {
      userId:    user.id,
      tokenHash: hash,
      expiresAt,
      requestIp: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
              ?? req.headers.get('x-real-ip')
              ?? null,
    },
  });

  // Construimos el link de reset apuntando al frontend.
  const baseUrl = (await getSetting('FRONTEND_URL', 'http://localhost:5173'))
              ?? 'http://localhost:5173';
  const resetUrl = `${baseUrl.replace(/\/$/, '')}/reset-password?token=${plain}`;

  const firstName = user.profile?.firstName ?? '';
  const greeting  = firstName ? `Hola ${firstName},` : 'Hola,';
  const brand     = (await getSetting('BRAND_NAME', 'MedicGet')) ?? 'MedicGet';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0f172a;">
      <h2 style="color: #0f172a; margin-top: 0;">Recuperar tu contraseña</h2>
      <p>${greeting}</p>
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>${brand}</strong>. Si vos pediste el cambio, hacé clic en el botón:</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}"
           style="display:inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Restablecer contraseña
        </a>
      </p>
      <p style="font-size: 13px; color: #64748b;">
        El enlace expira en ${TOKEN_TTL_MIN} minutos. Si no solicitaste este cambio, ignorá este correo — tu contraseña no se modificará.
      </p>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
        Si el botón no funciona, copiá y pegá esta URL en tu navegador:<br>
        <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
      </p>
    </div>
  `;
  const text = `${greeting}\n\nRecibimos una solicitud para restablecer tu contraseña de ${brand}.\nAbrí este enlace (expira en ${TOKEN_TTL_MIN} min):\n${resetUrl}\n\nSi no fuiste vos, ignorá este correo.`;

  const sendResult = await sendEmail({
    to:      email,
    subject: `Recuperar tu contraseña — ${brand}`,
    html,
    text,
  });

  if (!sendResult.ok) {
    // Si falló el envío, anulamos el token recién creado para no dejar
    // basura en la DB.
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, tokenHash: hash },
    });
    return apiError(
      'BAD_GATEWAY',
      `No pudimos enviar el correo: ${sendResult.error}`,
    );
  }

  return apiOk({ ok: true, message: 'Correo enviado.' });
}
