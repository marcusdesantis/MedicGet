import { NextRequest } from 'next/server';
import { apiOk, apiError } from '@medicget/shared/response';
import { withAuth } from '@medicget/shared/auth';
import { parseBody } from '@/lib/validate';
import { getUserById, patchUser, softDeleteUser } from '@/modules/users/users.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateUserSchema = z
  .object({
    firstName: z.string().min(1).optional(),
    lastName:  z.string().min(1).optional(),
    phone:     z.string().optional(),
    address:   z.string().optional(),
    city:      z.string().optional(),
    country:   z.string().optional(),
  })
  .strict();

export const GET = withAuth(
  async (_req: NextRequest, { user, params }) => {
    const { id } = params;
    const result = await getUserById(user, id);
    if (!result.ok) return apiError(result.code as Parameters<typeof apiError>[0], result.message);
    return apiOk(result.data);
  },
);

export const PATCH = withAuth(
  async (req: NextRequest, { user, params }) => {
    const { id } = params;
    const parsed = await parseBody(req, updateUserSchema);
    if ('error' in parsed) return parsed.error;
    const result = await patchUser(user, id, parsed.data);
    if (!result.ok) return apiError(result.code as Parameters<typeof apiError>[0], result.message);
    return apiOk(result.data);
  },
);

export const DELETE = withAuth(
  async (_req: NextRequest, { user, params }) => {
    const { id } = params;
    const result = await softDeleteUser(user, id);
    if (!result.ok) return apiError(result.code as Parameters<typeof apiError>[0], result.message);
    return apiOk(result.data, 'User deleted successfully.');
  },
);
