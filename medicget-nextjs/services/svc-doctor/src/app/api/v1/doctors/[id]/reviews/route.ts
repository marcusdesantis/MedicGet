import { type NextRequest } from 'next/server';
import { apiOk, apiError } from '@medicget/shared/response';
import { type RouteContext } from '@medicget/shared/auth';
import { parsePagination } from '@/lib/paginate';
import { doctorsService } from '@/modules/doctors/doctors.service';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: RouteContext<{ id: string }>,
) {
  try {
    const { id }     = await context.params;
    const pagination = parsePagination(req.nextUrl.searchParams);
    const result     = await doctorsService.getReviews(id, pagination);
    if (!result.ok) return apiError(result.code, result.message);
    return apiOk(result.data);
  } catch (err) {
    console.error('[GET /doctors/:id/reviews]', err);
    return apiError('INTERNAL_ERROR', 'Internal server error');
  }
}
