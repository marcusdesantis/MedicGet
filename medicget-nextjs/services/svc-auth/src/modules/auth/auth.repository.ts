import { prisma } from '@medicget/shared/prisma';
import { Role }   from '@prisma/client';

export interface CreateUserInput {
  email:        string;
  passwordHash: string;
  role:         Role;
  firstName:    string;
  lastName:     string;
  phone?:       string;
}

export const authRepository = {
  async findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email: email.toLowerCase(), status: { not: 'DELETED' } },
      include: { profile: true },
    });
  },

  async findById(id: string) {
    return prisma.user.findFirst({
      where: { id, status: { not: 'DELETED' } },
      include: { profile: true, clinic: true, doctor: true, patient: true },
    });
  },

  async create({ email, passwordHash, role, firstName, lastName, phone }: CreateUserInput) {
    return prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        role,
        profile: { create: { firstName, lastName, phone } },
      },
      include: { profile: true },
    });
  },
};
