import { type NextRequest } from 'next/server';
import { apiOk, apiError } from '@medicget/shared/response';
import { parsePagination } from '@/lib/paginate';
import { doctorsService } from '@/modules/doctors/doctors.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const pagination = parsePagination(sp);
    const filters: Record<string, string | undefined> = {
      search:    sp.get('search')    ?? undefined,
      specialty: sp.get('specialty') ?? undefined,
      available: sp.get('available') ?? undefined,
      clinicId:  sp.get('clinicId')  ?? undefined,
      // Public directory filters
      modality:  sp.get('modality')  ?? undefined,
      priceMin:  sp.get('priceMin')  ?? undefined,
      priceMax:  sp.get('priceMax')  ?? undefined,
    };

    const result = await doctorsService.list(filters, pagination);
    if (!result.ok) return apiError(result.code, result.message);
    return apiOk(result.data);
  } catch (err) {
    console.error('[GET /doctors]', err);
    return apiError('INTERNAL_ERROR', 'Internal server error');
  }
}
