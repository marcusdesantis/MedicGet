import { type NextRequest } from 'next/server';
import { apiOk, apiError } from '@medicget/shared/response';
import { withAuth } from '@medicget/shared/auth';
import { doctorsService } from '@/modules/doctors/doctors.service';

export const dynamic = 'force-dynamic';

export const DELETE = withAuth(
  async (_req: NextRequest, { user, params }) => {
    try {
      const { id, availId } = params;
      const result = await doctorsService.removeAvailability(id, availId, user);
      if (!result.ok) return apiError(result.code, result.message);
      return apiOk(result.data);
    } catch (err) {
      console.error('[DELETE /doctors/:id/availability/:availId]', err);
      return apiError('INTERNAL_ERROR', 'Internal server error');
    }
  },
);
