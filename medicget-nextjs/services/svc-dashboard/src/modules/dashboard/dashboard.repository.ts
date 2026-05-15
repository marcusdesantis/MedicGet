import { prisma } from '@medicget/shared/prisma';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0 = Sunday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_LABELS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// ─── Clinic Dashboard ─────────────────────────────────────────────────────────

export async function getClinicDashboard(clinicId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Parallel stat queries
  const [
    totalDoctors,
    totalPatients,
    todayAppointments,
    monthAppointments,
    pendingAppointments,
    revenueAgg,
    pendingRevenueAgg,
    recentAppointments,
    topDoctorsRaw,
  ] = await Promise.all([
    // Total doctors in clinic
    prisma.doctor.count({ where: { clinicId } }),

    // Total unique patients who had an appointment with this clinic.
    // Usamos findMany + distinct en vez de groupBy: groupBy sin
    // agregación (_count / _sum / etc.) genera un tipo Prisma que TS
    // estricto rechaza como `any` en el .then callback. findMany+distinct
    // expresa la misma intención y devuelve un tipo concreto.
    prisma.appointment.findMany({
      where:    { clinicId },
      distinct: ['patientId'],
      select:   { patientId: true },
    }).then((rows) => rows.length),

    // Today's appointments
    prisma.appointment.count({
      where: {
        clinicId,
        date: { gte: todayStart, lte: todayEnd },
      },
    }),

    // This month's appointments
    prisma.appointment.count({
      where: {
        clinicId,
        date: { gte: monthStart, lte: monthEnd },
      },
    }),

    // Pending appointments
    prisma.appointment.count({
      where: { clinicId, status: 'PENDING' },
    }),

    // Total revenue (PAID payments)
    prisma.payment.aggregate({
      where: {
        appointment: { clinicId },
        status: 'PAID',
      },
      _sum: { amount: true },
    }),

    // Pending revenue
    prisma.payment.aggregate({
      where: {
        appointment: { clinicId },
        status: 'PENDING',
      },
      _sum: { amount: true },
    }),

    // Recent 10 appointments
    prisma.appointment.findMany({
      where: { clinicId },
      include: {
        patient: { include: { user: { include: { profile: true } } } },
        doctor: { include: { user: { include: { profile: true } } } },
        payment: true,
      },
      orderBy: [{ date: 'desc' }, { time: 'desc' }],
      take: 10,
    }),

    // Top doctors by appointment count
    prisma.appointment.groupBy({
      by: ['doctorId'],
      where: { clinicId },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
  ]);

  // Resolve top doctors details
  const topDoctors = await Promise.all(
    topDoctorsRaw.map(async (row) => {
      const doctor = await prisma.doctor.findUnique({
        where: { id: row.doctorId },
        include: { user: { include: { profile: true } } },
      });
      return { doctor, appointmentCount: row._count.id };
    }),
  );

  // Weekly chart — last 7 days (Mon–Sun of current week)
  const weekStart = startOfWeek(now);
  const weeklyChart = await Promise.all(
    WEEK_LABELS.map(async (label, i) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      const value = await prisma.appointment.count({
        where: {
          clinicId,
          date: { gte: startOfDay(day), lte: endOfDay(day) },
        },
      });
      return { label, value };
    }),
  );

  // Revenue by month — last 6 months using $queryRaw
  type RevenueRow = { month: number; year: number; amount: number };
  const revenueByMonthRaw = await prisma.$queryRaw<RevenueRow[]>`
    SELECT
      EXTRACT(MONTH FROM a.date)::int AS month,
      EXTRACT(YEAR  FROM a.date)::int AS year,
      COALESCE(SUM(p.amount), 0)::float AS amount
    FROM "Appointment" a
    JOIN "Payment" p ON p."appointmentId" = a.id
    WHERE a."clinicId" = ${clinicId}
      AND p.status = 'PAID'
      AND a.date >= (NOW() - INTERVAL '6 months')
    GROUP BY year, month
    ORDER BY year ASC, month ASC
  `;

  const revenueByMonth = revenueByMonthRaw.map((r) => ({
    label: MONTH_LABELS_ES[r.month - 1] ?? String(r.month),
    amount: Number(r.amount),
  }));

  return {
    stats: {
      totalDoctors,
      totalPatients,
      todayAppointments,
      monthAppointments,
      pendingAppointments,
      totalRevenue: revenueAgg._sum.amount ?? 0,
      pendingRevenue: pendingRevenueAgg._sum.amount ?? 0,
    },
    recentAppointments,
    weeklyChart,
    topDoctors,
    revenueByMonth,
  };
}

// ─── Doctor Dashboard ─────────────────────────────────────────────────────────

export async function getDoctorDashboard(doctorId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now);
  const weekEnd = endOfDay(new Date(weekStart.getTime() + 6 * 86_400_000));
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // El médico no debe ver citas PENDING (impagas) en el dashboard. Una
  // cita está en PENDING mientras el paciente todavía no completó el
  // pago — el sweeper la auto-cancela en 15 min si no paga. Las
  // citas confirmadas pasan a UPCOMING al confirmar el pago.
  const VISIBLE_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED', 'NO_SHOW'];

  const [
    todayCount,
    weekCount,
    monthCount,
    pendingCount,
    completedCount,
    ratingAgg,
    revenueAgg,
    todaySchedule,
    recentReviews,
  ] = await Promise.all([
    prisma.appointment.count({
      where: { doctorId, date: { gte: todayStart, lte: todayEnd }, status: { in: VISIBLE_STATUSES as never } },
    }),
    prisma.appointment.count({
      where: { doctorId, date: { gte: weekStart, lte: weekEnd }, status: { in: VISIBLE_STATUSES as never } },
    }),
    prisma.appointment.count({
      where: { doctorId, date: { gte: monthStart, lte: monthEnd }, status: { in: VISIBLE_STATUSES as never } },
    }),
    // `pendingCount` ahora cuenta UPCOMING (pendientes de atender) — antes
    // contaba PENDING (pendientes de pago) que el médico ni siquiera ve.
    prisma.appointment.count({ where: { doctorId, status: 'UPCOMING' } }),
    prisma.appointment.count({ where: { doctorId, status: 'COMPLETED' } }),
    prisma.review.aggregate({
      where: { doctorId },
      _avg: { rating: true },
    }),
    prisma.payment.aggregate({
      where: { appointment: { doctorId }, status: 'PAID' },
      _sum: { amount: true },
    }),
    prisma.appointment.findMany({
      where: {
        doctorId,
        date: { gte: todayStart, lte: todayEnd },
        // Excluímos CANCELLED y PENDING — la agenda de hoy del médico
        // sólo muestra citas pagadas y confirmadas.
        status: { notIn: ['CANCELLED', 'PENDING'] },
      },
      include: {
        patient: { include: { user: { include: { profile: true } } } },
        payment: true,
      },
      orderBy: { time: 'asc' },
    }),
    prisma.review.findMany({
      where: { doctorId },
      include: {
        patient: { include: { user: { include: { profile: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  // Weekly chart
  const weeklyChart = await Promise.all(
    WEEK_LABELS.map(async (label, i) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      const value = await prisma.appointment.count({
        where: {
          doctorId,
          date: { gte: startOfDay(day), lte: endOfDay(day) },
        },
      });
      return { label, value };
    }),
  );

  return {
    stats: {
      todayCount,
      weekCount,
      monthCount,
      pendingCount,
      completedCount,
      avgRating: ratingAgg._avg.rating ?? 0,
      totalRevenue: revenueAgg._sum.amount ?? 0,
    },
    todaySchedule,
    weeklyChart,
    recentReviews,
  };
}

// ─── Patient Dashboard ────────────────────────────────────────────────────────

export async function getPatientDashboard(patientId: string, userId: string) {
  const now = new Date();

  const [upcoming, completed, cancelled, totalSpentAgg, nextAppointment, recentAppointments, notifications] =
    await Promise.all([
      prisma.appointment.count({
        where: { patientId, status: { in: ['PENDING', 'UPCOMING'] } },
      }),
      prisma.appointment.count({ where: { patientId, status: 'COMPLETED' } }),
      prisma.appointment.count({ where: { patientId, status: 'CANCELLED' } }),
      prisma.payment.aggregate({
        where: { appointment: { patientId }, status: 'PAID' },
        _sum: { amount: true },
      }),
      // Next upcoming appointment
      prisma.appointment.findFirst({
        where: {
          patientId,
          status: { in: ['PENDING', 'UPCOMING'] },
          date: { gte: now },
        },
        include: {
          doctor: { include: { user: { include: { profile: true } } } },
          clinic: true,
          payment: true,
        },
        orderBy: [{ date: 'asc' }, { time: 'asc' }],
      }),
      // Recent 5 appointments
      prisma.appointment.findMany({
        where: { patientId },
        include: {
          doctor: { include: { user: { include: { profile: true } } } },
          clinic: true,
          payment: true,
          review: true,
        },
        orderBy: [{ date: 'desc' }, { time: 'desc' }],
        take: 5,
      }),
      // Unread notifications
      prisma.notification.findMany({
        where: { userId, isRead: false },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

  return {
    stats: {
      upcoming,
      completed,
      cancelled,
      totalSpent: totalSpentAgg._sum.amount ?? 0,
    },
    nextAppointment,
    recentAppointments,
    notifications,
  };
}
