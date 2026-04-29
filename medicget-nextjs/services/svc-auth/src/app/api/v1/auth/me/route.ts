import { NextRequest }     from 'next/server';
import { apiOk, apiError } from '@medicget/shared/response';
import { withAuth }        from '@medicget/shared/auth';
import { authService }     from '@/modules/auth/auth.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_req: NextRequest, { user }) => {
  const result = await authService.me(user.id);
  if (!result.ok) return apiError(result.code, result.message);
  return apiOk(result.data);
});
