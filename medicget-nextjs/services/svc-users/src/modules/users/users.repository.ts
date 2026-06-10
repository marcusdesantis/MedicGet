import { prisma } from '@medicget/shared/prisma';
import { createNotification } from '@medicget/shared/notifications';
import type { PaginationParams } from '@medicget/shared/paginate';
import { toSkipTake } from '@medicget/shared/paginate';
import type { Prisma, UserStatus } from '@prisma/client';

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  /** Foto de perfil — dataURL generado por AvatarUploader client-side. */
  avatarUrl?: string;
}

const userWithProfile = {
  profile: true,
} satisfies Prisma.UserInclude;

const userWithAll = {
  profile: true,
  clinic: true,
  doctor: true,
  patient: true,
} satisfies Prisma.UserInclude;

export async function findMany(
  filters: { search?: string; status?: UserStatus },
  pagination: PaginationParams,
) {
  const { skip, take } = toSkipTake(pagination);

  const where: Prisma.UserWhereInput = {
    status: filters.status ?? { not: 'DELETED' },
    ...(filters.search
      ? {
          OR: [
            { email: { contains: filters.search, mode: 'insensitive' } },
            {
              profile: {
                OR: [
                  { firstName: { contains: filters.search, mode: 'insensitive' } },
                  { lastName: { contains: filters.search, mode: 'insensitive' } },
                ],
              },
            },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: userWithProfile,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total };
}

export async function findById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: userWithAll,
  });
}

export async function updateStatus(id: string, status: UserStatus) {
  return prisma.user.update({
    where: { id },
    data: { status },
    include: userWithProfile,
  });
}

export async function upsertProfile(userId: string, data: UpdateProfileData) {
  // Profile.firstName / Profile.lastName are non-optional in the Prisma schema,
  // so the `create` branch must always satisfy them. In normal flow the Profile
  // is created during registration (svc-auth) and this `upsert` only takes the
  // `update` path — but we still need to satisfy Prisma's input type, so we
  // pull the required fields out of `data` and fall back to empty strings.
  const { firstName, lastName, ...rest } = data;

  return prisma.profile.upsert({
    where: { userId },
    create: {
      userId,
      firstName: firstName ?? '',
      lastName:  lastName  ?? '',
      ...rest,
    },
    update: data,
  });
}

export async function findProfileByUserId(userId: string) {
  return prisma.profile.findUnique({ where: { userId } });
}

const ACTIVE_STATUSES = ['PENDING', 'UPCOMING', 'ONGOING'] as const;

/**
 * Cancela todas las citas activas del usuario que está eliminando su cuenta
 * y notifica a los afectados. Fire-and-forget seguro: errores de notificación
 * no detienen la cancelación.
 */
export async function cancelActiveAppointmentsForDeletion(
  role: string,
  entityId: string,
): Promise<void> {
  const where: Prisma.AppointmentWhereInput = {
    status: { in: [...ACTIVE_STATUSES] },
    ...(role === 'DOCTOR'  ? { doctorId:  entityId } :
        role === 'PATIENT' ? { patientId: entityId } :
                             { clinicId:  entityId }),
  };

  const appointments = await prisma.appointment.findMany({
    where,
    select: {
      id:       true,
      patient:  { select: { userId: true } },
      doctor:   { select: { userId: true } },
    },
  });

  if (appointments.length === 0) return;

  const cancelReason =
    role === 'DOCTOR'  ? 'El médico eliminó su cuenta.' :
    role === 'PATIENT' ? 'El paciente eliminó su cuenta.' :
                         'La clínica eliminó su cuenta.';

  await prisma.appointment.updateMany({
    where: { id: { in: appointments.map((a) => a.id) } },
    data:  { status: 'CANCELLED', cancelReason },
  });

  // Notificar a los afectados (best-effort).
  const notifTitle   = 'Cita cancelada';
  const notifMessage =
    role === 'DOCTOR'  ? 'El médico eliminó su cuenta. Tu cita próxima fue cancelada.' :
    role === 'PATIENT' ? 'El paciente canceló su cuenta. La cita fue cancelada.' :
                         'La clínica cerró su cuenta. Tu cita fue cancelada.';
  const pushUrl =
    role === 'DOCTOR' ? '/patient/appointments' : '/doctor/appointments';

  const recipientIds = [
    ...new Set(
      appointments.map((a) =>
        role === 'PATIENT' ? a.doctor.userId : a.patient.userId,
      ),
    ),
  ];

  await Promise.all(
    recipientIds.map((userId) =>
      createNotification({
        userId,
        type:    'APPOINTMENT_CANCELLED',
        title:   notifTitle,
        message: notifMessage,
        metadata: { cancelReason },
        pushUrl,
      }).catch(() => {}),
    ),
  );
}
