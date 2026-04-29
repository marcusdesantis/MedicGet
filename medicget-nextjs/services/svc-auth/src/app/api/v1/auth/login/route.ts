import { NextRequest } from 'next/server';
import { z }           from 'zod';
import { apiOk, apiError } from '@medicget/shared/response';
import { parseBody }       from '@/lib/validate';
import { authService }     from '@/modules/auth/auth.service';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, schema);
  if ('error' in parsed) return parsed.error;

  const result = await authService.login(parsed.data);
  if (!result.ok) return apiError(result.code, result.message);

  return apiOk(result.data, 'Login successful');
}
