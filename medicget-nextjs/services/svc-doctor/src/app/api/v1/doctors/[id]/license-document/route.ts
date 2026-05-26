import { type NextRequest } from 'next/server';
import { withAuth } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { parseBody } from '@medicget/shared/validate';
import { z } from 'zod';
import { licenseService } from '@/modules/doctors/license.service';

export const dynamic = 'force-dynamic';

const uploadSchema = z.object({
  /// dataURL completa: `data:image/jpeg;base64,...` o `data:application/pdf;base64,...`.
  dataUrl: z.string().min(50, 'El documento parece estar vacío.'),
}).strict();

/**
 * POST /doctors/:id/license-document
 *
 * Upload (y reemplazo) del documento de licencia médica. Solo el médico
 * dueño puede llamar este endpoint. Tras el upload el status pasa a
 * PENDING_REVIEW y se notifica al admin.
 */
export const POST = withAuth<{ id: string }>(async (req: NextRequest, { user, params }) => {
  const parsed = await parseBody(req, uploadSchema);
  if ('error' in parsed) return parsed.error;
  const result = await licenseService.uploadDocument(params.id, user, parsed.data.dataUrl);
  if (!result.ok) return apiError(result.code, result.message);
  return apiOk(result.data, 'Documento enviado. Recibirás una notificación cuando se revise.');
});

/**
 * GET /doctors/:id/license-document
 *
 * Devuelve la dataURL del documento + metadata. Solo accesible al médico
 * dueño o a un ADMIN. Otros roles (PATIENT, CLINIC) reciben FORBIDDEN.
 */
export const GET = withAuth<{ id: string }>(async (_req: NextRequest, { user, params }) => {
  const result = await licenseService.getDocument(params.id, user);
  if (!result.ok) return apiError(result.code, result.message);
  return apiOk(result.data);
});
