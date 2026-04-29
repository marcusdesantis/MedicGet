import { NextRequest }     from 'next/server';
import { apiOk, apiError } from '@medicget/shared/response';
import { withAuth }        from '@medicget/shared/auth';
import { clinicService }   from '@/modules/clinic/clinic.service';

export const dynamic = 'force-dynamic';

// GET /api/v1/clinic/dashboard
export const GET = withAuth(async (_req: NextRequest, { user }) => {
  const result = await clinicService.dashboard(user);
  if (!result.ok) return apiError(result.code, result.message);
  return apiOk(result.data);
});
