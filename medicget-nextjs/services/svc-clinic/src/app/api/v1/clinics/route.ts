import { NextRequest, NextResponse } from 'next/server';
import { apiOk, apiError } from '@medicget/shared/response';
import { withAuth } from '@medicget/shared/auth';
import { parsePagination } from '@/lib/paginate';
import { parseBody } from '@/lib/validate';
import { listClinics, createClinic } from '@/modules/clinics/clinics.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createClinicSchema = z
  .object({
    name:        z.string().min(1),
    address:     z.string().optional(),
    city:        z.string().optional(),
    country:     z.string().optional(),
    description: z.string().optional(),
    phone:       z.string().optional(),
    email:       z.string().email().optional(),
    website:     z.string().url().optional(),
    logoUrl:     z.string().url().optional(),
  })
  .strict();

// GET /api/v1/clinics — public
export async function GET(req: NextRequest): Promise<NextResponse> {
  const sp         = req.nextUrl.searchParams;
  const pagination = parsePagination(sp);
  const search     = sp.get('search') ?? undefined;
  const result     = await listClinics(pagination, search);
  if (!result.ok) return apiError(result.code as Parameters<typeof apiError>[0], result.message);
  return apiOk(result.data);
}

// POST /api/v1/clinics — CLINIC role required
export const POST = withAuth(async (req: NextRequest, { user }) => {
  const parsed = await parseBody(req, createClinicSchema);
  if ('error' in parsed) return parsed.error;
  const result = await createClinic(user, parsed.data);
  if (!result.ok) return apiError(result.code as Parameters<typeof apiError>[0], result.message);
  return apiOk(result.data, 'Clinic created successfully.');
});
