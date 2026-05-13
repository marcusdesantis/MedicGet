/**
 * Admin service — encapsulates all the operations available to the
 * superadmin role. Each method uses the shared Prisma client.
 */

import { prisma }                 from '@medicget/shared/prisma';
import { invalidateSettingsCache } from '@medicget/shared/settings';
import { Prisma }                 from '@prisma/client';

/**
 * Shape de input para `updateUserFull`. Todos los campos son opcionales —
 * el servicio aplica patch parcial. Para borrar un campo de texto pasar
 * string vacío ('') que se mapea a null.
 */
export interface AdminUserPatch {
  email?:  string;
  status?: 'ACTIVE' | 'INACTIVE' | 'DELETED' | 'PENDING_VERIFICATION';
  profile?: {
    firstName?: string;
    lastName?:  string;
    phone?:     string;
    address?:   string;
    city?:      string;
    province?:  string;
    country?:   string;
    latitude?:  number | null;
    longitude?: number | null;
    avatarUrl?: string;
  };
  clinic?: {
    name?:        string;
    description?: string;
    address?:     string;
    city?:        string;
    province?:    string;
    country?:     string;
    latitude?:    number | null;
    longitude?:   number | null;
    phone?:       string;
    email?:       string;
    website?:     string;
    logoUrl?:     string;
  };
  doctor?: {
    specialty?:       string;
    licenseNumber?:   string;
    experience?:      number;
    pricePerConsult?: number;
    bio?:             string;
    consultDuration?: number;
    languages?:       string[];
    modalities?:      ('ONLINE' | 'PRESENCIAL' | 'CHAT')[];
    available?:       boolean;
  };
  patient?: {
    dateOfBirth?: string;
    bloodType?:   string;
    allergies?:   string[];
    conditions?:  string[];
    medications?: string[];
    notes?:       string;
  };
}

