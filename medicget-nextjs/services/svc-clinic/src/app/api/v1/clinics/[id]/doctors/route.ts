import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiOk, apiError } from '@medicget/shared/response';
import { withRole } from '@medicget/shared/auth';
import { parsePagination } from '@/lib/paginate';
import { parseBody }       from '@/lib/validate';
import { listClinicDoctors, createDoctorForClinic } from '@/modules/clinics/clinics.service';

export const dynamic = 'force-dynamic';

// GET /api/v1/clinics/:id/doctors — public
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id }     = await context.params;
  const sp         = req.nextUrl.searchParams;
  const pagination = parsePagination(sp);
  const result     = await listClinicDoctors(id, pagination);
  if (!result.ok) return apiError(result.code as Parameters<typeof apiError>[0], result.message);
  return apiOk(result.data);
}

// POST /api/v1/clinics/:id/doctors — clinic only.
//
// Crea un médico nuevo bajo esta clínica con credenciales temporales que
// se mandan por email al médico (y se devuelven en la response para que
// el admin pueda compartirlas en el momento si el email tarda).
const createDoctorSchema = z.object({
  email:           z.string().email(),
  firstName:       z.string().min(1).max(80),
  lastName:        z.string().min(1).max(80),
  phone:           z.string().max(40).optional(),
  specialty:       z.string().min(1).max(120),
  licenseNumber:   z.string().max(80).optional(),
  experience:      z.number().int().min(0).max(80).optional(),
  pricePerConsult: z.number().nonnegative().optional(),
  bio:             z.string().max(2000).optional(),
  consultDuration: z.number().int().min(5).max(240).optional(),
  languages:       z.array(z.string().max(40)).max(10).optional(),
});

export const POST = withRole<{ id: string }>(
  ['CLINIC'],
  async (req: NextRequest, { user, params }) => {
    const parsed = await parseBody(req, createDoctorSchema);
    if ('error' in parsed) return parsed.error;
    const result = await createDoctorForClinic(user, params.id, parsed.data);
    if (!result.ok) return apiError(result.code as Parameters<typeof apiError>[0], result.message);
    return apiOk(result.data, 'Médico creado', { status: 201 });
  },
);
