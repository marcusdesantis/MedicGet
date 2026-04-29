import { NextRequest } from 'next/server';
import { withAuth, withRole } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { parseBody } from '@medicget/shared/validate';
import { appointmentsService } from '@/modules/appointments/appointments.service';
import { updateSchema } from '@/modules/appointments/appointments.schemas';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (req: NextRequest, { user, params }) => {
    const { id } = params;
    const result = await appointmentsService.getById(id, user);
    if (!result.ok) return apiError(result.code, result.message);
    return apiOk(result.data);
  },
);

export const PATCH = withAuth(
  async (req: NextRequest, { user, params }) => {
    const { id }  = params;
    const parsed  = await parseBody(req, updateSchema);
    if ('error' in parsed) return parsed.error;
    const result  = await appointmentsService.update(id, parsed.data, user);
    if (!result.ok) return apiError(result.code, result.message);
    return apiOk(result.data);
  },
);

export const DELETE = withRole(
  ['CLINIC'],
  async (_req: NextRequest, { user, params }) => {
    const { id } = params;
    const result = await appointmentsService.cancel(id, user);
    if (!result.ok) return apiError(result.code, result.message);
    return apiOk(result.data, 'Appointment cancelled');
  },
);
