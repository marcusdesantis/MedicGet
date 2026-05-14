import { NextRequest } from 'next/server';
import { withRole, signToken } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { prisma } from '@medicget/shared/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/admin/users/:id/impersonate
 *
 * Genera un JWT con la identidad del usuario target. El superadmin lo
 * usa para "entrar como" cualquier cuenta desde el panel sin necesidad
 * de conocer la contraseña.
 *
 * Restricciones:
 *   • Solo rol ADMIN puede llamar a este endpoint.
 *   • El target debe existir y estar ACTIVE / PENDING_VERIFICATION
 *     (NO se puede impersonar usuarios DELETED o INACTIVE).
 *   • NO se puede impersonar a otro ADMIN — defensa contra escalation
 *     interna si en el futuro hay múltiples admins con jerarquías.
 *
 * Auditoría: cada impersonación se loggea a stdout (visible en
 * `docker logs medicget-svc-admin`) con el id del admin caller y el
 * target. Por ahora no persistimos en una tabla AuditLog porque no
 * existe en el schema.
 */
export const POST = withRole<{ id: string }>(
  ['ADMIN'],
  async (_req: NextRequest, { user, params }) => {
    const { id } = params;

    if (id === user.id) {
      return apiError('BAD_REQUEST', 'No tiene sentido impersonarte a vos mismo.');
    }

    const target = await prisma.user.findUnique({
      where:  { id },
      select: { id: true, email: true, role: true, status: true },
    });
    if (!target) {
      return apiError('NOT_FOUND', 'Usuario no encontrado.');
    }
    if (target.status === 'DELETED' || target.status === 'INACTIVE') {
      return apiError('FORBIDDEN', 'La cuenta target no está activa.');
    }
    if (target.role === 'ADMIN') {
      return apiError('FORBIDDEN', 'No se puede impersonar a otro administrador.');
    }

    // eslint-disable-next-line no-console
    console.log(
      `[admin/impersonate] admin=${user.id} (${user.email}) → target=${target.id} (${target.email}, role=${target.role})`,
    );

    // Generamos un token corto (1h) para impersonaciones — el admin no
    // debería pasar más tiempo logueado como otro usuario que el
    // estrictamente necesario para diagnosticar.
    const token = signToken(
      { sub: target.id, email: target.email, role: target.role },
      '1h',
    );

    return apiOk({
      token,
      user: {
        id:    target.id,
        email: target.email,
        role:  target.role,
      },
    });
  },
);
