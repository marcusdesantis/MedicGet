import { prisma }            from '@medicget/shared/prisma';
import { PaginationParams, toSkipTake } from '@/lib/paginate';

export interface PatientFilters {
  search?:  string;
  clinicId?: string;
}

const INCLUDE = {
  user: { include: { profile: true } },
} as const;

const INCLUDE_FULL = {
  user:         { include: { profile: true } },
  appointments: {
    orderBy: { date: 'desc' as const },
    take:    20,
    include: { doctor: { include: { user: { include: { profile: true } } } } },
  },
} as const;

export const patientsRepository = {
  async findMany(filters: PatientFilters, pagination: PaginationParams) {
    const where = buildWhere(filters);
    const [data, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        include: INCLUDE,
        orderBy: { user: { createdAt: 'desc' } },
        ...toSkipTake(pagination),
      }),
      prisma.patient.count({ where }),
    ]);
    return { data, total };
  },

  async findById(id: string) {
    return prisma.patient.findUnique({ where: { id }, include: INCLUDE_FULL });
  },

  async findByUserId(userId: string) {
    return prisma.patient.findFirst({ where: { userId }, include: INCLUDE_FULL });
  },

  async dashboardStats(patientId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [upcoming, completed, totalSpent] = await Promise.all([
      prisma.appointment.count({
        where: { patientId, date: { gte: today }, status: { in: ['UPCOMING', 'PENDING'] } },
      }),
      prisma.appointment.count({
        where: { patientId, status: 'COMPLETED' },
      }),
      prisma.appointment.aggregate({
        where:   { patientId, status: 'COMPLETED' },
        _sum:    { price: true },
      }),
    ]);

    const nextAppointment = await prisma.appointment.findFirst({
      where:   { patientId, date: { gte: today }, status: { in: ['UPCOMING', 'PENDING'] } },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      include: { doctor: { include: { user: { include: { profile: true } } } }, clinic: true },
    });

    return {
      upcoming,
      completed,
      totalSpent: totalSpent._sum.price ?? 0,
      nextAppointment,
    };
  },
};

function buildWhere(f: PatientFilters) {
  const where: Record<string, unknown> = {
    user: { status: { not: 'DELETED' } },
  };
  if (f.clinicId) {
    where.appointments = { some: { clinicId: f.clinicId } };
  }
  if (f.search) {
    where.OR = [
      { user: { profile: { firstName: { contains: f.search, mode: 'insensitive' } } } },
      { user: { profile: { lastName:  { contains: f.search, mode: 'insensitive' } } } },
      { user: { email:   { contains: f.search, mode: 'insensitive' } } },
    ];
  }
  return where;
}
