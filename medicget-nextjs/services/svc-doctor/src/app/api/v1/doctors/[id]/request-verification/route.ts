import { type NextRequest } from 'next/server';
import { withAuth } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { parseBody } from '@medicget/shared/validate';
import { z } from 'zod';
import { licenseService } from '@/modules/doctors/license.service';

export const dynamic = 'force-dynamic';

const schema = z.object({
  /// Cédula ecuatoriana de 10 dígitos. Se valida módulo 10 en el service.
  nationalId: z.string().trim().min(10).max(13),
}).strict();

/**
 * POST /doctors/:id/request-verification
 *
 * Intenta verificar automáticamente la habilitación del médico contra
 * ACESS por cédula. Solo el médico dueño puede llamar.
 *
 * Respuesta:
 *   { autoVerified: true }  → quedó VERIFIED, ya aparece en búsqueda.
 *   { autoVerified: false } → ACESS no confirmó; el frontend debe ofrecer
 *                             el flujo manual (subir documento).
 */
export const POST = withAuth<{ id: string }>(async (req: NextRequest, { user, params }) => {
  const parsed = await parseBody(req, schema);
  if ('error' in parsed) return parsed.error;
  const result = await licenseService.requestAutoVerification(params.id, user, parsed.data.nationalId);
  if (!result.ok) return apiError(result.code, result.message);
  return apiOk(result.data);
});
