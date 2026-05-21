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
  // ADMIN ve todos los pagos. El parámetro ?audience= quedó obsoleto al
  // eliminar el sistema de suscripciones — ahora todos los pagos son por
  // citas — así que lo ignoramos sin romper compatibilidad con el cliente.

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
