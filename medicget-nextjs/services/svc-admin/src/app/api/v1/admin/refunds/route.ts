import { NextRequest } from 'next/server';
import { withRole }    from '@medicget/shared/auth';
import { apiOk }       from '@medicget/shared/response';
import { paginate, parsePagination } from '@medicget/shared/paginate';
import { refundsService } from '@/modules/refunds/refunds.service';

export const dynamic = 'force-dynamic';

/**
 * GET /admin/refunds?status=PENDING|PROCESSED|REJECTED|ALL&page=1&pageSize=20
 *
 * Lista todas las solicitudes de reembolso. Por default trae solo
 * PENDING (las que requieren acción del admin), ordenadas por
 * requestedAt asc (FIFO: las más viejas primero).
 */
export const GET = withRole(['ADMIN'], async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const pagination = parsePagination(sp);
  const statusParam = sp.get('status') ?? 'PENDING';
  const status =
    statusParam === 'PROCESSED' || statusParam === 'REJECTED' || statusParam === 'ALL'
      ? statusParam
      : 'PENDING';

  const { data, total } = await refundsService.list({
    page:     pagination.page,
    pageSize: pagination.pageSize,
    status,
  });
  return apiOk(paginate(data, total, pagination));
});
