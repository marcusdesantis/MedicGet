import { NextRequest } from 'next/server';
import { withAuth } from '@medicget/shared/auth';
import { apiOk } from '@medicget/shared/response';
import { prisma } from '@medicget/shared/prisma';
import { parsePagination, toSkipTake, paginate } from '@medicget/shared/paginate';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/payments
 *
 * Lista pagos con scope por rol:
 *   • ADMIN   → todos (citas + suscripciones)
 *   • CLINIC  → pagos de citas de su clínica
 *   • DOCTOR  → pagos de citas donde es el médico
 *   • PATIENT → pagos propios
 *
 * Query params:
 *   • status   — filtro por Payment.status (PAID, REFUNDED, PENDING, FAILED)
 *   • dateFrom / dateTo — rango ISO sobre paidAt
 *   • page / pageSize  — paginación standard
 *   • audience — SOLO para ADMIN: filtra el tipo de pago.
 *       - "PATIENT" → solo pagos de citas (los que tienen appointmentId)
 *       - "DOCTOR"  → solo pagos de suscripción de planes DOCTOR
 *       - "CLINIC"  → solo pagos de suscripción de planes CLINIC
 *
 * Devuelve cada pago con relaciones para que el frontend pueda
 * renderizar la fila completa (paciente/médico/cita para citas, o
 * usuario/plan para suscripciones).
 */
export const GET = withAuth(async (req: NextRequest, { user }) => {
  const sp = req.nextUrl.searchParams;
  const pagination = parsePagination(sp);
  const { skip, take } = toSkipTake(pagination);

  const where: Prisma.PaymentWhereInput = {};
  const status = sp.get('status');
  if (status) where.status = status as Prisma.EnumPaymentStatusFilter;
  const dateFrom = sp.get('dateFrom');
  const dateTo   = sp.get('dateTo');
  if (dateFrom || dateTo) {
    where.paidAt = {};
    if (dateFrom) (where.paidAt as Prisma.DateTimeFilter).gte = new Date(dateFrom);
    if (dateTo)   (where.paidAt as Prisma.DateTimeFilter).lte = new Date(dateTo);
  }

  // Scope por rol — siempre joinando contra el Appointment.
  if (user.role === 'PATIENT') {
    const p = await prisma.patient.findUnique({ where: { userId: user.id } });
    if (!p) return apiOk(paginate([], 0, pagination));
    where.appointment = { patientId: p.id };
  } else if (user.role === 'DOCTOR') {
    const d = await prisma.doctor.findUnique({ where: { userId: user.id } });
    if (!d) return apiOk(paginate([], 0, pagination));
    where.appointment = { doctorId: d.id };
  } else if (user.role === 'CLINIC') {
    const c = await prisma.clinic.findUnique({ where: { userId: user.id } });
    if (!c) return apiOk(paginate([], 0, pagination));
    where.appointment = { clinicId: c.id };
  }
  // ADMIN no agrega filtros por rol — ve todo. Pero PUEDE filtrar por
  // `?audience=` para acotar a un tipo de pago en particular.
  else if (user.role === 'ADMIN') {
    const audience = sp.get('audience');
    if (audience === 'PATIENT') {
      // Pagos de cita (paciente paga al médico/clínica): tienen appointmentId.
      where.appointmentId = { not: null };
    } else if (audience === 'DOCTOR') {
      // Pagos de suscripción de médicos: subscriptionId presente y plan.audience=DOCTOR.
      where.subscriptionId = { not: null };
      where.subscription   = { plan: { audience: 'DOCTOR' } };
    } else if (audience === 'CLINIC') {
      // Pagos de suscripción de clínicas: subscriptionId presente y plan.audience=CLINIC.
      where.subscriptionId = { not: null };
      where.subscription   = { plan: { audience: 'CLINIC' } };
    }
    // Sin `audience` → admin ve absolutamente todos los pagos mezclados.
  }

  const [data, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        appointment: {
          include: {
            patient: { include: { user: { include: { profile: true } } } },
            doctor:  { include: { user: { include: { profile: true } } } },
            clinic:  true,
          },
        },
        subscription: {
          include: {
            plan: true,
            user: { include: { profile: true } },
          },
        },
      },
      // Más reciente primero. `paidAt` puede ser NULL para pagos
      // PENDING/FAILED — los ponemos al final con `nulls: 'last'` así
      // los pagos completados aparecen arriba.
      orderBy: [{ paidAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
      skip,
      take,
    }),
    prisma.payment.count({ where }),
  ]);

  return apiOk(paginate(data, total, pagination));
});
