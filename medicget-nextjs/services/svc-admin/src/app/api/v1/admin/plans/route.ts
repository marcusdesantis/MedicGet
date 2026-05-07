import { NextRequest } from 'next/server';
import { withRole } from '@medicget/shared/auth';
import { apiOk } from '@medicget/shared/response';
import { parseBody } from '@medicget/shared/validate';
import { z } from 'zod';
import { adminService } from '@/modules/admin/admin.service';

export const dynamic = 'force-dynamic';

const planSchema = z.object({
  code:         z.enum(['FREE', 'PRO', 'PREMIUM']),
  audience:     z.enum(['DOCTOR', 'CLINIC']),
  name:         z.string().min(1),
  description:  z.string().optional(),
  monthlyPrice: z.number().nonnegative(),
  modules:      z.array(z.string()).default([]),
  limits:       z.record(z.unknown()).nullable().optional(),
  isActive:     z.boolean().optional(),
  sortOrder:    z.number().int().optional(),
});

export const GET  = withRole(['ADMIN'], async () => apiOk(await adminService.listPlans()));

export const POST = withRole(['ADMIN'], async (req: NextRequest) => {
  const parsed = await parseBody(req, planSchema);
  if ('error' in parsed) return parsed.error;
  return apiOk(await adminService.createPlan(parsed.data), 'Plan creado', { status: 201 });
});
