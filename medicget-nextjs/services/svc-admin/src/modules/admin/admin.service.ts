/**
 * Admin service — encapsulates all the operations available to the
 * superadmin role. Each method uses the shared Prisma client.
 */

import { prisma }                 from '@medicget/shared/prisma';
import { invalidateSettingsCache } from '@medicget/shared/settings';

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

  async setUserStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'DELETED') {
    return prisma.user.update({ where: { id }, data: { status } });
  },

  /* ─────────────── Plans CRUD ─────────────── */

  async listPlans() {
    return prisma.plan.findMany({ orderBy: [{ audience: 'asc' }, { sortOrder: 'asc' }] });
  },

  async createPlan(input: PlanInput) {
    return prisma.plan.create({ data: input });
  },

  async updatePlan(id: string, input: Partial<PlanInput>) {
    return prisma.plan.update({ where: { id }, data: input });
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
  description?: string;
  monthlyPrice: number;
  modules:      string[];
  limits?:      Record<string, unknown> | null;
  isActive?:    boolean;
  sortOrder?:   number;
}
