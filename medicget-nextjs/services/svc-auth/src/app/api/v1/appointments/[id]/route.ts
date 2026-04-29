import { NextRequest }        from 'next/server';
import { z }                  from 'zod';
import { AppointmentStatus }  from '@prisma/client';
import { apiOk, apiError }    from '@medicget/shared/response';
import { withAuth }           from '@medicget/shared/auth';
import { parseBody }          from '@/lib/validate';
import { appointmentsService } from '@/modules/appointments/appointments.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth<{ id: string }>(async (_req: NextRequest, { user, params }) => {
  const { id } = params;
  const result = await appointmentsService.getById(id, user);
  if (!result.ok) return apiError(result.code, result.message);
  return apiOk(result.data);
});

const updateSchema = z.object({
  status: z.nativeEnum(AppointmentStatus).optional(),
  date:   z.string().optional(),
  time:   z.string().regex(/^\d{2}:\d{2}$/).optional(),
  notes:  z.string().optional(),
  price:  z.number().positive().optional(),
}).strict();

export const PATCH = withAuth<{ id: string }>(async (req: NextRequest, { user, params }) => {
  const { id } = params;
  const parsed = await parseBody(req, updateSchema);
  if ('error' in parsed) return parsed.error;
  const result = await appointmentsService.update(id, parsed.data as Record<string, unknown>, user);
  if (!result.ok) return apiError(result.code, result.message);
  return apiOk(result.data);
});

export const DELETE = withAuth<{ id: string }>(async (_req: NextRequest, { user, params }) => {
  const { id } = params;
  const result = await appointmentsService.cancel(id, user);
  if (!result.ok) return apiError(result.code, result.message);
  return apiOk(result.data, 'Appointment cancelled');
});
