import { type NextRequest } from 'next/server';
import { apiOk, apiError } from '@medicget/shared/response';
import { withAuth } from '@medicget/shared/auth';
import { patientsService } from '@/modules/patients/patients.service';

export const dynamic = 'force-dynamic';

export const PATCH = withAuth(
  async (_req: NextRequest, { user, params }) => {
    try {
      const { id, notifId } = params;
      const result = await patientsService.markNotifRead(id, notifId, user);
      if (!result.ok) return apiError(result.code, result.message);
      return apiOk(result.data);
    } catch (err) {
      console.error('[PATCH /patients/:id/notifications/:notifId]', err);
      return apiError('INTERNAL_ERROR', 'Internal server error');
    }
  },
);
