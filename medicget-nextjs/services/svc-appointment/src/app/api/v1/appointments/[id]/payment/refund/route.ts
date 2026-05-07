import { NextRequest } from 'next/server';
import { withAuth } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { paymentService } from '@/modules/payment/payment.service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/appointments/:id/payment/refund
 *
 * Issues a refund through PayPhone. Authorisation:
 *   • CLINIC admins → can refund any appointment in their clinic.
 *   • PATIENT       → can self-refund only if cita is more than 24h away.
 *   • DOCTOR        → cannot refund (commercial decisions sit with clinics).
 */
export const POST = withAuth<{ id: string }>(
  async (_req: NextRequest, { user, params }) => {
    const { id } = params;
    const result = await paymentService.refund(id, user);
    if (!result.ok) return apiError(result.code, result.message);
    return apiOk(result.data, 'Solicitud de reembolso procesada');
  },
);
