import { prisma } from '@medicget/shared/prisma';
import { Prisma, Role } from '@prisma/client';

export interface CreateUserInput {
  email:        string;
  passwordHash: string;
  role:         Role;
  firstName:    string;
  lastName:     string;
  phone?:       string;
}

/**
 * Shared `include` block — every method that returns a User to the service
 * layer must use this so all three return the same type. `sanitizeUser` is
 * typed against `findById`'s return, so any divergence here breaks the
 * register / login / me handlers in auth.service.ts.
 */
const USER_INCLUDE = {
  profile: true,
  clinic:  true,
  doctor:  true,
  patient: true,
} satisfies Prisma.UserInclude;

export const authRepository = {
  async findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email: email.toLowerCase(), status: { not: 'DELETED' } },
      include: USER_INCLUDE,
    });
  },

  async findById(id: string) {
    return prisma.user.findFirst({
      where: { id, status: { not: 'DELETED' } },
      include: USER_INCLUDE,
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
      include: USER_INCLUDE,
    });
  },
};
