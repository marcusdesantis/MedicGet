import { prisma }            from '@medicget/shared/prisma';
import { PaginationParams, toSkipTake } from '@/lib/paginate';

export interface DoctorFilters {
  specialty?:  string;
  available?:  boolean;
  clinicId?:   string;
  search?:     string;
}

export interface UpdateDoctorInput {
  specialty?:       string;
  experience?:      number;
  pricePerConsult?: number;
  bio?:             string;
  consultDuration?: number;
  languages?:       string[];
  available?:       boolean;
}

const INCLUDE = {
  user:    { include: { profile: true } },
  clinic:  true,
} as const;

export const doctorsRepository = {
  async findMany(filters: DoctorFilters, pagination: PaginationParams) {
    const where = buildWhere(filters);
    const [data, total] = await Promise.all([
      prisma.doctor.findMany({
        where,
        include: INCLUDE,
        orderBy: { rating: 'desc' },
        ...toSkipTake(pagination),
      }),
      prisma.doctor.count({ where }),
    ]);
    return { data, total };
  },

  async findById(id: string) {
    return prisma.doctor.findUnique({ where: { id }, include: INCLUDE });
  },

  async findByUserId(userId: string) {
    return prisma.doctor.findFirst({
      where:   { userId },
      include: { ...INCLUDE, appointments: { orderBy: { date: 'desc' }, take: 10 } },
    });
  },

  async update(id: string, input: UpdateDoctorInput) {
    return prisma.doctor.update({ where: { id }, data: input, include: INCLUDE });
  },

  async todaySchedule(doctorId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return prisma.appointment.findMany({
      where: {
        doctorId,
        date: { gte: today, lt: tomorrow },
        status: { notIn: ['CANCELLED'] },
      },
      include: { patient: { include: { user: { include: { profile: true } } } } },
      orderBy: { time: 'asc' },
    });
  },

  async dashboardStats(doctorId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const [todayCount, weekCount, pendingCount, completedCount] = await Promise.all([
      prisma.appointment.count({
        where: { doctorId, date: { gte: today, lt: tomorrow }, status: { notIn: ['CANCELLED'] } },
      }),
      prisma.appointment.count({
        where: { doctorId, date: { gte: weekStart }, status: { notIn: ['CANCELLED'] } },
      }),
      prisma.appointment.count({
        where: { doctorId, status: 'PENDING' },
      }),
      prisma.appointment.count({
        where: { doctorId, status: 'COMPLETED' },
      }),
    ]);

    return { todayCount, weekCount, pendingCount, completedCount };
  },
};

function buildWhere(f: DoctorFilters) {
  const where: Record<string, unknown> = {
    user: { status: { not: 'DELETED' } },
  };
  if (f.specialty !== undefined) where.specialty = f.specialty;
  if (f.available !== undefined) where.available = f.available;
  if (f.clinicId  !== undefined) where.clinicId  = f.clinicId;
  if (f.search) {
    where.OR = [
      { specialty: { contains: f.search, mode: 'insensitive' } },
      { user: { profile: { firstName: { contains: f.search, mode: 'insensitive' } } } },
      { user: { profile: { lastName:  { contains: f.search, mode: 'insensitive' } } } },
    ];
  }
  return where;
}
