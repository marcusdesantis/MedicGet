import type { DoctorAvailability } from '@prisma/client';
import { prisma } from '@medicget/shared/prisma';
import type { PaginationParams } from '@medicget/shared/paginate';
import { toSkipTake } from '@medicget/shared/paginate';

export interface DoctorFilters {
  search?:    string;
  specialty?: string;
  available?: boolean;
  clinicId?:  string;
  /** ONLINE / PRESENCIAL / CHAT — matches if doctor's modalities array contains it. */
  modality?:  string;
  /** Price range filters used by the public directory. */
  priceMin?:  number;
  priceMax?:  number;
  /** Filtros geográficos. Match contra Profile.country/province (médico
   *  independiente) o contra la clínica asociada. */
  country?:   string;
  province?:  string;
}

export const doctorsRepository = {
  async findMany(filters: DoctorFilters, pagination: PaginationParams) {
    const { skip, take } = toSkipTake(pagination);

    const where: Record<string, unknown> = {};

    if (filters.specialty) {
      where.specialty = { contains: filters.specialty, mode: 'insensitive' };
    }
    if (filters.available !== undefined) {
      where.available = filters.available;
    }
    if (filters.clinicId) {
      where.clinicId = filters.clinicId;
    }
    if (filters.modality) {
      where.modalities = { has: filters.modality };
    }
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      const range: Record<string, number> = {};
      if (filters.priceMin !== undefined) range.gte = filters.priceMin;
      if (filters.priceMax !== undefined) range.lte = filters.priceMax;
      where.pricePerConsult = range;
    }
    // Filtro geográfico: match en User.profile o en la clínica asociada.
    // Cualquier match de los dos lados cuenta — un médico que atiende
    // en su consultorio (Profile.country) y también pertenece a una
    // clínica en otra provincia, aparece en ambos filtros.
    if (filters.country || filters.province) {
      const conditions: Record<string, unknown>[] = [];
      const profileMatch: Record<string, unknown> = {};
      if (filters.country)  profileMatch.country  = filters.country;
      if (filters.province) profileMatch.province = filters.province;
      conditions.push({ user: { profile: profileMatch } });
      const clinicMatch: Record<string, unknown> = {};
      if (filters.country)  clinicMatch.country  = filters.country;
      if (filters.province) clinicMatch.province = filters.province;
      conditions.push({ clinic: clinicMatch });
      where.OR = [...((where.OR as unknown[] | undefined) ?? []), ...conditions];
    }
    if (filters.search) {
      where.OR = [
        {
          user: {
            profile: {
              OR: [
                { firstName: { contains: filters.search, mode: 'insensitive' } },
                { lastName: { contains: filters.search, mode: 'insensitive' } },
              ],
            },
          },
        },
        { specialty: { contains: filters.search, mode: 'insensitive' } },
        { bio: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.doctor.findMany({
        where,
        skip,
        take,
        include: {
          user: { include: { profile: true } },
          clinic: true,
        },
        orderBy: { rating: 'desc' },
      }),
      prisma.doctor.count({ where }),
    ]);

    return { data, total };
  },

  async findById(id: string) {
    return prisma.doctor.findUnique({
      where: { id },
      include: {
        user: { include: { profile: true } },
        clinic: true,
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          where: { isPublic: true },
        },
        _count: { select: { appointments: true } },
      },
    });
  },

  async findByUserId(userId: string) {
    return prisma.doctor.findFirst({ where: { userId } });
  },

  async update(id: string, data: Record<string, unknown>) {
    return prisma.doctor.update({ where: { id }, data });
  },

  // Tipo de retorno explícito: previene que el callsite reciba un `any`
  // bajo TS strict cuando llama a `.find((a) => ...)` o `.map((a) => ...)`.
  // Sin la anotación, Next.js build a veces no logra inferir el tipo a
  // través del Promise + chain de Prisma y falla con noImplicitAny.
  async findAvailability(doctorId: string): Promise<DoctorAvailability[]> {
    return prisma.doctorAvailability.findMany({
      where: { doctorId },
      orderBy: { dayOfWeek: 'asc' },
    });
  },

  async upsertAvailability(
    doctorId: string,
    dayOfWeek: string,
    startTime: string,
    endTime: string,
  ) {
    return prisma.doctorAvailability.upsert({
      where: { doctorId_dayOfWeek: { doctorId, dayOfWeek: dayOfWeek as never } },
      update: { startTime, endTime, isActive: true },
      create: { doctorId, dayOfWeek: dayOfWeek as never, startTime, endTime, isActive: true },
    });
  },

  async deleteAvailability(availId: string) {
    return prisma.doctorAvailability.delete({ where: { id: availId } });
  },

  async findSlots(doctorId: string, date: Date) {
    return prisma.appointmentSlot.findMany({
      where: { doctorId, date },
      orderBy: { time: 'asc' },
    });
  },

  async createSlots(doctorId: string, date: Date, times: string[]) {
    await prisma.appointmentSlot.createMany({
      data: times.map((time) => ({ doctorId, date, time, isBooked: false })),
      skipDuplicates: true,
    });
    return prisma.appointmentSlot.findMany({
      where: { doctorId, date },
      orderBy: { time: 'asc' },
    });
  },

  async dashboardStats(doctorId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const weekStart = new Date(todayStart.getTime() - todayStart.getDay() * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [todayCount, weekCount, pending, completed] = await Promise.all([
      prisma.appointment.count({
        where: { doctorId, date: { gte: todayStart, lt: todayEnd } },
      }),
      prisma.appointment.count({
        where: { doctorId, date: { gte: weekStart, lt: weekEnd } },
      }),
      prisma.appointment.count({
        where: { doctorId, status: 'PENDING' },
      }),
      prisma.appointment.count({
        where: { doctorId, status: 'COMPLETED' },
      }),
    ]);

    return { todayCount, weekCount, pending, completed };
  },

  async todaySchedule(doctorId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    return prisma.appointment.findMany({
      where: { doctorId, date: { gte: todayStart, lt: todayEnd } },
      include: {
        patient: { include: { user: { include: { profile: true } } } },
      },
      orderBy: { time: 'asc' },
    });
  },

  async findReviews(doctorId: string, pagination: PaginationParams) {
    const { skip, take } = toSkipTake(pagination);
    const where = { doctorId, isPublic: true };

    const [data, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { include: { user: { include: { profile: true } } } },
        },
      }),
      prisma.review.count({ where }),
    ]);

    return { data, total };
  },
};
