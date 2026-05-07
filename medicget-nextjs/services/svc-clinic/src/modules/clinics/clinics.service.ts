import bcrypt from 'bcryptjs';
import type { AuthUser } from '@medicget/shared/auth';
import type { PaginationParams } from '@medicget/shared/paginate';
import { paginate } from '@medicget/shared/paginate';
import { sendEmail } from '@medicget/shared/email';
import { ensureFreeSubscription } from '@medicget/shared/subscription';
import * as repo from './clinics.repository';
import type { CreateClinicData, UpdateClinicData } from './clinics.repository';

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

export interface CreateDoctorForClinicInput {
  email:           string;
  firstName:       string;
  lastName:        string;
  phone?:          string;
  specialty:       string;
  licenseNumber?:  string;
  experience?:     number;
  pricePerConsult?: number;
  bio?:            string;
  consultDuration?: number;
  languages?:      string[];
}

// ─── List clinics (public) ────────────────────────────────────────────────────

export async function listClinics(
  params: PaginationParams,
  search?: string,
): Promise<ServiceResult<unknown>> {
  const { clinics, total } = await repo.findMany({ search }, params);
  return { ok: true, data: paginate(clinics, total, params) };
}

// ─── Create clinic ────────────────────────────────────────────────────────────

export async function createClinic(
  caller: AuthUser,
  data: Omit<CreateClinicData, 'userId'>,
): Promise<ServiceResult<unknown>> {
  if (caller.role !== 'CLINIC') {
    return { ok: false, code: 'FORBIDDEN', message: 'Only clinic accounts can create a clinic.' };
  }

  // Prevent creating duplicate clinic for same user
  const existing = await repo.findByUserId(caller.id);
  if (existing) {
    return { ok: false, code: 'CONFLICT', message: 'A clinic already exists for this account.' };
  }

  const clinic = await repo.create({ ...data, userId: caller.id });
  return { ok: true, data: clinic };
}

// ─── Get clinic by id ─────────────────────────────────────────────────────────

export async function getClinicById(id: string): Promise<ServiceResult<unknown>> {
  const clinic = await repo.findById(id);

  if (!clinic || clinic.status === 'DELETED') {
    return { ok: false, code: 'NOT_FOUND', message: 'Clinic not found.' };
  }

  return { ok: true, data: clinic };
}

// ─── Update clinic ────────────────────────────────────────────────────────────

export async function updateClinic(
  caller: AuthUser,
  clinicId: string,
  data: UpdateClinicData,
): Promise<ServiceResult<unknown>> {
  if (caller.role !== 'CLINIC') {
    return { ok: false, code: 'FORBIDDEN', message: 'Only clinic accounts can update clinics.' };
  }

  const clinic = await repo.findById(clinicId);
  if (!clinic || clinic.status === 'DELETED') {
    return { ok: false, code: 'NOT_FOUND', message: 'Clinic not found.' };
  }

  if (clinic.userId !== caller.id) {
    return { ok: false, code: 'FORBIDDEN', message: 'You can only update your own clinic.' };
  }

  const updated = await repo.update(clinicId, data);
  return { ok: true, data: updated };
}

// ─── Soft delete clinic ───────────────────────────────────────────────────────

export async function deleteClinic(
  caller: AuthUser,
  clinicId: string,
): Promise<ServiceResult<unknown>> {
  if (caller.role !== 'CLINIC') {
    return { ok: false, code: 'FORBIDDEN', message: 'Only clinic accounts can delete clinics.' };
  }

  const clinic = await repo.findById(clinicId);
  if (!clinic || clinic.status === 'DELETED') {
    return { ok: false, code: 'NOT_FOUND', message: 'Clinic not found.' };
  }

  if (clinic.userId !== caller.id) {
    return { ok: false, code: 'FORBIDDEN', message: 'You can only delete your own clinic.' };
  }

  const deleted = await repo.softDelete(clinicId);
  return { ok: true, data: deleted };
}

// ─── List doctors for a clinic ────────────────────────────────────────────────

export async function listClinicDoctors(
  clinicId: string,
  params: PaginationParams,
): Promise<ServiceResult<unknown>> {
  const clinic = await repo.findById(clinicId);
  if (!clinic || clinic.status === 'DELETED') {
    return { ok: false, code: 'NOT_FOUND', message: 'Clinic not found.' };
  }

  const { doctors, total } = await repo.findDoctors(clinicId, params);
  return { ok: true, data: paginate(doctors, total, params) };
}

