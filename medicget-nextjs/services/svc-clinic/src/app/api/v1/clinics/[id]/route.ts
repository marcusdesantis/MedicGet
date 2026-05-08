import { NextRequest, NextResponse } from 'next/server';
import { apiOk, apiError } from '@medicget/shared/response';
import { withAuth, type RouteContext } from '@medicget/shared/auth';
import { parseBody } from '@/lib/validate';
import { getClinicById, updateClinic, deleteClinic } from '@/modules/clinics/clinics.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Helpers — aceptar email/url válidos O string vacío. El cliente a veces
// manda "" en lugar de omitir el campo cuando el usuario lo borra; en
// vez de fallar la validación con "Invalid email", lo dejamos pasar y
// lo guardamos vacío. La expresión `.or(z.literal(''))` mantiene el
// tipo `string | undefined` para que TS no lo infiera como `unknown`
// (lo que pasa con `z.preprocess`).
const optionalEmail = z.string().email().or(z.literal('')).optional();
const optionalUrl   = z.string().url().or(z.literal('')).optional();

const updateClinicSchema = z
  .object({
    name:        z.string().min(1).optional(),
    address:     z.string().optional(),
    city:        z.string().optional(),
    province:    z.string().optional(),
    country:     z.string().optional(),
    latitude:    z.number().optional(),
    longitude:   z.number().optional(),
    description: z.string().optional(),
    phone:       z.string().optional(),
    email:       optionalEmail,
    website:     optionalUrl,
    /**
     * Logo de la clínica — dataURL `data:image/jpeg;base64,...` generado
     * client-side por <AvatarUploader>. Cap de 1.5 MB cubre 400×400 JPEG
     * @ 80% sin problema. Si en el futuro migramos a S3, esto pasa a ser
     * una URL https.
     */
    logoUrl:     z.string().max(1_500_000).optional(),
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
