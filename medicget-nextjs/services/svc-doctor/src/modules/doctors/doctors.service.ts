import type { AuthUser } from '@medicget/shared/auth';
import type { PaginationParams } from '@medicget/shared/paginate';
import { paginate } from '@medicget/shared/paginate';
import { doctorsRepository, type DoctorFilters } from './doctors.repository';
import type { UpdateDoctorInput, AvailabilityInput } from './doctors.schemas';

type ServiceResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

const DAY_OF_WEEK_MAP: Record<number, string> = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
};

function generateTimeSlots(startTime: string, endTime: string, durationMinutes: number): string[] {
  const slots: string[] = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let current = startHour * 60 + startMin;
  const end = endHour * 60 + endMin;

  while (current + durationMinutes <= end) {
    const h = Math.floor(current / 60).toString().padStart(2, '0');
    const m = (current % 60).toString().padStart(2, '0');
    slots.push(`${h}:${m}`);
    current += durationMinutes;
  }

  return slots;
}

export const doctorsService = {
  async list(
    rawFilters: Record<string, string | undefined>,
    pagination: PaginationParams,
  ): Promise<ServiceResult<unknown>> {
    const filters: DoctorFilters = {
      search: rawFilters.search,
      specialty: rawFilters.specialty,
      clinicId: rawFilters.clinicId,
    };

    if (rawFilters.available !== undefined) {
      filters.available = rawFilters.available === 'true';
    }

    const { data, total } = await doctorsRepository.findMany(filters, pagination);
    return { ok: true, data: paginate(data, total, pagination) };
  },

  async getById(id: string): Promise<ServiceResult<unknown>> {
    const doctor = await doctorsRepository.findById(id);
    if (!doctor) {
      return { ok: false, code: 'NOT_FOUND', message: 'Doctor not found' };
    }
    return { ok: true, data: doctor };
  },

  async update(
    id: string,
    input: UpdateDoctorInput,
    user: AuthUser,
  ): Promise<ServiceResult<unknown>> {
    const doctor = await doctorsRepository.findById(id);
    if (!doctor) {
      return { ok: false, code: 'NOT_FOUND', message: 'Doctor not found' };
    }

    if (user.role === 'DOCTOR') {
      const ownDoctor = await doctorsRepository.findByUserId(user.id);
      if (!ownDoctor || ownDoctor.id !== id) {
        return { ok: false, code: 'FORBIDDEN', message: 'You can only update your own profile' };
      }
    } else if (user.role === 'CLINIC') {
      if (doctor.clinicId) {
        const { prisma } = await import('@medicget/shared/prisma');
        const clinic = await prisma.clinic.findFirst({ where: { userId: user.id } });
        if (!clinic || doctor.clinicId !== clinic.id) {
          return {
            ok: false,
            code: 'FORBIDDEN',
            message: 'You can only update doctors in your clinic',
          };
        }
      } else {
        return {
          ok: false,
          code: 'FORBIDDEN',
          message: 'Doctor does not belong to your clinic',
        };
      }
    } else {
      return { ok: false, code: 'FORBIDDEN', message: 'Insufficient permissions' };
    }

    const updated = await doctorsRepository.update(id, input as Record<string, unknown>);
    return { ok: true, data: updated };
  },

  async getAvailability(doctorId: string): Promise<ServiceResult<unknown>> {
    const doctor = await doctorsRepository.findById(doctorId);
    if (!doctor) {
      return { ok: false, code: 'NOT_FOUND', message: 'Doctor not found' };
    }
    const availability = await doctorsRepository.findAvailability(doctorId);
    return { ok: true, data: availability };
  },

  async upsertAvailability(
    doctorId: string,
    input: AvailabilityInput,
    user: AuthUser,
  ): Promise<ServiceResult<unknown>> {
    const doctor = await doctorsRepository.findById(doctorId);
    if (!doctor) {
      return { ok: false, code: 'NOT_FOUND', message: 'Doctor not found' };
    }

    if (user.role === 'DOCTOR') {
      const ownDoctor = await doctorsRepository.findByUserId(user.id);
      if (!ownDoctor || ownDoctor.id !== doctorId) {
        return {
          ok: false,
          code: 'FORBIDDEN',
          message: 'You can only manage your own availability',
        };
      }
    } else if (user.role === 'CLINIC') {
      if (doctor.clinicId) {
        const { prisma } = await import('@medicget/shared/prisma');
        const clinic = await prisma.clinic.findFirst({ where: { userId: user.id } });
        if (!clinic || doctor.clinicId !== clinic.id) {
          return { ok: false, code: 'FORBIDDEN', message: 'Not authorized for this doctor' };
        }
      } else {
        return { ok: false, code: 'FORBIDDEN', message: 'Doctor not in your clinic' };
      }
    } else {
      return { ok: false, code: 'FORBIDDEN', message: 'Insufficient permissions' };
    }

    const result = await doctorsRepository.upsertAvailability(
      doctorId,
      input.dayOfWeek,
      input.startTime,
      input.endTime,
    );
    return { ok: true, data: result };
  },

  async removeAvailability(
    doctorId: string,
    availId: string,
    user: AuthUser,
  ): Promise<ServiceResult<unknown>> {
    const doctor = await doctorsRepository.findById(doctorId);
    if (!doctor) {
      return { ok: false, code: 'NOT_FOUND', message: 'Doctor not found' };
    }

    if (user.role === 'DOCTOR') {
      const ownDoctor = await doctorsRepository.findByUserId(user.id);
      if (!ownDoctor || ownDoctor.id !== doctorId) {
        return { ok: false, code: 'FORBIDDEN', message: 'Not authorized' };
      }
    } else if (user.role === 'CLINIC') {
      if (doctor.clinicId) {
        const { prisma } = await import('@medicget/shared/prisma');
        const clinic = await prisma.clinic.findFirst({ where: { userId: user.id } });
        if (!clinic || doctor.clinicId !== clinic.id) {
          return { ok: false, code: 'FORBIDDEN', message: 'Not authorized for this doctor' };
        }
      } else {
        return { ok: false, code: 'FORBIDDEN', message: 'Doctor not in your clinic' };
      }
    } else {
      return { ok: false, code: 'FORBIDDEN', message: 'Insufficient permissions' };
    }

    await doctorsRepository.deleteAvailability(availId);
    return { ok: true, data: { deleted: true } };
  },

  async getSlots(doctorId: string, dateStr: string): Promise<ServiceResult<unknown>> {
    const doctor = await doctorsRepository.findById(doctorId);
    if (!doctor) {
      return { ok: false, code: 'NOT_FOUND', message: 'Doctor not found' };
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return { ok: false, code: 'BAD_REQUEST', message: 'Invalid date format. Use YYYY-MM-DD' };
    }

    // Normalize to midnight UTC
    const normalizedDate = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );

    const existingSlots = await doctorsRepository.findSlots(doctorId, normalizedDate);
    if (existingSlots.length > 0) {
      return { ok: true, data: existingSlots };
    }

    // Generate slots from availability
    const dayOfWeek = DAY_OF_WEEK_MAP[normalizedDate.getUTCDay()];
    const availability = await doctorsRepository.findAvailability(doctorId);
    const dayAvailability = availability.find(
      (a) => a.dayOfWeek === dayOfWeek && a.isActive,
    );

    if (!dayAvailability) {
      return { ok: true, data: [] };
    }

    const times = generateTimeSlots(
      dayAvailability.startTime,
      dayAvailability.endTime,
      doctor.consultDuration,
    );

    if (times.length === 0) {
      return { ok: true, data: [] };
    }

    const slots = await doctorsRepository.createSlots(doctorId, normalizedDate, times);
    return { ok: true, data: slots };
  },

  async getReviews(
    doctorId: string,
    pagination: PaginationParams,
  ): Promise<ServiceResult<unknown>> {
    const doctor = await doctorsRepository.findById(doctorId);
    if (!doctor) {
      return { ok: false, code: 'NOT_FOUND', message: 'Doctor not found' };
    }
    const { data, total } = await doctorsRepository.findReviews(doctorId, pagination);
    return { ok: true, data: paginate(data, total, pagination) };
  },

  async getDashboard(user: AuthUser): Promise<ServiceResult<unknown>> {
    if (user.role !== 'DOCTOR') {
      return { ok: false, code: 'FORBIDDEN', message: 'Only doctors can access this dashboard' };
    }

    const doctor = await doctorsRepository.findByUserId(user.id);
    if (!doctor) {
      return { ok: false, code: 'NOT_FOUND', message: 'Doctor profile not found' };
    }

    const [stats, schedule] = await Promise.all([
      doctorsRepository.dashboardStats(doctor.id),
      doctorsRepository.todaySchedule(doctor.id),
    ]);

    return { ok: true, data: { stats, todaySchedule: schedule } };
  },
};
