import { NextRequest }     from 'next/server';
import { apiOk, apiError } from '@medicget/shared/response';
import { withAuth }        from '@medicget/shared/auth';
import { doctorsService }  from '@/modules/doctors/doctors.service';

export const dynamic = 'force-dynamic';

// GET /api/v1/doctors/dashboard
export const GET = withAuth(async (_req: NextRequest, { user }) => {
  const result = await doctorsService.dashboard(user);
  if (!result.ok) return apiError(result.code, result.message);
  return apiOk(result.data);
});