export const adminService = {
  /**
   * Aggregated counts + revenue snapshot used by the admin dashboard.
   * Cheap (~7 lightweight queries) so we don't bother caching.
   */
  async stats() {
    const [
      totalUsers, totalPatients, totalDoctors, totalClinics,
      totalAppointments, paidPayments, activeSubs,
    ] = await Promise.all([
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'PATIENT', status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'DOCTOR',  status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'CLINIC',  status: 'ACTIVE' } }),
      prisma.appointment.count(),
      prisma.payment.aggregate({
        where:  { status: 'PAID' },
        _sum:   { amount: true, platformFee: true },
        _count: true,
      }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    ]);

    return {
      users: {
        total:    totalUsers,
        patients: totalPatients,
        doctors:  totalDoctors,
        clinics:  totalClinics,
      },
      appointments:    { total: totalAppointments },
      revenue: {
        gross:        paidPayments._sum.amount      ?? 0,
        platformFees: paidPayments._sum.platformFee ?? 0,
        paidCount:    paidPayments._count           ?? 0,
      },
      subscriptions: { active: activeSubs },
    };
  },

  /**
   * Paginated user listing with optional role filter and search.
   */
  async listUsers(params: { page: number; pageSize: number; role?: string; search?: string }) {
    const where: Record<string, unknown> = { status: { not: 'DELETED' } };
    if (params.role)   where.role = params.role;
    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { profile: { firstName: { contains: params.search, mode: 'insensitive' } } },
        { profile: { lastName:  { contains: params.search, mode: 'insensitive' } } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          profile: true,
          clinic:  true,
          doctor:  true,
          patient: true,
          subscriptions: {
            where: { status: 'ACTIVE' },
            include: { plan: true },
            orderBy: { expiresAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip:    (params.page - 1) * params.pageSize,
        take:    params.pageSize,
      }),
      prisma.user.count({ where }),
    ]);
    // Strip password hash before returning
    const safe = data.map((u) => {
      const { passwordHash: _ph, ...rest } = u as { passwordHash: string };
      return rest;
    });
    return { data: safe, total };
  },

  async setUserStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'DELETED' | 'PENDING_VERIFICATION') {
    return prisma.user.update({ where: { id }, data: { status } });
  },

  /**
   * Edición completa de un usuario por el superadmin. Acepta cambios en:
   *   • User      (email, status)
   *   • Profile   (nombre, contacto, dirección, geo, avatar)
   *   • Clinic    (si el usuario es CLINIC)
   *   • Doctor    (si el usuario es DOCTOR)
   *   • Patient   (si el usuario es PATIENT)
   *
   * Patrón "patch": cualquier campo undefined se ignora. Strings vacías
   * se ACEPTAN como "borrar el campo" (Profile.phone = '' → null). Para
   * datos existentes, no sobrescribimos lo que no nos mandan.
   */
  async updateUserFull(id: string, input: AdminUserPatch) {
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!existing) throw new Error('User not found');

    const ops: Prisma.PrismaPromise<unknown>[] = [];

    // ─── User core ─────────────────────────────────────────────────────
    const userData: Prisma.UserUpdateInput = {};
    if (input.email  !== undefined) userData.email  = input.email.trim().toLowerCase();
    if (input.status !== undefined) userData.status = input.status;
    if (Object.keys(userData).length > 0) {
      ops.push(prisma.user.update({ where: { id }, data: userData }));
    }

    // ─── Profile ───────────────────────────────────────────────────────
    if (input.profile && Object.keys(input.profile).length > 0) {
      const p = input.profile;
      // Mapeamos undefined → no-op, '' → null para borrar de forma explícita.
      const toNullOrKeep = (v: string | undefined) =>
        v === undefined ? undefined : (v === '' ? null : v);
      const profileData = {
        firstName: p.firstName ?? undefined,
        lastName:  p.lastName  ?? undefined,
        phone:     toNullOrKeep(p.phone),
        address:   toNullOrKeep(p.address),
        city:      toNullOrKeep(p.city),
        province:  toNullOrKeep(p.province),
        country:   toNullOrKeep(p.country),
        latitude:  p.latitude  ?? undefined,
        longitude: p.longitude ?? undefined,
        avatarUrl: toNullOrKeep(p.avatarUrl),
      };
      ops.push(
        prisma.profile.upsert({
          where:  { userId: id },
          update: profileData,
          create: {
            userId:    id,
            firstName: p.firstName ?? '',
            lastName:  p.lastName  ?? '',
            phone:     p.phone     ?? null,
            address:   p.address   ?? null,
            city:      p.city      ?? null,
            province:  p.province  ?? null,
            country:   p.country   ?? null,
            latitude:  p.latitude  ?? null,
            longitude: p.longitude ?? null,
            avatarUrl: p.avatarUrl ?? null,
          },
        }),
      );
    }

    // ─── Role-specific ─────────────────────────────────────────────────
    if (existing.role === 'CLINIC' && input.clinic) {
      const c = input.clinic;
      const data: Prisma.ClinicUpdateInput = {};
      if (c.name        !== undefined) data.name        = c.name;
      if (c.description !== undefined) data.description = c.description || null;
      if (c.address     !== undefined) data.address     = c.address     || null;
      if (c.city        !== undefined) data.city        = c.city        || null;
      if (c.province    !== undefined) data.province    = c.province    || null;
      if (c.country     !== undefined) data.country     = c.country     || null;
      if (c.latitude    !== undefined) data.latitude    = c.latitude;
      if (c.longitude   !== undefined) data.longitude   = c.longitude;
      if (c.phone       !== undefined) data.phone       = c.phone       || null;
      if (c.email       !== undefined) data.email       = c.email       || null;
      if (c.website     !== undefined) data.website     = c.website     || null;
      if (c.logoUrl     !== undefined) data.logoUrl     = c.logoUrl     || null;
      if (Object.keys(data).length > 0) {
        ops.push(prisma.clinic.update({ where: { userId: id }, data }));
      }
    } else if (existing.role === 'DOCTOR' && input.doctor) {
      const d = input.doctor;
      const data: Prisma.DoctorUpdateInput = {};
      if (d.specialty       !== undefined) data.specialty       = d.specialty;
      if (d.licenseNumber   !== undefined) data.licenseNumber   = d.licenseNumber || null;
      if (d.experience      !== undefined) data.experience      = d.experience;
      if (d.pricePerConsult !== undefined) data.pricePerConsult = d.pricePerConsult;
      if (d.bio             !== undefined) data.bio             = d.bio || null;
      if (d.consultDuration !== undefined) data.consultDuration = d.consultDuration;
      if (d.languages       !== undefined) data.languages       = d.languages;
      if (d.modalities      !== undefined) data.modalities      = d.modalities as Prisma.DoctorUpdateInput['modalities'];
      if (d.available       !== undefined) data.available       = d.available;
      if (Object.keys(data).length > 0) {
        ops.push(prisma.doctor.update({ where: { userId: id }, data }));
      }
    } else if (existing.role === 'PATIENT' && input.patient) {
      const p = input.patient;
      const data: Prisma.PatientUpdateInput = {};
      if (p.dateOfBirth !== undefined) data.dateOfBirth = p.dateOfBirth ? new Date(p.dateOfBirth) : null;
      if (p.bloodType   !== undefined) data.bloodType   = p.bloodType || null;
      if (p.allergies   !== undefined) data.allergies   = p.allergies;
      if (p.conditions  !== undefined) data.conditions  = p.conditions;
      if (p.medications !== undefined) data.medications = p.medications;
      if (p.notes       !== undefined) data.notes       = p.notes || null;
      if (Object.keys(data).length > 0) {
        ops.push(prisma.patient.update({ where: { userId: id }, data }));
      }
    }

    if (ops.length > 0) await prisma.$transaction(ops);

    return prisma.user.findUnique({
      where:   { id },
      include: { profile: true, clinic: true, doctor: true, patient: true },
    });
  },

  /* ─────────────── Plans CRUD ─────────────── */

  async listPlans() {
    return prisma.plan.findMany({ orderBy: [{ audience: 'asc' }, { sortOrder: 'asc' }] });
  },

  async createPlan(input: PlanInput) {
    // Normalise optional fields so Prisma.PlanCreateInput is happy regardless
    // of how the Zod schema inferred the parsed object. Prisma's JSON columns
    // require `Prisma.InputJsonValue`; we cast `limits` because Zod gives us
    // a generic Record.
    return prisma.plan.create({
      data: {
        code:         input.code,
        audience:     input.audience,
        name:         input.name,
        description:  input.description ?? null,
        monthlyPrice: input.monthlyPrice,
        modules:      input.modules ?? [],
        limits:       (input.limits ?? undefined) as Prisma.InputJsonValue | undefined,
        isActive:     input.isActive ?? true,
        sortOrder:    input.sortOrder ?? 0,
      },
    });
  },

  async updatePlan(id: string, input: Partial<PlanInput>) {
    // Same JSON dance as createPlan — strip the field if undefined so we
    // don't blow away `limits` on a partial update that only touches
    // other columns.
    const data: Prisma.PlanUpdateInput = {
      ...(input.name         !== undefined && { name:         input.name }),
      ...(input.description  !== undefined && { description:  input.description }),
      ...(input.monthlyPrice !== undefined && { monthlyPrice: input.monthlyPrice }),
      ...(input.modules      !== undefined && { modules:      input.modules }),
      ...(input.isActive     !== undefined && { isActive:     input.isActive }),
      ...(input.sortOrder    !== undefined && { sortOrder:    input.sortOrder }),
      ...(input.limits       !== undefined && {
        limits: input.limits === null
          ? Prisma.JsonNull
          : (input.limits as Prisma.InputJsonValue),
      }),
    };
    return prisma.plan.update({ where: { id }, data });
  },

  async deletePlan(id: string) {
    // Soft-delete by setting isActive=false to preserve subscription FK integrity.
    return prisma.plan.update({ where: { id }, data: { isActive: false } });
  },

  /* ─────────────── Subscriptions ─────────────── */

  async listSubscriptions(params: { page: number; pageSize: number; status?: string }) {
    const where: Record<string, unknown> = {};
    if (params.status) where.status = params.status;
    const [data, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          plan: true,
          user: { include: { profile: true, clinic: true, doctor: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip:    (params.page - 1) * params.pageSize,
        take:    params.pageSize,
      }),
      prisma.subscription.count({ where }),
    ]);
    return { data, total };
  },

  /**
   * Manually extend a subscription by N days. Used by the superadmin to
   * gift / fix issues without going through PayPhone.
   */
  async extendSubscription(id: string, days: number) {
    const sub = await prisma.subscription.findUnique({ where: { id } });
    if (!sub) throw new Error('Subscription not found');
    const newExpires = new Date(Math.max(sub.expiresAt.getTime(), Date.now()) + days * 24 * 60 * 60 * 1000);
    return prisma.subscription.update({
      where: { id },
      data:  { expiresAt: newExpires, status: 'ACTIVE', cancelledAt: null },
    });
  },

  /* ─────────────── App Settings ─────────────── */

  async listSettings() {
    return prisma.appSettings.findMany({ orderBy: [{ category: 'asc' }, { key: 'asc' }] });
  },

  /**
   * Bulk-upsert key/value pairs and invalidate the runtime cache so the
   * change is visible across services on the next request.
   */
  async upsertSettings(updates: Record<string, string | null>, updatedBy: string) {
    const ops = Object.entries(updates).map(([key, value]) =>
      prisma.appSettings.upsert({
        where:  { key },
        update: { value, updatedBy },
        create: { key, value, updatedBy },
      }),
    );
    const result = await Promise.all(ops);
    invalidateSettingsCache();
    return result;
  },
};

export interface PlanInput {
  code:         'FREE' | 'PRO' | 'PREMIUM';
  audience:     'DOCTOR' | 'CLINIC';
  name:         string;
  /** Nullable so PATCH bodies can clear the description (Zod accepts null). */
  description?: string | null;
  monthlyPrice: number;
  /**
   * Zod's `.default([])` infers `string[] | undefined` on the parsed object,
   * not `string[]`, so we accept undefined here and coerce to `[]` inside
   * `createPlan`/`updatePlan`.
   */
  modules?:     string[];
  limits?:      Record<string, unknown> | null;
  isActive?:    boolean;
  sortOrder?:   number;
}
