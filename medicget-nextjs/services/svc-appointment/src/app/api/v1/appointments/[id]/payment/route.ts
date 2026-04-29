import { NextRequest } from 'next/server';
import { withAuth, withRole } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { parseBody } from '@medicget/shared/validate';
import { appointmentsService } from '@/modules/appointments/appointments.service';
import { updatePaymentSchema } from '@/modules/appointments/appointments.schemas';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (_req: NextRequest, { user, params }) => {
    const { id } = params;
    const result = await appointmentsService.getPayment(id, user);
    if (!result.ok) return apiError(result.code, result.message);
    return apiOk(result.data);
  },
);

export const PATCH = withRole(
  ['CLINIC'],
  async (req: NextRequest, { user, params }) => {
    const { id }  = params;
    const parsed  = await parseBody(req, updatePaymentSchema);
    if ('error' in parsed) return parsed.error;
    const result  = await appointmentsService.updatePayment(id, parsed.data, user);
    if (!result.ok) return apiError(result.code, result.message);
    return apiOk(result.data);
  },
);
