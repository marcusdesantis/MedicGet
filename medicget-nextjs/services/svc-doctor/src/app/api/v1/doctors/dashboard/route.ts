import { type NextRequest } from 'next/server';
import { apiOk, apiError } from '@medicget/shared/response';
import { withRole } from '@medicget/shared/auth';
import { doctorsService } from '@/modules/doctors/doctors.service';

export const dynamic = 'force-dynamic';

export const GET = withRole(
  ['DOCTOR'],
  async (_req: NextRequest, { user }) => {
    try {
      const result = await doctorsService.getDashboard(user);
      if (!result.ok) return apiError(result.code, result.message);
      return apiOk(result.data);
    } catch (err) {
      console.error('[GET /doctors/dashboard]', err);
      return apiError('INTERNAL_ERROR', 'Internal server error');
    }
  },
);
