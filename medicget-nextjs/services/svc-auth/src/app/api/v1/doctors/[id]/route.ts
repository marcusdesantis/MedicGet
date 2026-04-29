import { NextRequest }     from 'next/server';
import { z }               from 'zod';
import { apiOk, apiError } from '@medicget/shared/response';
import { withAuth }        from '@medicget/shared/auth';
import { parseBody }       from '@/lib/validate';
import { doctorsService }  from '@/modules/doctors/doctors.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth<{ id: string }>(async (_req: NextRequest, { params }) => {
  const { id } = params;
  const result = await doctorsService.getById(id);
  if (!result.ok) return apiError(result.code, result.message);
  return apiOk(result.data);
});

const updateSchema = z.object({
  specialty:       z.string().optional(),
  experience:      z.number().int().min(0).optional(),
  pricePerConsult: z.number().positive().optional(),
  bio:             z.string().optional(),
  consultDuration: z.number().int().min(5).optional(),
  languages:       z.array(z.string()).optional(),
  available:       z.boolean().optional(),
}).strict();

export const PATCH = withAuth<{ id: string }>(async (req: NextRequest, { user, params }) => {
  const { id } = params;
  const parsed = await parseBody(req, updateSchema);
  if ('error' in parsed) return parsed.error;
  const result = await doctorsService.update(id, parsed.data, user);
  if (!result.ok) return apiError(result.code, result.message);
  return apiOk(result.data);
});
