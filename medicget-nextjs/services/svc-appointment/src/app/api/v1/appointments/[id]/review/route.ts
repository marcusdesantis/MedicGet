import { NextRequest } from 'next/server';
import { withRole } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { parseBody } from '@medicget/shared/validate';
import { appointmentsService } from '@/modules/appointments/appointments.service';
import { reviewSchema } from '@/modules/appointments/appointments.schemas';

export const dynamic = 'force-dynamic';

export const POST = withRole(
  ['PATIENT'],
  async (req: NextRequest, { user, params }) => {
    const { id }  = params;
    const parsed  = await parseBody(req, reviewSchema);
    if ('error' in parsed) return parsed.error;
    const result  = await appointmentsService.createReview(id, parsed.data, user);
    if (!result.ok) return apiError(result.code, result.message);
    return apiOk(result.data, 'Review created', { status: 201 });
  },
);
