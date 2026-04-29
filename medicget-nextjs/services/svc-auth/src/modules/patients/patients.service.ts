import { AuthUser }         from '@medicget/shared/auth';
import { patientsRepository } from './patients.repository';
import { PaginationParams, paginate } from '@/lib/paginate';

export type ServiceResult<T> =
  | { ok: true;  data: T }
  | { ok: false; code: string; message: string };

export const patientsService = {
  async list(rawFilters: Record<string, string | undefined>, pagination: PaginationParams, user: AuthUser) {
    // Patients can only see themselves; clinic/doctor can see all
    if (user.role === 'PATIENT') {
      const patient = await patientsRepository.findByUserId(user.id);
      if (!patient) return { ok: false as const, code: 'NOT_FOUND', message: 'Patient profile not found' };
      return { ok: true as const, data: paginate([patient], 1, pagination) };
    }

    const filters = {
      search:   rawFilters.search   ?? undefined,
      clinicId: rawFilters.clinicId ?? undefined,
    };
    const { data, total } = await patientsRepository.findMany(filters, pagination);
    return { ok: true as const, data: paginate(data, total, pagination) };
  },

  async getById(id: string, user: AuthUser): Promise<ServiceResult<object>> {
    const patient = await patientsRepository.findById(id);
    if (!patient) return { ok: false, code: 'NOT_FOUND', message: 'Patient not found' };

    if (user.role === 'PATIENT' && patient.userId !== user.id) {
      return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
    }
    return { ok: true, data: patient };
  },

  async dashboard(user: AuthUser): Promise<ServiceResult<object>> {
    if (user.role !== 'PATIENT') {
      return { ok: false, code: 'FORBIDDEN', message: 'Patient role required' };
    }
    const patient = await patientsRepository.findByUserId(user.id);
    if (!patient) return { ok: false, code: 'NOT_FOUND', message: 'Patient profile not found' };

    const stats = await patientsRepository.dashboardStats(patient.id);
    return { ok: true, data: { patient, stats } };
  },
};
