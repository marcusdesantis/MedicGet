import { type NextRequest } from 'next/server';
import { apiOk, apiError } from '@medicget/shared/response';
import { withAuth, type RouteContext } from '@medicget/shared/auth';
import { parseBody } from '@/lib/validate';
import { updateDoctorSchema } from '@/modules/doctors/doctors.schemas';
import { doctorsService } from '@/modules/doctors/doctors.service';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: RouteContext<{ id: string }>,
) {
  try {
    const { id } = await context.params;
    const result = await doctorsService.getById(id);
    if (!result.ok) return apiError(result.code, result.message);
    return apiOk(result.data);
  } catch (err) {
    console.error('[GET /doctors/:id]', err);
    return apiError('INTERNAL_ERROR', 'Internal server error');
  }
}

export const PATCH = withAuth(
  async (req: NextRequest, { user, params }) => {
    try {
      const { id } = params;
      const body   = await parseBody(req, updateDoctorSchema);
      if ('error' in body) return body.error;
      const result = await doctorsService.update(id, body.data, user);
      if (!result.ok) return apiError(result.code, result.message);
      return apiOk(result.data);
    } catch (err) {
      console.error('[PATCH /doctors/:id]', err);
      return apiError('INTERNAL_ERROR', 'Internal server error');
    }
  },
);
