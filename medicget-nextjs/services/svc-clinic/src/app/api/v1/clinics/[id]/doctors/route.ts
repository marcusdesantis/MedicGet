import { NextRequest, NextResponse } from 'next/server';
import { apiOk, apiError } from '@medicget/shared/response';
import { type RouteContext } from '@medicget/shared/auth';
import { parsePagination } from '@/lib/paginate';
import { listClinicDoctors } from '@/modules/clinics/clinics.service';

export const dynamic = 'force-dynamic';

// GET /api/v1/clinics/:id/doctors — public
export async function GET(
  req: NextRequest,
  context: RouteContext<{ id: string }>,
): Promise<NextResponse> {
  const { id }     = await context.params;
  const sp         = req.nextUrl.searchParams;
  const pagination = parsePagination(sp);
  const result     = await listClinicDoctors(id, pagination);
  if (!result.ok) return apiError(result.code as Parameters<typeof apiError>[0], result.message);
  return apiOk(result.data);
}
