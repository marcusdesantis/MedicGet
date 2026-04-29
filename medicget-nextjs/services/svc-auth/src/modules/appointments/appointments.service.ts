import { AppointmentStatus } from '@prisma/client';
import { AuthUser }           from '@medicget/shared/auth';
import { appointmentsRepository, AppointmentFilters, CreateAppointmentInput } from './appointments.repository';
import { PaginationParams, paginate } from '@/lib/paginate';

export type ServiceResult<T> =
  | { ok: true;  data: T }
  | { ok: false; code: string; message: string };

export const appointmentsService = {
  async list(user: AuthUser, rawFilters: Record<string, string | undefined>, pagination: PaginationParams) {
    const filters: AppointmentFilters = {
      status:    rawFilters.status as AppointmentStatus | undefined,
      dateFrom:  rawFilters.dateFrom ? new Date(rawFilters.dateFrom) : undefined,
      dateTo:    rawFilters.dateTo   ? new Date(rawFilters.dateTo)   : undefined,
    };

    // Scope by role: doctors only see their appointments, patients only see theirs
    if (user.role === 'DOCTOR') {
      const { prisma } = await import('@medicget/shared/prisma');
      const doctor = await prisma.doctor.findFirst({ where: { userId: user.id } });
      if (!doctor) return { ok: false as const, code: 'NOT_FOUND', message: 'Doctor profile not found' };
      filters.doctorId = doctor.id;
    } else if (user.role === 'PATIENT') {
      const { prisma } = await import('@medicget/shared/prisma');
      const patient = await prisma.patient.findFirst({ where: { userId: user.id } });
      if (!patient) return { ok: false as const, code: 'NOT_FOUND', message: 'Patient profile not found' };
      filters.patientId = patient.id;
    } else if (user.role === 'CLINIC') {
      const { prisma } = await import('@medicget/shared/prisma');
      const clinic = await prisma.clinic.findFirst({ where: { userId: user.id } });
      if (!clinic) return { ok: false as const, code: 'NOT_FOUND', message: 'Clinic profile not found' };
      filters.clinicId = clinic.id;
    }

    const { data, total } = await appointmentsRepository.findMany(filters, pagination);
    return { ok: true as const, data: paginate(data, total, pagination) };
  },

  async getById(id: string, user: AuthUser): Promise<ServiceResult<object>> {
    const appt = await appointmentsRepository.findById(id);
    if (!appt) return { ok: false, code: 'NOT_FOUND', message: 'Appointment not found' };

    if (!canAccess(user, appt)) {
      return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };
    }
    return { ok: true, data: appt };
  },

  async create(input: CreateAppointmentInput, user: AuthUser): Promise<ServiceResult<object>> {
    if (user.role !== 'PATIENT' && user.role !== 'CLINIC') {
      return { ok: false, code: 'FORBIDDEN', message: 'Only patients or clinic staff can book appointments' };
    }
    const appt = await appointmentsRepository.create(input);
    return { ok: true, data: appt };
  },

  async update(id: string, body: Record<string, unknown>, user: AuthUser): Promise<ServiceResult<object>> {
    const appt = await appointmentsRepository.findById(id);
    if (!appt) return { ok: false, code: 'NOT_FOUND', message: 'Appointment not found' };
    if (!canAccess(user, appt)) return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };

    const updated = await appointmentsRepository.update(id, {
      status: body.status as AppointmentStatus | undefined,
      date:   body.date   ? new Date(body.date as string) : undefined,
      time:   body.time   as string | undefined,
      notes:  body.notes  as string | undefined,
      price:  body.price  as number | undefined,
    });
    return { ok: true, data: updated };
  },

  async cancel(id: string, user: AuthUser): Promise<ServiceResult<object>> {
    const appt = await appointmentsRepository.findById(id);
    if (!appt) return { ok: false, code: 'NOT_FOUND', message: 'Appointment not found' };
    if (!canAccess(user, appt)) return { ok: false, code: 'FORBIDDEN', message: 'Access denied' };

    const updated = await appointmentsRepository.softDelete(id);
    return { ok: true, data: updated };
  },
};

function canAccess(user: AuthUser, appt: { patient: { userId: string }; doctor: { userId: string }; clinic: { userId: string } }) {
  if (user.role === 'CLINIC')   return appt.clinic.userId  === user.id;
  if (user.role === 'DOCTOR')   return appt.doctor.userId  === user.id;
  if (user.role === 'PATIENT')  return appt.patient.userId === user.id;
  return false;
}
