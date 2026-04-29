import { NextRequest }        from 'next/server';
import { z }                  from 'zod';
import { apiOk, apiError }    from '@medicget/shared/response';
import { withAuth }           from '@medicget/shared/auth';
import { parsePagination }    from '@/lib/paginate';
import { parseBody }          from '@/lib/validate';
import { appointmentsService } from '@/modules/appointments/appointments.service';

export const dynamic = 'force-dynamic';

// GET /api/v1/appointments
export const GET = withAuth(async (req: NextRequest, { user }) => {
  const sp         = req.nextUrl.searchParams;
  const pagination = parsePagination(sp);
  const rawFilters = {
    status:   sp.get('status')   ?? undefined,
    dateFrom: sp.get('dateFrom') ?? undefined,
    dateTo:   sp.get('dateTo')   ?? undefined,
  };

  const result = await appointmentsService.list(user, rawFilters, pagination);
  if (!result.ok) return apiError(result.code, result.message);
  return apiOk(result.data);
});

// POST /api/v1/appointments
const createSchema = z.object({
  patientId: z.string().cuid(),
  doctorId:  z.string().cuid(),
  clinicId:  z.string().cuid(),
  date:      z.string().refine((v) => !isNaN(Date.parse(v)), 'Invalid date'),
  time:      z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  price:     z.number().positive(),
  notes:     z.string().optional(),
});

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const parsed = await parseBody(req, createSchema);
  if ('error' in parsed) return parsed.error;

  const result = await appointmentsService.create(
    { ...parsed.data, date: new Date(parsed.data.date) },
    user,
  );
  if (!result.ok) return apiError(result.code, result.message);
  return apiOk(result.data, 'Appointment created', { status: 201 });
});
