import { type NextRequest } from 'next/server';
import { apiOk, apiError } from '@medicget/shared/response';
import { withRole } from '@medicget/shared/auth';
import { patientsService } from '@/modules/patients/patients.service';

export const dynamic = 'force-dynamic';

export const GET = withRole(
  ['PATIENT'],
  async (_req: NextRequest, { user }) => {
    try {
      const result = await patientsService.getDashboard(user);
      if (!result.ok) return apiError(result.code, result.message);
      return apiOk(result.data);
    } catch (err) {
      console.error('[GET /patients/dashboard]', err);
      return apiError('INTERNAL_ERROR', 'Internal server error');
    }
  },
);
