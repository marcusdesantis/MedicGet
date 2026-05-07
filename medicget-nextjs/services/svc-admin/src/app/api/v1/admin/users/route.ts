import { NextRequest } from 'next/server';
import { withRole } from '@medicget/shared/auth';
import { apiOk } from '@medicget/shared/response';
import { paginate, parsePagination } from '@medicget/shared/paginate';
import { adminService } from '@/modules/admin/admin.service';

export const dynamic = 'force-dynamic';

export const GET = withRole(['ADMIN'], async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const pagination = parsePagination(sp);
  const role   = sp.get('role')   ?? undefined;
  const search = sp.get('search') ?? undefined;
  const { data, total } = await adminService.listUsers({
    page:     pagination.page,
    pageSize: pagination.pageSize,
    role,
    search,
  });
  return apiOk(paginate(data, total, pagination));
});
