import { prisma } from '@medicget/shared/prisma';
import { Prisma, Role, UserStatus } from '@prisma/client';

/**
 * Inputs accepted by `create`. The profile, role, and password fields are
 * always required; role-specific fields are optional and only consulted when
 * the matching role is selected.
 */
export interface CreateUserInput {
  email:        string;
  passwordHash: string;
  role:         Role;
  /**
   * Estado inicial del usuario. Default ACTIVE (cuentas creadas por
   * superadmin desde /admin/users). El flujo de auto-registro lo manda
   * en PENDING_VERIFICATION para forzar la verificación de email antes
   * de poder loguearse.
   */
  status?:      UserStatus;
  firstName:    string;
  lastName:     string;
  phone?:       string;
  address?:     string;
  city?:        string;
  country?:     string;
  province?:    string;
  latitude?:    number;
  longitude?:   number;

  // Clinic
  clinicName?:        string;
  clinicDescription?: string;
  clinicPhone?:       string;
  clinicEmail?:       string;
  clinicWebsite?:     string;

  // Doctor (accepted but not persisted to a Doctor row at registration —
  // see comment in `create` below)
  specialty?:       string;
  licenseNumber?:   string;
  experience?:      number;
  pricePerConsult?: number;
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

  /**
   * Creates a user + profile, plus the role-specific record:
   *
   *   • PATIENT → `Patient` row (only requires userId).
   *   • CLINIC  → `Clinic` row with supplied details. Falls back to
   *               `${firstName} Clinic` if no name was provided so we don't
   *               violate the `name` NOT NULL constraint.
   *   • DOCTOR  → `Doctor` row with whatever professional fields the user
   *               provided at registration. `clinicId` is null at this point
   *               (the schema allows it after migration 20260506000000); the
   *               doctor can later link to a clinic from /doctor/setup.
   *               If no specialty was provided, we default to "Médico
   *               General" so the NOT NULL on Doctor.specialty isn't broken
   *               and the user can refine it later.
   *
   * All writes run inside a single Prisma transaction so a failure on the
   * role-specific record rolls back the User + Profile too — no orphans.
   */
  async create(input: CreateUserInput) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email:        input.email.toLowerCase(),
          passwordHash: input.passwordHash,
          role:         input.role,
          // Si el caller pasa status (auto-registro → PENDING_VERIFICATION),
          // se respeta. Sin él, queda ACTIVE por el default del schema.
          ...(input.status ? { status: input.status } : {}),
          profile: {
            create: {
              firstName: input.firstName,
              lastName:  input.lastName,
              phone:     input.phone,
              address:   input.address,
              city:      input.city,
              country:   input.country,
              province:  input.province,
              latitude:  input.latitude,
              longitude: input.longitude,
            },
          },
        },
      });

      if (input.role === 'PATIENT') {
        await tx.patient.create({ data: { userId: user.id } });
      } else if (input.role === 'CLINIC') {
        await tx.clinic.create({
          data: {
            userId:      user.id,
            name:        input.clinicName ?? `${input.firstName} Clinic`,
            description: input.clinicDescription,
            phone:       input.clinicPhone,
            email:       input.clinicEmail,
            website:     input.clinicWebsite,
            address:     input.address,
            city:        input.city,
            country:     input.country,
            province:    input.province,
            latitude:    input.latitude,
            longitude:   input.longitude,
          },
        });
      } else if (input.role === 'DOCTOR') {
        await tx.doctor.create({
          data: {
            userId:          user.id,
            // clinicId stays null until the doctor links a clinic from setup.
            specialty:       input.specialty?.trim() || 'Médico General',
            licenseNumber:   input.licenseNumber,
            experience:      input.experience      ?? 0,
            pricePerConsult: input.pricePerConsult ?? 0,
            // available stays true by default so they show up in search the
            // moment they finish the profile setup. They can toggle off from
            // their dashboard.
          },
        });
      }

      // Re-fetch with the standard include so the return type matches
      // findById/findByEmail. `findUniqueOrThrow` is safe — we just created it.
      return tx.user.findUniqueOrThrow({
        where:   { id: user.id },
        include: USER_INCLUDE,
      });
    });
  },
};
