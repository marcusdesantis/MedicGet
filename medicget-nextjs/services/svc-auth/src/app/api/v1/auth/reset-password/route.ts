import { NextRequest } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { apiOk, apiError } from '@medicget/shared/response';
import { prisma }          from '@medicget/shared/prisma';
import { parseBody }       from '@/lib/validate';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/auth/reset-password
 *
 * Consume un token generado por /auth/forgot-password y reemplaza la
 * contraseña del usuario. Validaciones:
 *  - Token presente y no vacío.
 *  - Token existe en DB, no usado, no expirado.
 *  - Nueva contraseña >= 6 caracteres (mismo mínimo del registro).
 *
 * Es idempotente respecto a usos previos: si el token ya fue consumido
 * devuelve `INVALID_TOKEN` claramente para que el frontend muestre
 * "Este link ya fue usado, pedí uno nuevo".
 */
const schema = z.object({
  token:    z.string().min(1, 'Token requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, schema);
  if ('error' in parsed) return parsed.error;

  const tokenHash = crypto
    .createHash('sha256')
    .update(parsed.data.token)
    .digest('hex');

  const record = await prisma.passwordResetToken.findUnique({
    where:   { tokenHash },
    include: { user: true },
  });

  if (!record) {
    return apiError(
      'INVALID_TOKEN',
      'Este enlace no es válido. Pedí uno nuevo desde "Recuperar contraseña".',
    );
  }
  if (record.usedAt) {
    return apiError(
      'INVALID_TOKEN',
      'Este enlace ya fue usado. Pedí uno nuevo si necesitás cambiar la contraseña otra vez.',
    );
  }
  if (record.expiresAt.getTime() < Date.now()) {
    return apiError(
      'INVALID_TOKEN',
      'Este enlace expiró. Pedí uno nuevo desde "Recuperar contraseña".',
    );
  }
  if (!record.user || record.user.status !== 'ACTIVE') {
    return apiError(
      'INVALID_TOKEN',
      'La cuenta asociada ya no está activa.',
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  // Update password + mark token as used + invalidate ANY other open token
  // del mismo usuario en una sola transacción.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data:  { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data:  { usedAt: new Date() },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId, usedAt: null, id: { not: record.id } },
    }),
  ]);

  return apiOk({ ok: true, message: 'Contraseña actualizada.' });
}
