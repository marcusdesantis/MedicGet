import { NextRequest }     from 'next/server';
import { apiOk, apiError } from '@medicget/shared/response';
import { withAuth }        from '@medicget/shared/auth';
import { parsePagination } from '@/lib/paginate';
import { patientsService } from '@/modules/patients/patients.service';

export const dynamic = 'force-dynamic';

// GET /api/v1/patients
export const GET = withAuth(async (req: NextRequest, { user }) => {
  const sp         = req.nextUrl.searchParams;
  const pagination = parsePagination(sp);
  const rawFilters = {
    search:   sp.get('search')   ?? undefined,
    clinicId: sp.get('clinicId') ?? undefined,
  };

  const result = await patientsService.list(rawFilters, pagination, user);
  if (!result.ok) return apiError(result.code, result.message);
  return apiOk(result.data);
});
