import { NextRequest } from 'next/server';
import { withRole } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { parseBody } from '@medicget/shared/validate';
import { z } from 'zod';
import { adminService } from '@/modules/admin/admin.service';

export const dynamic = 'force-dynamic';

const extendSchema = z.object({ days: z.number().int().min(1).max(3650) });

export const POST = withRole<{ id: string }>(['ADMIN'], async (req: NextRequest, { params }) => {
  const parsed = await parseBody(req, extendSchema);
  if ('error' in parsed) return parsed.error;
  try {
    return apiOk(await adminService.extendSubscription(params.id, parsed.data.days), 'Suscripción extendida');
  } catch {
    return apiError('NOT_FOUND', 'Suscripción no encontrada');
  }
});
