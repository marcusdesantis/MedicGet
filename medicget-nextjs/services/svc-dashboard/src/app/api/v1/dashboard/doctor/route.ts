import { NextRequest } from 'next/server';
import { withRole } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { dashboardService } from '@/modules/dashboard/dashboard.service';

export const dynamic = 'force-dynamic';

export const GET = withRole(['DOCTOR'], async (_req: NextRequest, { user }) => {
  const result = await dashboardService.doctor(user);
  if (!result.ok) return apiError(result.code, result.message);
  return apiOk(result.data);
});
