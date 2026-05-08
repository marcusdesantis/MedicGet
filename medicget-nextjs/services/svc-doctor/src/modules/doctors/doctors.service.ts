import type { AuthUser } from '@medicget/shared/auth';
import type { PaginationParams } from '@medicget/shared/paginate';
import { paginate } from '@medicget/shared/paginate';
import { getAllowedModalities, intersectModalities } from '@medicget/shared/subscription';
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

/**
 * Strip email + passwordHash from the embedded User before sending to
 * any consumer. The directory is browseable anonymously from the
 * landing page; never leak personal contact data.
 */
function sanitize<T extends { user?: { email?: unknown; passwordHash?: unknown } }>(d: T): T {
  if (d?.user) {
    const { email: _e, passwordHash: _p, ...safeUser } = d.user as Record<string, unknown>;
    return { ...d, user: safeUser } as T;
  }
  return d;
}

/**
 * Mete a cada doctor del array sus modalidades EFECTIVAS — la
 * intersección entre `doctor.modalities` (lo que él eligió ofrecer) y
 * los módulos permitidos por su plan ACTIVO. Esto cierra el loophole
 * por el que un médico FREE seguía mostrando PRESENCIAL/CHAT después de
 * downgradearse.
 *
 * Hace una sola query a Subscription por todos los userIds, así no
 * disparamos N+1 al listar.
 */
async function applyPlanGating<T extends { id: string; userId: string; modalities: string[] }>(
  doctors: T[],
): Promise<T[]> {
  if (doctors.length === 0) return doctors;
  const { prisma } = await import('@medicget/shared/prisma');
  const subs = await prisma.subscription.findMany({
    where:   { userId: { in: doctors.map((d) => d.userId) }, status: 'ACTIVE' },
    include: { plan: true },
    orderBy: { expiresAt: 'desc' },
  });
  // Map userId → plan.modules. El primer match (más reciente) gana.
  const map = new Map<string, string[]>();
  for (const s of subs) if (!map.has(s.userId)) map.set(s.userId, s.plan.modules);

  return doctors.map((d) => ({
    ...d,
    modalities: intersectModalities(d.modalities, map.get(d.userId) ?? ['ONLINE']),
  }));
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

    // Optional public filters
    if (rawFilters.modality)  filters.modality   = rawFilters.modality;
    if (rawFilters.priceMin)  filters.priceMin   = Number(rawFilters.priceMin);
    if (rawFilters.priceMax)  filters.priceMax   = Number(rawFilters.priceMax);
    if (rawFilters.country)   filters.country    = rawFilters.country;
    if (rawFilters.province)  filters.province   = rawFilters.province;

    const { data, total } = await doctorsRepository.findMany(filters, pagination);
    const gated = await applyPlanGating(data as Array<typeof data[number] & { userId: string }>);
    return { ok: true, data: paginate(gated.map(sanitize), total, pagination) };
  },

  async getById(id: string): Promise<ServiceResult<unknown>> {
    const doctor = await doctorsRepository.findById(id);
    if (!doctor) {
      return { ok: false, code: 'NOT_FOUND', message: 'Doctor not found' };
    }
    const [gated] = await applyPlanGating([doctor as typeof doctor & { userId: string }]);
    return { ok: true, data: sanitize(gated ?? doctor) };
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
      const { prisma } = await import('@medicget/shared/prisma');
      const clinic = await prisma.clinic.findFirst({ where: { userId: user.id } });
      if (!clinic) {
        return { ok: false, code: 'FORBIDDEN', message: 'No se encontró tu perfil de clínica.' };
      }
      // Reglas de autorización para una clínica que actualiza un médico:
      //   • Independiente (sin clinicId) → la clínica puede ASOCIARLO
      //   • Ya en MI clínica              → puede editar / despedir
      //   • En OTRA clínica               → bloqueado (no se roban médicos)
      if (doctor.clinicId && doctor.clinicId !== clinic.id) {
        return {
          ok: false,
          code: 'FORBIDDEN',
          message: 'Este médico está asociado a otra clínica. Pídele que se desvincule primero.',
        };
      }
    } else {
      return { ok: false, code: 'FORBIDDEN', message: 'Insufficient permissions' };
    }

    // Si el body trae `modalities`, la sanitizamos contra el plan del
    // médico para que no pueda guardar PRESENCIAL/CHAT estando en FREE.
    const sanitizedInput = { ...input } as Record<string, unknown>;
    if (Array.isArray((input as { modalities?: string[] }).modalities)) {
      const allowed = await getAllowedModalities(doctor.userId);
      const requested = (input as { modalities: string[] }).modalities;
      sanitizedInput['modalities'] = requested.filter((m) => allowed.includes(m as 'ONLINE' | 'PRESENCIAL' | 'CHAT'));
      // Defensa contra "se quedaron sin ninguna modalidad". Si el
      // recorte deja vacío, forzamos al menos ONLINE para no romper el
      // perfil — ONLINE está en todos los planes.
      if ((sanitizedInput['modalities'] as string[]).length === 0) {
        sanitizedInput['modalities'] = ['ONLINE'];
      }
    }

    const updated = await doctorsRepository.update(id, sanitizedInput);
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
