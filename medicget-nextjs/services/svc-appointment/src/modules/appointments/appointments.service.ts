import { appointmentsRepository, type AppointmentFilters } from './appointments.repository';
import type { PaginationParams } from '@medicget/shared/paginate';
import { paginate } from '@medicget/shared/paginate';
import type { AuthUser } from '@medicget/shared/auth';
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  UpdatePaymentInput,
  CreateReviewInput,
} from './appointments.schemas';

type ServiceResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

export const appointmentsService = {
  async list(
    user: AuthUser,
    rawFilters: Record<string, string>,
    pagination: PaginationParams,
  ): Promise<ServiceResult<ReturnType<typeof paginate>>> {
    const filters: AppointmentFilters = {};

    // Role-scoped filtering
    if (user.role === 'PATIENT') {
      // Patients only see their own appointments — we need to resolve patient.id from user.id
      const { prisma } = await import('@medicget/shared/prisma');
      const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
      if (!patient) return { ok: false, code: 'NOT_FOUND', message: 'Patient profile not found' };
      filters.patientId = patient.id;
    } else if (user.role === 'DOCTOR') {
      const { prisma } = await import('@medicget/shared/prisma');
      const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
      if (!doctor) return { ok: false, code: 'NOT_FOUND', message: 'Doctor profile not found' };
      filters.doctorId = doctor.id;
    } else if (user.role === 'CLINIC') {
      const { prisma } = await import('@medicget/shared/prisma');
      const clinic = await prisma.clinic.findUnique({ where: { userId: user.id } });
      if (!clinic) return { ok: false, code: 'NOT_FOUND', message: 'Clinic profile not found' };
      filters.clinicId = clinic.id;
    }

    // Apply optional query filters (only if not overriding role scope)
    if (rawFilters['status']) filters.status = rawFilters['status'];
    if (rawFilters['dateFrom']) filters.dateFrom = rawFilters['dateFrom'];
    if (rawFilters['dateTo']) filters.dateTo = rawFilters['dateTo'];
    // CLINIC can additionally filter by doctor/patient
    if (user.role === 'CLINIC') {
      if (rawFilters['doctorId']) filters.doctorId = rawFilters['doctorId'];
      if (rawFilters['patientId']) filters.patientId = rawFilters['patientId'];
    }

    const { data, total } = await appointmentsRepository.findMany(filters, pagination);
    return { ok: true, data: paginate(data, total, pagination) };
  },

  async create(
    body: CreateAppointmentInput,
    user: AuthUser,
  ): Promise<ServiceResult<unknown>> {
    const { prisma } = await import('@medicget/shared/prisma');

    // Validate doctor exists
    const doctor = await prisma.doctor.findUnique({ where: { id: body.doctorId } });
    if (!doctor) return { ok: false, code: 'NOT_FOUND', message: 'Doctor not found' };

    // Validate patient exists
    const patient = await prisma.patient.findUnique({ where: { id: body.patientId } });
    if (!patient) return { ok: false, code: 'NOT_FOUND', message: 'Patient not found' };

    // Validate clinic exists
    const clinic = await prisma.clinic.findUnique({ where: { id: body.clinicId } });
    if (!clinic) return { ok: false, code: 'NOT_FOUND', message: 'Clinic not found' };

    // Check for conflicting appointment
    const existing = await prisma.appointment.findFirst({
      where: {
        doctorId: body.doctorId,
        date: new Date(body.date),
        time: body.time,
        status: { notIn: ['CANCELLED'] },
      },
    });
    if (existing) return { ok: false, code: 'CONFLICT', message: 'That slot is already booked' };

    // Find slot if available
    const slot = await prisma.appointmentSlot.findFirst({
      where: {
        doctorId: body.doctorId,
        date: new Date(body.date),
        time: body.time,
        isBooked: false,
      },
    });

    const appointment = await appointmentsRepository.createWithSideEffects(
      {
        patientId: body.patientId,
        doctorId: body.doctorId,
        clinicId: body.clinicId,
        date: new Date(body.date),
        time: body.time,
        price: body.price,
        notes: body.notes,
        status: 'PENDING',
        createdBy: user.id,
      },
      slot?.id,
    );

    return { ok: true, data: appointment };
  },

  async getById(id: string, user: AuthUser): Promise<ServiceResult<unknown>> {
    const appointment = await appointmentsRepository.findById(id);
    if (!appointment) return { ok: false, code: 'NOT_FOUND', message: 'Appointment not found' };

    // Ownership check
    if (user.role !== 'CLINIC') {
      const { prisma } = await import('@medicget/shared/prisma');
      if (user.role === 'PATIENT') {
        const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
        if (!patient || appointment.patientId !== patient.id) {
          return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
        }
      } else if (user.role === 'DOCTOR') {
        const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
        if (!doctor || appointment.doctorId !== doctor.id) {
          return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
        }
      }
    } else {
      // CLINIC can only see appointments in their clinic
      const { prisma } = await import('@medicget/shared/prisma');
      const clinic = await prisma.clinic.findUnique({ where: { userId: user.id } });
      if (!clinic || appointment.clinicId !== clinic.id) {
        return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
      }
    }

    return { ok: true, data: appointment };
  },

  async update(
    id: string,
    body: UpdateAppointmentInput,
    user: AuthUser,
  ): Promise<ServiceResult<unknown>> {
    const appointment = await appointmentsRepository.findById(id);
    if (!appointment) return { ok: false, code: 'NOT_FOUND', message: 'Appointment not found' };

    // Ownership / role check
    if (user.role === 'PATIENT') {
      const { prisma } = await import('@medicget/shared/prisma');
      const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
      if (!patient || appointment.patientId !== patient.id) {
        return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
      }
      // Patients can only cancel their own appointment
      if (body.status && body.status !== 'CANCELLED') {
        return { ok: false, code: 'FORBIDDEN', message: 'Patients can only cancel appointments' };
      }
    } else if (user.role === 'DOCTOR') {
      const { prisma } = await import('@medicget/shared/prisma');
      const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
      if (!doctor || appointment.doctorId !== doctor.id) {
        return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
      }
    } else if (user.role === 'CLINIC') {
      const { prisma } = await import('@medicget/shared/prisma');
      const clinic = await prisma.clinic.findUnique({ where: { userId: user.id } });
      if (!clinic || appointment.clinicId !== clinic.id) {
        return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
      }
    }

    // If cancelling, unbook the slot
    if (body.status === 'CANCELLED') {
      await appointmentsRepository.unbookSlot(id);
    }

    const updated = await appointmentsRepository.update(id, {
      ...body,
      updatedBy: user.id,
    });

    return { ok: true, data: updated };
  },

  async cancel(id: string, user: AuthUser): Promise<ServiceResult<unknown>> {
    if (user.role !== 'CLINIC') {
      return { ok: false, code: 'FORBIDDEN', message: 'Only CLINIC can delete appointments' };
    }

    const appointment = await appointmentsRepository.findById(id);
    if (!appointment) return { ok: false, code: 'NOT_FOUND', message: 'Appointment not found' };

    const { prisma } = await import('@medicget/shared/prisma');
    const clinic = await prisma.clinic.findUnique({ where: { userId: user.id } });
    if (!clinic || appointment.clinicId !== clinic.id) {
      return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
    }

    await appointmentsRepository.unbookSlot(id);
    const deleted = await appointmentsRepository.softDelete(id, user.id);
    return { ok: true, data: deleted };
  },

  async getPayment(id: string, user: AuthUser): Promise<ServiceResult<unknown>> {
    const appointment = await appointmentsRepository.findById(id);
    if (!appointment) return { ok: false, code: 'NOT_FOUND', message: 'Appointment not found' };

    // Ownership check — any role that owns the appointment can see payment
    if (user.role === 'PATIENT') {
      const { prisma } = await import('@medicget/shared/prisma');
      const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
      if (!patient || appointment.patientId !== patient.id) {
        return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
      }
    } else if (user.role === 'DOCTOR') {
      const { prisma } = await import('@medicget/shared/prisma');
      const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
      if (!doctor || appointment.doctorId !== doctor.id) {
        return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
      }
    } else if (user.role === 'CLINIC') {
      const { prisma } = await import('@medicget/shared/prisma');
      const clinic = await prisma.clinic.findUnique({ where: { userId: user.id } });
      if (!clinic || appointment.clinicId !== clinic.id) {
        return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
      }
    }

    const payment = await appointmentsRepository.getPayment(id);
    if (!payment) return { ok: false, code: 'NOT_FOUND', message: 'Payment not found' };
    return { ok: true, data: payment };
  },

  async updatePayment(
    id: string,
    body: UpdatePaymentInput,
    user: AuthUser,
  ): Promise<ServiceResult<unknown>> {
    if (user.role !== 'CLINIC') {
      return { ok: false, code: 'FORBIDDEN', message: 'Only CLINIC can update payments' };
    }

    const appointment = await appointmentsRepository.findById(id);
    if (!appointment) return { ok: false, code: 'NOT_FOUND', message: 'Appointment not found' };

    const { prisma } = await import('@medicget/shared/prisma');
    const clinic = await prisma.clinic.findUnique({ where: { userId: user.id } });
    if (!clinic || appointment.clinicId !== clinic.id) {
      return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
    }

    const updateData: Record<string, unknown> = { ...body };

    // Set timestamps based on status transitions
    if (body.status === 'PAID') {
      updateData['paidAt'] = new Date();
    } else if (body.status === 'REFUNDED') {
      updateData['refundedAt'] = new Date();
    }

    const payment = await appointmentsRepository.updatePayment(id, updateData);

    // Send PAYMENT_RECEIVED notification to patient if paid
    if (body.status === 'PAID') {
      const patient = await prisma.patient.findUnique({
        where: { id: appointment.patientId },
        select: { userId: true },
      });
      if (patient) {
        await prisma.notification.create({
          data: {
            userId: patient.userId,
            type: 'PAYMENT_RECEIVED',
            title: 'Payment Confirmed',
            message: `Your payment of $${appointment.price} has been confirmed.`,
          },
        });
      }
    }

    return { ok: true, data: payment };
  },

  async createReview(
    id: string,
    body: CreateReviewInput,
    user: AuthUser,
  ): Promise<ServiceResult<unknown>> {
    if (user.role !== 'PATIENT') {
      return { ok: false, code: 'FORBIDDEN', message: 'Only PATIENT can create reviews' };
    }

    const appointment = await appointmentsRepository.findById(id);
    if (!appointment) return { ok: false, code: 'NOT_FOUND', message: 'Appointment not found' };

    // Must own the appointment
    const { prisma } = await import('@medicget/shared/prisma');
    const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
    if (!patient || appointment.patientId !== patient.id) {
      return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
    }

    // Appointment must be COMPLETED
    if (appointment.status !== 'COMPLETED') {
      return { ok: false, code: 'BAD_REQUEST', message: 'Can only review completed appointments' };
    }

    // No duplicate review
    if (appointment.review) {
      return { ok: false, code: 'CONFLICT', message: 'Review already exists for this appointment' };
    }

    const review = await appointmentsRepository.createReview({
      appointmentId: id,
      patientId: patient.id,
      doctorId: appointment.doctorId,
      rating: body.rating,
      comment: body.comment,
      isPublic: body.isPublic ?? true,
    });

    return { ok: true, data: review };
  },
};
