import { AuthUser }        from '@medicget/shared/auth';
import { doctorsRepository, UpdateDoctorInput } from './doctors.repository';
import { PaginationParams, paginate }            from '@/lib/paginate';

export type ServiceResult<T> =
  | { ok: true;  data: T }
  | { ok: false; code: string; message: string };

export const doctorsService = {
  async list(rawFilters: Record<string, string | undefined>, pagination: PaginationParams) {
    const filters = {
      specialty: rawFilters.specialty ?? undefined,
      available: rawFilters.available === 'true' ? true : rawFilters.available === 'false' ? false : undefined,
      clinicId:  rawFilters.clinicId  ?? undefined,
      search:    rawFilters.search    ?? undefined,
    };
    const { data, total } = await doctorsRepository.findMany(filters, pagination);
    return { ok: true as const, data: paginate(data, total, pagination) };
  },

  async getById(id: string): Promise<ServiceResult<object>> {
    const doctor = await doctorsRepository.findById(id);
    if (!doctor) return { ok: false, code: 'NOT_FOUND', message: 'Doctor not found' };
    return { ok: true, data: doctor };
  },

  async update(id: string, input: UpdateDoctorInput, user: AuthUser): Promise<ServiceResult<object>> {
    const doctor = await doctorsRepository.findById(id);
    if (!doctor) return { ok: false, code: 'NOT_FOUND', message: 'Doctor not found' };

    if (user.role === 'DOCTOR' && doctor.userId !== user.id) {
      return { ok: false, code: 'FORBIDDEN', message: 'You can only update your own profile' };
    }
    if (user.role === 'PATIENT') {
      return { ok: false, code: 'FORBIDDEN', message: 'Patients cannot update doctor profiles' };
    }

    const updated = await doctorsRepository.update(id, input);
    return { ok: true, data: updated };
  },

  async dashboard(user: AuthUser): Promise<ServiceResult<object>> {
    if (user.role !== 'DOCTOR') {
      return { ok: false, code: 'FORBIDDEN', message: 'Doctor role required' };
    }
    const doctor = await doctorsRepository.findByUserId(user.id);
    if (!doctor) return { ok: false, code: 'NOT_FOUND', message: 'Doctor profile not found' };

    const [todaySchedule, stats] = await Promise.all([
      doctorsRepository.todaySchedule(doctor.id),
      doctorsRepository.dashboardStats(doctor.id),
    ]);

    return {
      ok: true,
      data: {
        doctor,
        stats,
        todaySchedule,
      },
    };
  },
};
