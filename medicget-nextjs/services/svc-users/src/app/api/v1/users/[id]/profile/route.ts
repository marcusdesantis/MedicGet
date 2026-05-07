import { NextRequest } from 'next/server';
import { apiOk, apiError } from '@medicget/shared/response';
import { withAuth } from '@medicget/shared/auth';
import { parseBody } from '@/lib/validate';
import { getProfile, updateProfile } from '@/modules/users/users.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateProfileSchema = z
  .object({
    firstName: z.string().min(1).optional(),
    lastName:  z.string().min(1).optional(),
    phone:     z.string().optional(),
    address:   z.string().optional(),
    city:      z.string().optional(),
    country:   z.string().optional(),
    /**
     * Foto de perfil. Por ahora un dataURL (`data:image/jpeg;base64,...`)
     * generado client-side por <AvatarUploader>. Cap de 1 MB cubre 400×400
     * JPEG @ 80% sin problema. Si en el futuro migramos a S3, esto pasa
     * a ser una URL https.
     */
    avatarUrl: z.string().max(1_500_000).optional(),
  })
  .strict();

export const GET = withAuth(
  async (_req: NextRequest, { user, params }) => {
    const { id } = params;
    const result = await getProfile(user, id);
    if (!result.ok) return apiError(result.code as Parameters<typeof apiError>[0], result.message);
    return apiOk(result.data);
  },
);

export const PATCH = withAuth(
  async (req: NextRequest, { user, params }) => {
    const { id } = params;
    const parsed = await parseBody(req, updateProfileSchema);
    if ('error' in parsed) return parsed.error;
    const result = await updateProfile(user, id, parsed.data);
    if (!result.ok) return apiError(result.code as Parameters<typeof apiError>[0], result.message);
    return apiOk(result.data);
  },
);
