import type { Patient } from '@prisma/client';
import type { AuthUser } from '@medicget/shared/auth';
import type { PaginationParams } from '@medicget/shared/paginate';
import { paginate } from '@medicget/shared/paginate';
import { patientsRepository, type PatientFilters } from './patients.repository';
import type { UpdatePatientInput } from './patients.schemas';

type ServiceResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

export const patientsService = {
  async list(
    rawFilters: Record<string, string | undefined>,
    pagination: PaginationParams,
    user: AuthUser,
  ): Promise<ServiceResult<unknown>> {
    if (user.role === 'PATIENT') {
      const patient = await patientsRepository.findByUserId(user.id);
      if (!patient) {
        return { ok: false, code: 'NOT_FOUND', message: 'Patient profile not found' };
      }
      const { data, total } = await patientsRepository.findMany(
        { search: rawFilters.search },
        { ...pagination },
      );
      // Return only own record for patients
      return {
        ok: true,
        data: paginate(
          data.filter((p: Patient) => p.id === patient.id),
          1,
          pagination,
        ),
      };
    }

    if (user.role !== 'CLINIC' && user.role !== 'DOCTOR') {
      return { ok: false, code: 'FORBIDDEN', message: 'Insufficient permissions' };
    }

    const filters: PatientFilters = {
      search: rawFilters.search,
      clinicId: rawFilters.clinicId,
    };

    const { data, total } = await patientsRepository.findMany(filters, pagination);
    return { ok: true, data: paginate(data, total, pagination) };
  },

  async getById(id: string, user: AuthUser): Promise<ServiceResult<unknown>> {
    if (user.role === 'PATIENT') {
      const ownPatient = await patientsRepository.findByUserId(user.id);
      if (!ownPatient || ownPatient.id !== id) {
        return { ok: false, code: 'FORBIDDEN', message: 'You can only view your own profile' };
      }
    } else if (user.role !== 'CLINIC' && user.role !== 'DOCTOR') {
      return { ok: false, code: 'FORBIDDEN', message: 'Insufficient permissions' };
    }

    const patient = await patientsRepository.findById(id);
    if (!patient) {
      return { ok: false, code: 'NOT_FOUND', message: 'Patient not found' };
    }
    return { ok: true, data: patient };
  },

  async update(
    id: string,
    input: UpdatePatientInput,
    user: AuthUser,
  ): Promise<ServiceResult<unknown>> {
    if (user.role === 'PATIENT') {
      const ownPatient = await patientsRepository.findByUserId(user.id);
      if (!ownPatient || ownPatient.id !== id) {
        return {
          ok: false,
          code: 'FORBIDDEN',
          message: 'You can only update your own profile',
        };
      }
    } else if (user.role === 'CLINIC') {
      // CLINIC can update any patient
    } else {
      return { ok: false, code: 'FORBIDDEN', message: 'Insufficient permissions' };
    }

    const patient = await patientsRepository.findById(id);
    if (!patient) {
      return { ok: false, code: 'NOT_FOUND', message: 'Patient not found' };
    }

    const updateData: Record<string, unknown> = {};
    if (input.dateOfBirth !== undefined) updateData.dateOfBirth = new Date(input.dateOfBirth);
    if (input.bloodType   !== undefined) updateData.bloodType   = input.bloodType;
    if (input.allergies   !== undefined) updateData.allergies   = input.allergies;
    if (input.conditions  !== undefined) updateData.conditions  = input.conditions;
    if (input.medications !== undefined) updateData.medications = input.medications;
    if (input.notes       !== undefined) updateData.notes       = input.notes;

    const updated = await patientsRepository.update(id, updateData);
    return { ok: true, data: updated };
  },

  async getAppointments(
    id: string,
    pagination: PaginationParams,
    user: AuthUser,
  ): Promise<ServiceResult<unknown>> {
    if (user.role === 'PATIENT') {
      const ownPatient = await patientsRepository.findByUserId(user.id);
      if (!ownPatient || ownPatient.id !== id) {
        return {
          ok: false,
          code: 'FORBIDDEN',
          message: 'You can only view your own appointments',
        };
      }
    } else if (user.role !== 'CLINIC' && user.role !== 'DOCTOR') {
      return { ok: false, code: 'FORBIDDEN', message: 'Insufficient permissions' };
    }

    const patient = await patientsRepository.findById(id);
    if (!patient) {
      return { ok: false, code: 'NOT_FOUND', message: 'Patient not found' };
    }

    const { data, total } = await patientsRepository.findAppointments(id, pagination);
    return { ok: true, data: paginate(data, total, pagination) };
  },

  async getDashboard(user: AuthUser): Promise<ServiceResult<unknown>> {
    if (user.role !== 'PATIENT') {
      return { ok: false, code: 'FORBIDDEN', message: 'Only patients can access this dashboard' };
    }

    const patient = await patientsRepository.findByUserId(user.id);
    if (!patient) {
      return { ok: false, code: 'NOT_FOUND', message: 'Patient profile not found' };
    }

    const [stats, recentHistory] = await Promise.all([
      patientsRepository.dashboardStats(patient.id),
      patientsRepository.findRecentAppointments(patient.id, 5),
    ]);

    return { ok: true, data: { stats, recentHistory } };
  },

  async getNotifications(
    id: string,
    pagination: PaginationParams,
    user: AuthUser,
  ): Promise<ServiceResult<unknown>> {
    const patient = await patientsRepository.findById(id);
    if (!patient) {
      return { ok: false, code: 'NOT_FOUND', message: 'Patient not found' };
    }

    if (patient.userId !== user.id) {
      return { ok: false, code: 'FORBIDDEN', message: 'You can only view your own notifications' };
    }

    const { data, total } = await patientsRepository.findNotifications(patient.userId, pagination);
    return { ok: true, data: paginate(data, total, pagination) };
  },

  async markNotifRead(
    patientId: string,
    notifId: string,
    user: AuthUser,
  ): Promise<ServiceResult<unknown>> {
    const patient = await patientsRepository.findById(patientId);
    if (!patient) {
      return { ok: false, code: 'NOT_FOUND', message: 'Patient not found' };
    }

    if (patient.userId !== user.id) {
      return {
        ok: false,
        code: 'FORBIDDEN',
        message: 'You can only manage your own notifications',
      };
    }

    const updated = await patientsRepository.markNotificationRead(notifId);
    return { ok: true, data: updated };
  },
};
