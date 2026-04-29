import { NextRequest }     from 'next/server';
import { apiOk, apiError } from '@medicget/shared/response';
import { withAuth }        from '@medicget/shared/auth';
import { parsePagination } from '@/lib/paginate';
import { doctorsService }  from '@/modules/doctors/doctors.service';

export const dynamic = 'force-dynamic';

// GET /api/v1/doctors
export const GET = withAuth(async (req: NextRequest) => {
  const sp         = req.nextUrl.searchParams;
  const pagination = parsePagination(sp);
  const rawFilters = {
    specialty: sp.get('specialty') ?? undefined,
    available: sp.get('available') ?? undefined,
    clinicId:  sp.get('clinicId')  ?? undefined,
    search:    sp.get('search')    ?? undefined,
  };

  const result = await doctorsService.list(rawFilters, pagination);
  return apiOk(result.data);
});
