import { type NextRequest } from 'next/server';
import { apiOk, apiError } from '@medicget/shared/response';
import { withAuth } from '@medicget/shared/auth';
import { parsePagination } from '@/lib/paginate';
import { patientsService } from '@/modules/patients/patients.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (req: NextRequest, { user, params }) => {
    try {
      const { id }     = params;
      const pagination = parsePagination(req.nextUrl.searchParams);
      const result     = await patientsService.getNotifications(id, pagination, user);
      if (!result.ok) return apiError(result.code, result.message);
      return apiOk(result.data);
    } catch (err) {
      console.error('[GET /patients/:id/notifications]', err);
      return apiError('INTERNAL_ERROR', 'Internal server error');
    }
  },
);
