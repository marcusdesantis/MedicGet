import { NextRequest, NextResponse } from 'next/server';
import { apiOk, apiError } from '@medicget/shared/response';
import { withAuth, type RouteContext } from '@medicget/shared/auth';
import { parseBody } from '@/lib/validate';
import { getClinicById, updateClinic, deleteClinic } from '@/modules/clinics/clinics.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateClinicSchema = z
  .object({
    name:        z.string().min(1).optional(),
    address:     z.string().optional(),
    city:        z.string().optional(),
    country:     z.string().optional(),
    description: z.string().optional(),
    phone:       z.string().optional(),
    email:       z.string().email().optional(),
    website:     z.string().url().optional(),
  })
  .strict();

// GET /api/v1/clinics/:id — public
export async function GET(
  _req: NextRequest,
  context: RouteContext<{ id: string }>,
): Promise<NextResponse> {
  const { id } = await context.params;
  const result  = await getClinicById(id);
  if (!result.ok) return apiError(result.code as Parameters<typeof apiError>[0], result.message);
  return apiOk(result.data);
}

// PATCH /api/v1/clinics/:id — CLINIC role required
export const PATCH = withAuth(
  async (req: NextRequest, { user, params }) => {
    const { id }  = params;
    const parsed  = await parseBody(req, updateClinicSchema);
    if ('error' in parsed) return parsed.error;
    const result  = await updateClinic(user, id, parsed.data);
    if (!result.ok) return apiError(result.code as Parameters<typeof apiError>[0], result.message);
    return apiOk(result.data);
  },
);

// DELETE /api/v1/clinics/:id — CLINIC role required
export const DELETE = withAuth(
  async (_req: NextRequest, { user, params }) => {
    const { id } = params;
    const result  = await deleteClinic(user, id);
    if (!result.ok) return apiError(result.code as Parameters<typeof apiError>[0], result.message);
    return apiOk(result.data, 'Clinic deleted successfully.');
  },
);
