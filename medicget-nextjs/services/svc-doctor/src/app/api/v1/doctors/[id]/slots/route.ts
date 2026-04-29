import { type NextRequest } from 'next/server';
import { apiOk, apiError } from '@medicget/shared/response';
import { type RouteContext } from '@medicget/shared/auth';
import { doctorsService } from '@/modules/doctors/doctors.service';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: RouteContext<{ id: string }>,
) {
  try {
    const { id } = await context.params;
    const date   = req.nextUrl.searchParams.get('date');

    if (!date) {
      return apiError('BAD_REQUEST', 'Query parameter "date" is required (YYYY-MM-DD)');
    }

    const result = await doctorsService.getSlots(id, date);
    if (!result.ok) return apiError(result.code, result.message);
    return apiOk(result.data);
  } catch (err) {
    console.error('[GET /doctors/:id/slots]', err);
    return apiError('INTERNAL_ERROR', 'Internal server error');
  }
}
