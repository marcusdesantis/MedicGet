import { NextRequest } from 'next/server';
import { z }           from 'zod';
import { Role }        from '@prisma/client';
import { apiOk, apiError } from '@medicget/shared/response';
import { parseBody }       from '@/lib/validate';
import { authService }     from '@/modules/auth/auth.service';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email:     z.string().email(),
  password:  z.string().min(6, 'Password must be at least 6 characters'),
  role:      z.nativeEnum(Role),
  firstName: z.string().min(1),
  lastName:  z.string().min(1),
  phone:     z.string().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, schema);
  if ('error' in parsed) return parsed.error;

  const result = await authService.register(parsed.data);
  if (!result.ok) return apiError(result.code, result.message);

  return apiOk(result.data, 'Registration successful');
}
