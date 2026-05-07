import { NextRequest } from 'next/server';
import { withRole } from '@medicget/shared/auth';
import { apiOk } from '@medicget/shared/response';
import { parseBody } from '@medicget/shared/validate';
import { z } from 'zod';
import { adminService } from '@/modules/admin/admin.service';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  name:         z.string().min(1).optional(),
  description:  z.string().nullable().optional(),
  monthlyPrice: z.number().nonnegative().optional(),
  modules:      z.array(z.string()).optional(),
  limits:       z.record(z.unknown()).nullable().optional(),
  isActive:     z.boolean().optional(),
  sortOrder:    z.number().int().optional(),
});

export const PATCH = withRole<{ id: string }>(['ADMIN'], async (req: NextRequest, { params }) => {
  const parsed = await parseBody(req, updateSchema);
  if ('error' in parsed) return parsed.error;
  return apiOk(await adminService.updatePlan(params.id, parsed.data));
});

export const DELETE = withRole<{ id: string }>(['ADMIN'], async (_req: NextRequest, { params }) =>
  apiOk(await adminService.deletePlan(params.id), 'Plan desactivado'),
);
