import { type NextRequest } from 'next/server';
import { apiOk, apiError } from '@medicget/shared/response';
import { withAuth } from '@medicget/shared/auth';
import { parsePagination } from '@/lib/paginate';
import { patientsService } from '@/modules/patients/patients.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const sp         = req.nextUrl.searchParams;
      const pagination = parsePagination(sp);
      const filters: Record<string, string | undefined> = {
        search:   sp.get('search')   ?? undefined,
        clinicId: sp.get('clinicId') ?? undefined,
      };
      const result = await patientsService.list(filters, pagination, user);
      if (!result.ok) return apiError(result.code, result.message);
      return apiOk(result.data);
    } catch (err) {
      console.error('[GET /patients]', err);
      return apiError('INTERNAL_ERROR', 'Internal server error');
    }
  },
);
