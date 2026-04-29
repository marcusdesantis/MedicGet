import type { AuthUser } from '@medicget/shared/auth';
import type { PaginationParams } from '@medicget/shared/paginate';
import { paginate } from '@medicget/shared/paginate';
import * as repo from './clinics.repository';
import type { CreateClinicData, UpdateClinicData } from './clinics.repository';

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

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
