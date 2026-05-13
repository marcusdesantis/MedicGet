import { prisma } from '@medicget/shared/prisma';
import type { PaginationParams } from '@medicget/shared/paginate';
import { toSkipTake } from '@medicget/shared/paginate';
import type { Prisma } from '@prisma/client';

export interface AppointmentFilters {
  status?:   string;
  dateFrom?: string;
  dateTo?:   string;
  doctorId?: string;
  patientId?: string;
  clinicId?: string;
}

/**
 * Includes usados en listados y detalle.
 *
 * Nota (fix bug review): `review` se incluye también en el listado porque
 * el frontend (PatientAppointmentsPage) decide si mostrar el botón
 * "Calificar" basándose en `a.review == null`. Si no lo incluimos aquí,
 * el listado piensa que la cita NO tiene review y muestra el botón → al
 * enviar la reseña por segunda vez el backend responde 409 CONFLICT
 * "Review already exists". Costo en bytes es mínimo (1 row por cita).
 */
const appointmentIncludes = {
  patient: {
    include: {
      user: {
        include: { profile: true },
      },
    },
  },
  doctor: {
    include: {
      user: {
        include: { profile: true },
      },
    },
  },
  clinic: true,
  payment: true,
  review:  true,
} satisfies Prisma.AppointmentInclude;

// Alias preservado para semantica de detalle. Hoy idéntico al listado, pero
// dejamos el nombre por si en el futuro queremos incluir mensajes / historial
// solo en el detalle y no en el listado.
const appointmentIncludesFull = appointmentIncludes;

function buildWhere(filters: AppointmentFilters): Prisma.AppointmentWhereInput {
  const where: Prisma.AppointmentWhereInput = {};

  if (filters.status) {
    where.status = filters.status as Prisma.EnumAppointmentStatusFilter;
  }
  if (filters.doctorId) {
    where.doctorId = filters.doctorId;
  }
  if (filters.patientId) {
    where.patientId = filters.patientId;
  }
  if (filters.clinicId) {
    where.clinicId = filters.clinicId;
  }
  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) {
      (where.date as Prisma.DateTimeFilter).gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      (where.date as Prisma.DateTimeFilter).lte = new Date(filters.dateTo);
    }
  }

  return where;
}

export const appointmentsRepository = {
  async findMany(filters: AppointmentFilters, pagination: PaginationParams) {
    const { skip, take } = toSkipTake(pagination);
    const where = buildWhere(filters);

    const [data, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: appointmentIncludes,
        orderBy: [{ date: 'desc' }, { time: 'desc' }],
        skip,
        take,
      }),
      prisma.appointment.count({ where }),
    ]);

    return { data, total };
  },

  async findById(id: string) {
    return prisma.appointment.findUnique({
      where: { id },
      include: appointmentIncludesFull,
    });
  },

  async create(data: Prisma.AppointmentUncheckedCreateInput) {
    return prisma.appointment.create({ data });
  },

  async createWithSideEffects(
    apptData: Prisma.AppointmentUncheckedCreateInput,
    slotId?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Create the appointment
      const appointment = await tx.appointment.create({ data: apptData });

      // 2. Mark the slot as booked if slotId provided; otherwise find by doctor/date/time
      if (slotId) {
        await tx.appointmentSlot.update({
          where: { id: slotId },
          data: { isBooked: true, appointmentId: appointment.id },
        });
      } else {
        // Try to find an existing slot
        const existingSlot = await tx.appointmentSlot.findFirst({
          where: {
            doctorId: apptData.doctorId,
            date: new Date(apptData.date as string),
            time: apptData.time,
            isBooked: false,
          },
        });
        if (existingSlot) {
          await tx.appointmentSlot.update({
            where: { id: existingSlot.id },
            data: { isBooked: true, appointmentId: appointment.id },
          });
        }
      }

      // 3. Create a PENDING payment record
      // `expiresAt` is set to NOW + 15 minutes so the sweeper auto-cancels
      // the appointment if the patient never pays. The frontend also
      // surfaces a countdown derived from the same value.
      const PAYMENT_WINDOW_MS = 15 * 60 * 1000;
      await tx.payment.create({
        data: {
          appointmentId: appointment.id,
          amount: apptData.price as number,
          method: 'PENDING',
          status: 'PENDING',
          expiresAt: new Date(Date.now() + PAYMENT_WINDOW_MS),
        },
      });

      // 4. Notificaciones in-app para AMBAS partes
      const [doctor, patient] = await Promise.all([
        tx.doctor.findUnique({
          where: { id: apptData.doctorId },
          select: { userId: true, user: { select: { profile: { select: { firstName: true } } } } },
        }),
        tx.patient.findUnique({
          where: { id: apptData.patientId },
          select: { userId: true, user: { select: { profile: { select: { firstName: true } } } } },
        }),
      ]);

      const dateStr = new Date(apptData.date as string).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      const time    = apptData.time as string;

      if (doctor) {
        const patientName = patient?.user?.profile?.firstName ?? 'Un paciente';
        await tx.notification.create({
          data: {
            userId:  doctor.userId,
            type:    'APPOINTMENT_CONFIRMED',
            title:   'Nueva cita',
            message: `${patientName} reservó una cita para el ${dateStr} a las ${time}.`,
            metadata: { appointmentId: appointment.id },
          },
        });
      }
      if (patient) {
        const docFirst = doctor?.user?.profile?.firstName ?? '';
        await tx.notification.create({
          data: {
            userId:  patient.userId,
            type:    'APPOINTMENT_CONFIRMED',
            title:   'Cita reservada',
            message: `Tu cita con Dr. ${docFirst} está reservada para el ${dateStr} a las ${time}. Pendiente de pago.`,
            metadata: { appointmentId: appointment.id },
          },
        });
      }

      return appointment;
    });
  },

  async softDelete(id: string, updatedBy?: string) {
    return prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        updatedBy: updatedBy ?? null,
      },
    });
  },

  async update(id: string, data: Prisma.AppointmentUncheckedUpdateInput) {
    return prisma.appointment.update({ where: { id }, data });
  },

  async unbookSlot(appointmentId: string) {
    const slot = await prisma.appointmentSlot.findFirst({
      where: { appointmentId },
    });
    if (slot) {
      await prisma.appointmentSlot.update({
        where: { id: slot.id },
        data: { isBooked: false, appointmentId: null },
      });
    }
  },

  async getPayment(appointmentId: string) {
    return prisma.payment.findUnique({ where: { appointmentId } });
  },

  async updatePayment(appointmentId: string, data: Prisma.PaymentUncheckedUpdateInput) {
    return prisma.payment.update({ where: { appointmentId }, data });
  },

  async createReview(data: Prisma.ReviewUncheckedCreateInput) {
    const review = await prisma.review.create({ data });

    // Recalculate the doctor's rating
    const agg = await prisma.review.aggregate({
      where: { doctorId: data.doctorId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.doctor.update({
      where: { id: data.doctorId },
      data: {
        rating: agg._avg.rating ?? 0,
        reviewCount: agg._count.rating,
      },
    });

    // Notify the doctor about the new review
    const doctor = await prisma.doctor.findUnique({
      where: { id: data.doctorId },
      select: { userId: true },
    });
    if (doctor) {
      await prisma.notification.create({
        data: {
          userId: doctor.userId,
          type: 'REVIEW_RECEIVED',
          title: 'New Review',
          message: `You received a ${data.rating}-star review.`,
        },
      });
    }

    return review;
  },
};
