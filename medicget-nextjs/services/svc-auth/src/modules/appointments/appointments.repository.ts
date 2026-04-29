import { prisma }           from '@medicget/shared/prisma';
import { AppointmentStatus } from '@prisma/client';
import { toSkipTake, PaginationParams } from '@/lib/paginate';

export interface AppointmentFilters {
  status?:    AppointmentStatus;
  patientId?: string;
  doctorId?:  string;
  clinicId?:  string;
  dateFrom?:  Date;
  dateTo?:    Date;
}

export interface CreateAppointmentInput {
  patientId: string;
  doctorId:  string;
  clinicId:  string;
  date:      Date;
  time:      string;
  price:     number;
  notes?:    string;
}

export interface UpdateAppointmentInput {
  status?: AppointmentStatus;
  date?:   Date;
  time?:   string;
  notes?:  string;
  price?:  number;
}

const INCLUDE = {
  patient: { include: { user: { include: { profile: true } } } },
  doctor:  { include: { user: { include: { profile: true } } } },
  clinic:  true,
} as const;

export const appointmentsRepository = {
  async findMany(filters: AppointmentFilters, pagination: PaginationParams) {
    const where = buildWhere(filters);
    const [data, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: INCLUDE,
        orderBy: [{ date: 'desc' }, { time: 'asc' }],
        ...toSkipTake(pagination),
      }),
      prisma.appointment.count({ where }),
    ]);
    return { data, total };
  },

  async findById(id: string) {
    return prisma.appointment.findUnique({ where: { id }, include: INCLUDE });
  },

  async create(input: CreateAppointmentInput) {
    return prisma.appointment.create({
      data: { ...input, status: AppointmentStatus.PENDING },
      include: INCLUDE,
    });
  },

  async update(id: string, input: UpdateAppointmentInput) {
    return prisma.appointment.update({ where: { id }, data: input, include: INCLUDE });
  },

  async softDelete(id: string) {
    return prisma.appointment.update({
      where: { id },
      data:  { status: AppointmentStatus.CANCELLED },
      include: INCLUDE,
    });
  },
};

function buildWhere(f: AppointmentFilters) {
  return {
    ...(f.status    && { status:    f.status }),
    ...(f.patientId && { patientId: f.patientId }),
    ...(f.doctorId  && { doctorId:  f.doctorId }),
    ...(f.clinicId  && { clinicId:  f.clinicId }),
    ...(f.dateFrom || f.dateTo
      ? { date: { ...(f.dateFrom && { gte: f.dateFrom }), ...(f.dateTo && { lte: f.dateTo }) } }
      : {}),
  };
}
