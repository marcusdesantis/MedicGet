import { NextRequest } from 'next/server';
import { withRole } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { parseBody } from '@medicget/shared/validate';
import { z } from 'zod';
import { adminService } from '@/modules/admin/admin.service';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'DELETED']),
}).strict();

export const PATCH = withRole<{ id: string }>(['ADMIN'], async (req: NextRequest, { params }) => {
  const parsed = await parseBody(req, patchSchema);
  if ('error' in parsed) return parsed.error;
  try {
    const updated = await adminService.setUserStatus(params.id, parsed.data.status);
    return apiOk(updated, 'Estado actualizado');
  } catch {
    return apiError('NOT_FOUND', 'Usuario no encontrado');
  }
});

export const DELETE = withRole<{ id: string }>(['ADMIN'], async (_req: NextRequest, { params }) => {
  try {
    const updated = await adminService.setUserStatus(params.id, 'DELETED');
    return apiOk(updated, 'Usuario eliminado');
  } catch {
    return apiError('NOT_FOUND', 'Usuario no encontrado');
  }
});
