import { NextRequest } from 'next/server';
import { z }           from 'zod';
import { apiOk, apiError } from '@medicget/shared/response';
import { parseBody }       from '@/lib/validate';
import { authService }     from '@/modules/auth/auth.service';

export const dynamic = 'force-dynamic';

/**
 * Verifica el email del usuario. Acepta dos formas (al menos una es
 * requerida):
 *   • { token: string }            — token largo del link
 *   • { code: string, email: string } — código de 6 dígitos del email
 *
 * En éxito devuelve `{ token, user }` para que el cliente inicie sesión
 * automáticamente sin pedirle password de nuevo.
 */
const schema = z
  .object({
    token: z.string().min(8).optional(),
    code:  z.string().regex(/^\d{6}$/).optional(),
    email: z.string().email().optional(),
  })
  .refine((v) => !!v.token || (!!v.code && !!v.email), {
    message: 'Token o (código + email) requeridos',
  });

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, schema);
  if ('error' in parsed) return parsed.error;

  const result = await authService.verifyEmail(parsed.data);
  if (!result.ok) return apiError(result.code, result.message);
  return apiOk(result.data, 'Email verified');
}
