import { prisma } from '@medicget/shared/prisma';
import type { PaginationParams } from '@medicget/shared/paginate';
import { toSkipTake } from '@medicget/shared/paginate';
import type { Prisma } from '@prisma/client';

export interface CreateClinicData {
  userId: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
}

export interface UpdateClinicData {
  name?: string;
  address?: string;
  city?: string;
  country?: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export async function findMany(
  filters: { search?: string },
  pagination: PaginationParams,
) {
  const { skip, take } = toSkipTake(pagination);

  const where: Prisma.ClinicWhereInput = {
    status: 'ACTIVE',
    ...(filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { city: { contains: filters.search, mode: 'insensitive' } },
            { country: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [clinics, total] = await Promise.all([
    prisma.clinic.findMany({
      where,
      include: {
        _count: { select: { doctors: true } },
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.clinic.count({ where }),
  ]);

  return { clinics, total };
}

export async function findById(id: string) {
  return prisma.clinic.findUnique({
    where: { id },
    include: {
      doctors: {
        where: { status: 'ACTIVE' },
        include: {
          user: { include: { profile: true } },
        },
        orderBy: { rating: 'desc' },
      },
      user: { include: { profile: true } },
      _count: { select: { doctors: true } },
    },
  });
}

export async function findByUserId(userId: string) {
  return prisma.clinic.findFirst({
    where: { userId, status: { not: 'DELETED' } },
  });
}

export async function create(data: CreateClinicData) {
  return prisma.clinic.create({
    data: {
      ...data,
      status: 'ACTIVE',
    },
    include: {
      _count: { select: { doctors: true } },
    },
  });
}

export async function update(id: string, data: UpdateClinicData) {
  return prisma.clinic.update({
    where: { id },
    data,
    include: {
      _count: { select: { doctors: true } },
    },
  });
}

export async function softDelete(id: string) {
  return prisma.clinic.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });
}

export async function findDoctors(
  clinicId: string,
  pagination: PaginationParams,
) {
  const { skip, take } = toSkipTake(pagination);

  const where: Prisma.DoctorWhereInput = {
    clinicId,
    status: 'ACTIVE',
  };

  const [doctors, total] = await Promise.all([
    prisma.doctor.findMany({
      where,
      include: {
        user: { include: { profile: true } },
      },
      skip,
      take,
      orderBy: { rating: 'desc' },
    }),
    prisma.doctor.count({ where }),
  ]);

  return { doctors, total };
}
