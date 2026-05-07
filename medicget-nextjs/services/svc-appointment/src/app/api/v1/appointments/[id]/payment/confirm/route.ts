import { NextRequest } from 'next/server';
import { withAuth } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { parseBody } from '@medicget/shared/validate';
import { paymentService } from '@/modules/payment/payment.service';
import { confirmSchema }   from '@/modules/payment/payment.schemas';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/appointments/:id/payment/confirm
 *
 * Body: { payphonePaymentId, fakeOk? }
 *
 * Called by the frontend after PayPhone redirects the user back. The
 * server hits PayPhone's /Confirm endpoint, then updates the local
 * Payment row and (on success) flips the appointment to UPCOMING.
 *
 * Idempotent — repeated calls on a PAID appointment return the
 * current state without re-confirming.
 */
export const POST = withAuth<{ id: string }>(
  async (req: NextRequest, { user, params }) => {
    const { id } = params;
    const parsed = await parseBody(req, confirmSchema);
    if ('error' in parsed) return parsed.error;
    const result = await paymentService.confirm(id, user, parsed.data);
    if (!result.ok) return apiError(result.code, result.message);
    return apiOk(result.data, 'Pago procesado');
  },
);
