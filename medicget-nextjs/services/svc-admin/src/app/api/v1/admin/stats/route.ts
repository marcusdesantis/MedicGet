import { NextRequest } from 'next/server';
import { withRole } from '@medicget/shared/auth';
import { apiOk } from '@medicget/shared/response';
import { adminService } from '@/modules/admin/admin.service';
import { ensureAdminBootstrapped } from '@/lib/bootstrap';

export const dynamic = 'force-dynamic';

export const GET = withRole(['ADMIN'], async (_req: NextRequest) => {
  await ensureAdminBootstrapped();
  return apiOk(await adminService.stats());
});
