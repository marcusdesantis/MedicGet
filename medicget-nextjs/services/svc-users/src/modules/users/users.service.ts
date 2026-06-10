import type { AuthUser } from '@medicget/shared/auth';
import type { PaginationParams } from '@medicget/shared/paginate';
import { paginate } from '@medicget/shared/paginate';
import * as repo from './users.repository';
import type { UpdateProfileData } from './users.repository';

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

// ─── List users (CLINIC only) ────────────────────────────────────────────────

export async function listUsers(
  caller: AuthUser,
  params: PaginationParams,
  search?: string,
): Promise<ServiceResult<unknown>> {
  if (caller.role !== 'CLINIC') {
    return { ok: false, code: 'FORBIDDEN', message: 'Only clinic accounts can list all users.' };
  }

  const { users, total } = await repo.findMany({ search }, params);
  return { ok: true, data: paginate(users, total, params) };
}

// ─── Get user by id ──────────────────────────────────────────────────────────

export async function getUserById(
  caller: AuthUser,
  targetId: string,
): Promise<ServiceResult<unknown>> {
  const isSelf = caller.id === targetId;
  const isClinic = caller.role === 'CLINIC';

  if (!isSelf && !isClinic) {
    return { ok: false, code: 'FORBIDDEN', message: 'Access denied.' };
  }

  const user = await repo.findById(targetId);
  if (!user || user.status === 'DELETED') {
    return { ok: false, code: 'NOT_FOUND', message: 'User not found.' };
  }

  return { ok: true, data: user };
}

// ─── Soft delete ─────────────────────────────────────────────────────────────

export async function softDeleteUser(
  caller: AuthUser,
  targetId: string,
): Promise<ServiceResult<unknown>> {
  const isSelf = caller.id === targetId;

  // ADMIN nunca puede eliminar su propia cuenta desde la app.
  // CLINIC puede eliminar cuentas de otros (comportamiento original).
  // Cualquier rol puede eliminar la suya propia (excepto ADMIN).
  if (isSelf && caller.role === 'ADMIN') {
    return { ok: false, code: 'FORBIDDEN', message: 'Los administradores no pueden eliminar su cuenta desde la app.' };
  }
  if (!isSelf && caller.role !== 'CLINIC') {
    return { ok: false, code: 'FORBIDDEN', message: 'No tienes permiso para eliminar esta cuenta.' };
  }

  const user = await repo.findById(targetId);
  if (!user || user.status === 'DELETED') {
    return { ok: false, code: 'NOT_FOUND', message: 'Usuario no encontrado.' };
  }

  // Al eliminarse a sí mismo, cancelar citas activas y notificar afectados.
  if (isSelf) {
    const entityId =
      user.role === 'DOCTOR'  ? user.doctor?.id  :
      user.role === 'PATIENT' ? user.patient?.id :
      user.role === 'CLINIC'  ? user.clinic?.id  :
      null;

    if (entityId) {
      await repo.cancelActiveAppointmentsForDeletion(user.role, entityId);
    }
  }

  const updated = await repo.updateStatus(targetId, 'DELETED');
  return { ok: true, data: updated };
}

// ─── Get profile ─────────────────────────────────────────────────────────────

export async function getProfile(
  caller: AuthUser,
  targetId: string,
): Promise<ServiceResult<unknown>> {
  const isSelf = caller.id === targetId;
  const isClinic = caller.role === 'CLINIC';

  if (!isSelf && !isClinic) {
    return { ok: false, code: 'FORBIDDEN', message: 'Access denied.' };
  }

  const user = await repo.findById(targetId);
  if (!user || user.status === 'DELETED') {
    return { ok: false, code: 'NOT_FOUND', message: 'User not found.' };
  }

  const profile = await repo.findProfileByUserId(targetId);
  if (!profile) {
    return { ok: false, code: 'NOT_FOUND', message: 'Profile not found.' };
  }

  return { ok: true, data: profile };
}

// ─── Update profile ──────────────────────────────────────────────────────────

export async function updateProfile(
  caller: AuthUser,
  targetId: string,
  data: UpdateProfileData,
): Promise<ServiceResult<unknown>> {
  const isSelf = caller.id === targetId;
  const isClinic = caller.role === 'CLINIC';

  if (!isSelf && !isClinic) {
    return { ok: false, code: 'FORBIDDEN', message: 'Access denied.' };
  }

  const user = await repo.findById(targetId);
  if (!user || user.status === 'DELETED') {
    return { ok: false, code: 'NOT_FOUND', message: 'User not found.' };
  }

  const profile = await repo.upsertProfile(targetId, data);
  return { ok: true, data: profile };
}

// ─── Patch user (alias for profile update from /users/:id PATCH) ─────────────

export async function patchUser(
  caller: AuthUser,
  targetId: string,
  data: UpdateProfileData,
): Promise<ServiceResult<unknown>> {
  return updateProfile(caller, targetId, data);
}
