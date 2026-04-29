import { prisma } from '@medicget/shared/prisma';

export const clinicRepository = {
  async findByUserId(userId: string) {
    return prisma.clinic.findFirst({
      where:   { userId },
      include: { user: { include: { profile: true } } },
    });
  },

  async dashboardStats(clinicId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalDoctors,
      totalPatients,
      todayAppointments,
      monthAppointments,
      pendingAppointments,
      revenueResult,
    ] = await Promise.all([
      prisma.doctor.count({ where: { clinicId } }),
      prisma.patient.count({
        where: { appointments: { some: { clinicId } } },
      }),
      prisma.appointment.count({
        where: { clinicId, date: { gte: today, lt: tomorrow }, status: { notIn: ['CANCELLED'] } },
      }),
      prisma.appointment.count({
        where: { clinicId, date: { gte: monthStart }, status: { notIn: ['CANCELLED'] } },
      }),
      prisma.appointment.count({
        where: { clinicId, status: 'PENDING' },
      }),
      prisma.appointment.aggregate({
        where:  { clinicId, status: 'COMPLETED' },
        _sum:   { price: true },
      }),
    ]);

    return {
      totalDoctors,
      totalPatients,
      todayAppointments,
      monthAppointments,
      pendingAppointments,
      totalRevenue: revenueResult._sum.price ?? 0,
    };
  },

  async recentAppointments(clinicId: string, take = 10) {
    return prisma.appointment.findMany({
      where:   { clinicId },
      include: {
        patient: { include: { user: { include: { profile: true } } } },
        doctor:  { include: { user: { include: { profile: true } } } },
      },
      orderBy: [{ date: 'desc' }, { time: 'desc' }],
      take,
    });
  },

  async appointmentsByDay(clinicId: string, days = 7) {
    const from = new Date();
    from.setDate(from.getDate() - days + 1);
    from.setHours(0, 0, 0, 0);

    return prisma.appointment.findMany({
      where:   { clinicId, date: { gte: from }, status: { notIn: ['CANCELLED'] } },
      select:  { date: true },
    });
  },
};