// ─── Create doctor manually under a clinic ─────────────────────────────────────
//
// Creates the User + Profile + Doctor in a single transaction with a
// random temporary password. The clinic admin gets the password back in
// the response so they can hand it to the doctor — and we ALSO email it
// to the doctor's address (best-effort).
//
// The doctor can change the password later from their profile.

function generateTempPassword(length = 10): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function createDoctorForClinic(
  caller:   AuthUser,
  clinicId: string,
  input:    CreateDoctorForClinicInput,
): Promise<ServiceResult<unknown>> {
  if (caller.role !== 'CLINIC') {
    return { ok: false, code: 'FORBIDDEN', message: 'Sólo cuentas de clínica pueden crear médicos.' };
  }

  const clinic = await repo.findById(clinicId);
  if (!clinic || clinic.status === 'DELETED') {
    return { ok: false, code: 'NOT_FOUND', message: 'Clínica no encontrada.' };
  }
  if (clinic.userId !== caller.id) {
    return { ok: false, code: 'FORBIDDEN', message: 'Esta clínica no te pertenece.' };
  }

  const { prisma } = await import('@medicget/shared/prisma');

  // Email collision check — User.email is unique
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    return {
      ok:    false,
      code:  'CONFLICT',
      message: 'Ya existe una cuenta con ese email. Pedile al médico que se desvincule de su cuenta y volvé a intentar.',
    };
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email:        input.email,
        passwordHash,
        role:         'DOCTOR',
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
    const doctor = await tx.doctor.create({
      data: {
        userId:          user.id,
        clinicId,
        specialty:       input.specialty,
        licenseNumber:   input.licenseNumber,
        experience:      input.experience      ?? 0,
        pricePerConsult: input.pricePerConsult ?? 0,
        bio:             input.bio,
        consultDuration: input.consultDuration ?? 30,
        languages:       input.languages       ?? [],
        modalities:      ['ONLINE'],
        available:       true,
      },
      include: {
        user: { include: { profile: true } },
        clinic: true,
      },
    });
    return doctor;
  });

  // Asignar plan FREE al médico recién creado.
  await ensureFreeSubscription(created.userId, 'DOCTOR').catch(() => {/* swallow */});

  // Best-effort welcome email with credentials. The clinic admin also
  // sees them in the response, so this is just a convenience for the
  // doctor — failure here doesn't fail the operation.
  void sendEmail({
    to:      input.email,
    subject: `Bienvenido a MedicGet — ${clinic.name}`,
    html: `
      <!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;margin:0;padding:24px">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0">
          <h1 style="font-size:22px;color:#0f172a;margin:0 0 8px">¡Bienvenido, Dr. ${input.firstName} ${input.lastName}!</h1>
          <p style="font-size:15px;color:#475569;margin:0 0 16px">
            <strong>${clinic.name}</strong> te dio de alta en MedicGet. Ya podés acceder al panel y configurar tu perfil profesional.
          </p>
          <div style="background:#dbeafe;border-radius:12px;padding:16px;margin:16px 0">
            <p style="margin:0 0 4px;font-size:13px;color:#1e40af;font-weight:600">Credenciales temporales</p>
            <p style="margin:0;font-size:14px;color:#0f172a"><strong>Email:</strong> ${input.email}</p>
            <p style="margin:0;font-size:14px;color:#0f172a"><strong>Contraseña:</strong> <code style="background:#fff;padding:2px 6px;border-radius:4px">${tempPassword}</code></p>
          </div>
          <p style="font-size:13px;color:#64748b;margin:16px 0 0">
            Por seguridad, te recomendamos cambiar la contraseña en cuanto inicies sesión.
          </p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
          <p style="font-size:11px;color:#94a3b8;margin:0">
            Si no esperabas este correo, ignoralo. MedicGet · Este correo es automático.
          </p>
        </div>
      </body></html>`,
    text: `Bienvenido Dr. ${input.firstName} ${input.lastName}.\n${clinic.name} te dio de alta en MedicGet.\n\nEmail: ${input.email}\nContraseña: ${tempPassword}\n\nPor seguridad, cambiala al iniciar sesión.`,
  }).catch(() => { /* swallow */ });

  return {
    ok:   true,
    data: {
      doctor:        created,
      tempPassword,
    },
  };
}
