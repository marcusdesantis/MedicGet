import { prisma } from '@medicget/shared/prisma';
import type { PaginationParams } from '@medicget/shared/paginate';
import { toSkipTake } from '@medicget/shared/paginate';

export interface PatientFilters {
  search?: string;
  clinicId?: string;
}

export const patientsRepository = {
  async findMany(filters: PatientFilters, pagination: PaginationParams) {
    const { skip, take } = toSkipTake(pagination);

    const where: Record<string, unknown> = {};

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
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    if (filters.clinicId) {
      where.appointments = {
        some: { clinicId: filters.clinicId },
      };
    }

    const [data, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take,
        include: {
          user: { include: { profile: true } },
        },
        orderBy: { id: 'asc' },
      }),
      prisma.patient.count({ where }),
    ]);

    return { data, total };
  },

  async findById(id: string) {
    return prisma.patient.findUnique({
      where: { id },
      include: {
        user: { include: { profile: true } },
        appointments: {
          take: 10,
          orderBy: { date: 'desc' },
          include: {
            doctor: { include: { user: { include: { profile: true } } } },
          },
        },
      },
    });
  },

  async findByUserId(userId: string) {
    return prisma.patient.findFirst({ where: { userId } });
  },

  async update(id: string, data: Record<string, unknown>) {
    return prisma.patient.update({ where: { id }, data });
  },

  async findAppointments(patientId: string, pagination: PaginationParams) {
    const { skip, take } = toSkipTake(pagination);
    const where = { patientId };

    const [data, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take,
        orderBy: { date: 'desc' },
        include: {
          doctor: {
            include: { user: { include: { profile: true } } },
          },
          clinic: true,
          payment: true,
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    return { data, total };
  },

  async dashboardStats(patientId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [upcomingCount, completedCount, totalSpentResult, nextAppointment] = await Promise.all([
      prisma.appointment.count({
        where: {
          patientId,
          status: { in: ['UPCOMING', 'PENDING'] },
          date: { gte: todayStart },
        },
      }),
      prisma.appointment.count({
        where: { patientId, status: 'COMPLETED' },
      }),
      prisma.payment.aggregate({
        where: {
          appointment: { patientId },
          status: 'PAID',
        },
        _sum: { amount: true },
      }),
      prisma.appointment.findFirst({
        where: {
          patientId,
          status: { in: ['UPCOMING', 'PENDING'] },
          date: { gte: todayStart },
        },
        orderBy: [{ date: 'asc' }, { time: 'asc' }],
        include: {
          doctor: { include: { user: { include: { profile: true } } } },
          clinic: true,
        },
      }),
    ]);

    return {
      upcomingCount,
      completedCount,
      totalSpent: totalSpentResult._sum.amount ?? 0,
      nextAppointment,
    };
  },

  async findRecentAppointments(patientId: string, limit = 5) {
    return prisma.appointment.findMany({
      where: { patientId, status: 'COMPLETED' },
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        doctor: { include: { user: { include: { profile: true } } } },
        clinic: true,
      },
    });
  },

  async findNotifications(userId: string, pagination: PaginationParams) {
    const { skip, take } = toSkipTake(pagination);
    const where = { userId };

    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    return { data, total };
  },

  async markNotificationRead(notifId: string) {
    return prisma.notification.update({
      where: { id: notifId },
      data: { isRead: true },
    });
  },
};
