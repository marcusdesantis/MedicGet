import { NextRequest }     from 'next/server';
import { apiOk, apiError } from '@medicget/shared/response';
import { withAuth }        from '@medicget/shared/auth';
import { patientsService } from '@/modules/patients/patients.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth<{ id: string }>(async (_req: NextRequest, { user, params }) => {
  const { id } = params;
  const result = await patientsService.getById(id, user);
  if (!result.ok) return apiError(result.code, result.message);
  return apiOk(result.data);
});
