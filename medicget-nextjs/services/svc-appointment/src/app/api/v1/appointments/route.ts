import { NextRequest } from 'next/server';
import { withAuth, withRole } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { parsePagination } from '@medicget/shared/paginate';
import { parseBody } from '@medicget/shared/validate';
import { appointmentsService } from '@/modules/appointments/appointments.service';
import { createSchema } from '@/modules/appointments/appointments.schemas';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const sp = req.nextUrl.searchParams;
  const pagination = parsePagination(sp);
  const rawFilters: Record<string, string> = {};

  for (const key of ['status', 'dateFrom', 'dateTo', 'doctorId', 'patientId']) {
    const val = sp.get(key);
    if (val) rawFilters[key] = val;
  }

  const result = await appointmentsService.list(user, rawFilters, pagination);
  if (!result.ok) return apiError(result.code, result.message);
  return apiOk(result.data);
});

export const POST = withRole(['PATIENT', 'CLINIC'], async (req: NextRequest, { user }) => {
  const parsed = await parseBody(req, createSchema);
  if ('error' in parsed) return parsed.error;

  const result = await appointmentsService.create(parsed.data, user);
  if (!result.ok) return apiError(result.code, result.message, result.details);
  return apiOk(result.data, 'Appointment created', { status: 201 });
});
