import { NextRequest } from 'next/server';
import { withRole } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { parseBody } from '@medicget/shared/validate';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@medicget/shared/prisma';
import { ensureFreeSubscription } from '@medicget/shared/subscription';
import { sendEmail } from '@medicget/shared/email';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/admin/users/create
 *
 * Permite al superadmin crear cuentas de cualquier rol manualmente. Genera
 * una contraseña temporal random, la manda por email y la devuelve en la
 * response. Para DOCTOR/CLINIC además asigna el plan FREE automáticamente.
 */

const createSchema = z.object({
  email:     z.string().email(),
  firstName: z.string().min(1).max(80),
  lastName:  z.string().min(1).max(80),
  phone:     z.string().max(40).optional(),
  role:      z.enum(['PATIENT', 'DOCTOR', 'CLINIC', 'ADMIN']),
  // role-specific extras
  clinicName: z.string().max(120).optional(),
  specialty:  z.string().max(120).optional(),
});

function generateTempPassword(length = 10): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export const POST = withRole(['ADMIN'], async (req: NextRequest) => {
  const parsed = await parseBody(req, createSchema);
  if ('error' in parsed) return parsed.error;
  const input = parsed.data;

  // Validar role-specific
  if (input.role === 'CLINIC' && !input.clinicName) {
    return apiError('BAD_REQUEST', 'Las cuentas de clínica requieren un nombre comercial.');
  }
  if (input.role === 'DOCTOR' && !input.specialty) {
    return apiError('BAD_REQUEST', 'Las cuentas de médico requieren una especialidad.');
  }

  // Email collision
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) return apiError('CONFLICT', 'Ya existe una cuenta con ese email.');

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email:        input.email,
        passwordHash,
        role:         input.role,
        status:       'ACTIVE',
        profile: {
          create: {
            firstName: input.firstName,
            lastName:  input.lastName,
            phone:     input.phone,
          },
        },
      },
    });
    if (input.role === 'PATIENT') {
      await tx.patient.create({ data: { userId: u.id } });
    } else if (input.role === 'CLINIC') {
      await tx.clinic.create({ data: { userId: u.id, name: input.clinicName! } });
    } else if (input.role === 'DOCTOR') {
      await tx.doctor.create({
        data: {
          userId:     u.id,
          specialty:  input.specialty!,
          modalities: ['ONLINE'],
          available:  true,
        },
      });
    }
    return u;
  });

  // Plan FREE auto-asignado
  if (input.role === 'DOCTOR' || input.role === 'CLINIC') {
    await ensureFreeSubscription(user.id, input.role).catch(() => {/* swallow */});
  }

  // Email de bienvenida con credenciales
  void sendEmail({
    to:      input.email,
    subject: 'Tu cuenta en MedicGet está lista',
    html: `
      <!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;margin:0;padding:24px">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0">
          <h1 style="font-size:22px;color:#0f172a;margin:0 0 8px">Bienvenido, ${input.firstName}</h1>
          <p style="font-size:15px;color:#475569;margin:0 0 16px">
            El equipo de MedicGet te dio de alta. Ya podés acceder con estas credenciales:
          </p>
          <div style="background:#dbeafe;border-radius:12px;padding:16px;margin:16px 0">
            <p style="margin:0;font-size:14px;color:#0f172a"><strong>Email:</strong> ${input.email}</p>
            <p style="margin:0;font-size:14px;color:#0f172a"><strong>Contraseña:</strong> <code style="background:#fff;padding:2px 6px;border-radius:4px">${tempPassword}</code></p>
          </div>
          <p style="font-size:13px;color:#64748b">Por seguridad, cambiá la contraseña al iniciar sesión.</p>
        </div>
      </body></html>`,
    text: `Bienvenido ${input.firstName}.\nEmail: ${input.email}\nContraseña: ${tempPassword}\nCambiá la contraseña al iniciar sesión.`,
  }).catch(() => {/* swallow */});

  return apiOk({ user, tempPassword }, 'Usuario creado', { status: 201 });
});
