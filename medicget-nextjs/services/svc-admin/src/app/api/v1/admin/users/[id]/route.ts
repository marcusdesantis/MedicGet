import { NextRequest } from 'next/server';
import { withRole } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { parseBody } from '@medicget/shared/validate';
import { z } from 'zod';
import { adminService } from '@/modules/admin/admin.service';

export const dynamic = 'force-dynamic';

/**
 * Edición completa de un usuario. Todos los campos son opcionales —
 * Patch parcial. El body puede mezclar User, Profile y datos
 * role-specific. El servicio decide qué tabla tocar según el rol del
 * usuario apuntado.
 */
const patchSchema = z.object({
  email:   z.string().email().optional(),
  status:  z.enum(['ACTIVE', 'INACTIVE', 'DELETED', 'PENDING_VERIFICATION']).optional(),
  profile: z.object({
    firstName: z.string().optional(),
    lastName:  z.string().optional(),
    phone:     z.string().optional(),
    address:   z.string().optional(),
    city:      z.string().optional(),
    province:  z.string().optional(),
    country:   z.string().optional(),
    latitude:  z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    avatarUrl: z.string().optional(),
  }).optional(),
  clinic: z.object({
    name:        z.string().optional(),
    description: z.string().optional(),
    address:     z.string().optional(),
    city:        z.string().optional(),
    province:    z.string().optional(),
    country:     z.string().optional(),
    latitude:    z.number().min(-90).max(90).nullable().optional(),
    longitude:   z.number().min(-180).max(180).nullable().optional(),
    phone:       z.string().optional(),
    email:       z.string().optional(),
    website:     z.string().optional(),
    logoUrl:     z.string().optional(),
  }).optional(),
  doctor: z.object({
    specialty:       z.string().optional(),
    licenseNumber:   z.string().optional(),
    experience:      z.number().int().min(0).optional(),
    pricePerConsult: z.number().min(0).optional(),
    bio:             z.string().optional(),
    consultDuration: z.number().int().min(5).optional(),
    languages:       z.array(z.string()).optional(),
    modalities:      z.array(z.enum(['ONLINE', 'PRESENCIAL', 'CHAT'])).optional(),
    available:       z.boolean().optional(),
  }).optional(),
  patient: z.object({
    dateOfBirth: z.string().optional(),
    bloodType:   z.string().optional(),
    allergies:   z.array(z.string()).optional(),
    conditions:  z.array(z.string()).optional(),
    medications: z.array(z.string()).optional(),
    notes:       z.string().optional(),
  }).optional(),
}).strict();

export const PATCH = withRole<{ id: string }>(['ADMIN'], async (req: NextRequest, { params }) => {
  const parsed = await parseBody(req, patchSchema);
  if ('error' in parsed) return parsed.error;
  try {
    const updated = await adminService.updateUserFull(params.id, parsed.data);
    return apiOk(updated, 'Usuario actualizado');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    if (msg.includes('User not found')) return apiError('NOT_FOUND', 'Usuario no encontrado');
    return apiError('BAD_REQUEST', msg);
  }
});

export const DELETE = withRole<{ id: string }>(['ADMIN'], async (_req: NextRequest, { params }) => {
  try {
    const updated = await adminService.setUserStatus(params.id, 'DELETED');
    return apiOk(updated, 'Usuario eliminado');
  } catch {
    return apiError('NOT_FOUND', 'Usuario no encontrado');
  }
});
