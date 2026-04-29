import { NextRequest } from 'next/server';
import { apiOk, apiError } from '@medicget/shared/response';
import { withAuth } from '@medicget/shared/auth';
import { parsePagination } from '@/lib/paginate';
import { listUsers } from '@/modules/users/users.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const sp = req.nextUrl.searchParams;
  const pagination = parsePagination(sp);
  const search = sp.get('search') ?? undefined;

  const result = await listUsers(user, pagination, search);

  if (!result.ok) {
    return apiError(result.code as Parameters<typeof apiError>[0], result.message);
  }

  return apiOk(result.data);
});
