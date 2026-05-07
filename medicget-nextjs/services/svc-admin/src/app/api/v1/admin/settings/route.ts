import { NextRequest } from 'next/server';
import { withRole } from '@medicget/shared/auth';
import { apiOk } from '@medicget/shared/response';
import { parseBody } from '@medicget/shared/validate';
import { z } from 'zod';
import { adminService } from '@/modules/admin/admin.service';

export const dynamic = 'force-dynamic';

export const GET = withRole(['ADMIN'], async () => apiOk(await adminService.listSettings()));

const upsertSchema = z.object({
  values: z.record(z.string().nullable()),
});

export const PATCH = withRole(['ADMIN'], async (req: NextRequest, { user }) => {
  const parsed = await parseBody(req, upsertSchema);
  if ('error' in parsed) return parsed.error;
  await adminService.upsertSettings(parsed.data.values, user.id);
  return apiOk(await adminService.listSettings(), 'Configuración guardada');
});
