import { type NextRequest } from 'next/server';
import { apiOk, apiError } from '@medicget/shared/response';
import { withAuth } from '@medicget/shared/auth';
import { parseBody } from '@/lib/validate';
import { updatePatientSchema } from '@/modules/patients/patients.schemas';
import { patientsService } from '@/modules/patients/patients.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (_req: NextRequest, { user, params }) => {
    try {
      const { id } = params;
      const result = await patientsService.getById(id, user);
      if (!result.ok) return apiError(result.code, result.message);
      return apiOk(result.data);
    } catch (err) {
      console.error('[GET /patients/:id]', err);
      return apiError('INTERNAL_ERROR', 'Internal server error');
    }
  },
);

export const PATCH = withAuth(
  async (req: NextRequest, { user, params }) => {
    try {
      const { id } = params;
      const body   = await parseBody(req, updatePatientSchema);
      if ('error' in body) return body.error;
      const result = await patientsService.update(id, body.data, user);
      if (!result.ok) return apiError(result.code, result.message);
      return apiOk(result.data);
    } catch (err) {
      console.error('[PATCH /patients/:id]', err);
      return apiError('INTERNAL_ERROR', 'Internal server error');
    }
  },
);
