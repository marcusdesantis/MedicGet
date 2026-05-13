import { NextRequest } from 'next/server';
import { z }           from 'zod';
import { apiOk, apiError } from '@medicget/shared/response';
import { parseBody }       from '@/lib/validate';
import { authService }     from '@/modules/auth/auth.service';

export const dynamic = 'force-dynamic';

/**
 * Reenvía email de verificación. Por privacidad responde 200 siempre,
 * sin importar si el email existe — esto evita filtrar la lista de
 * cuentas registradas a un atacante.
 */
const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, schema);
  if ('error' in parsed) return parsed.error;

  const result = await authService.resendVerification(parsed.data.email);
  if (!result.ok) return apiError(result.code, result.message);
  return apiOk(result.data, 'Si la cuenta existe y está pendiente, te reenviamos el email.');
}
