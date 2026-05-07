import { NextRequest } from 'next/server';
import { withAuth } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { parseBody } from '@medicget/shared/validate';
import { paymentService } from '@/modules/payment/payment.service';
import { checkoutSchema }  from '@/modules/payment/payment.schemas';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/appointments/:id/payment/checkout
 *
 * Body: { responseUrl, cancellationUrl? }
 *
 * Returns the PayPhone redirect URL the patient must open to complete
 * the payment. Idempotent — returns the existing URL if the patient
 * already started a payment that hasn't expired.
 */
export const POST = withAuth<{ id: string }>(
  async (req: NextRequest, { user, params }) => {
    const { id } = params;
    const parsed = await parseBody(req, checkoutSchema);
    if ('error' in parsed) return parsed.error;
    const result = await paymentService.checkout(id, user, parsed.data);
    if (!result.ok) return apiError(result.code, result.message);
    return apiOk(result.data, 'Checkout iniciado');
  },
);
