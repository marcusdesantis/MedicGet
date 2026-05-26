import { NextRequest } from 'next/server';
import { withRole }    from '@medicget/shared/auth';
import { apiOk }       from '@medicget/shared/response';
import { paginate, parsePagination } from '@medicget/shared/paginate';
import { verificationsService } from '@/modules/verifications/verifications.service';

export const dynamic = 'force-dynamic';

/**
 * GET /admin/verifications?status=PENDING_REVIEW|VERIFIED|REJECTED|NOT_SUBMITTED|ALL&page=1
 *
 * Lista de médicos por estado de verificación de licencia. Default
 * PENDING_REVIEW (los que necesitan acción del admin).
 */
export const GET = withRole(['ADMIN'], async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const pagination = parsePagination(sp);
  const statusParam = sp.get('status') ?? 'PENDING_REVIEW';
  const status =
    statusParam === 'NOT_SUBMITTED' || statusParam === 'VERIFIED' ||
    statusParam === 'REJECTED'      || statusParam === 'ALL'
      ? statusParam
      : 'PENDING_REVIEW';

  const { data, total } = await verificationsService.list({
    page:     pagination.page,
    pageSize: pagination.pageSize,
    status,
  });
  return apiOk(paginate(data, total, pagination));
});
