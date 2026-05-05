import bcrypt from 'bcryptjs';
import { Prisma, Role } from '@prisma/client';
import { signToken }      from '@medicget/shared/auth';
import { authRepository } from './auth.repository';

/**
 * Inputs accepted by `register`. Common fields are required for every role;
 * role-specific fields are optional and only consulted when relevant.
 */
export interface RegisterInput {
  // Auth + Profile (every role)
  email:     string;
  password:  string;
  role:      Role;
  firstName: string;
  lastName:  string;
  phone?:    string;
  address?:  string;
  city?:     string;
  country?:  string;

  // Clinic role
  clinicName?:        string;
  clinicDescription?: string;
  clinicPhone?:       string;
  clinicEmail?:       string;
  clinicWebsite?:     string;

  // Doctor role (currently accepted but not persisted to a Doctor row —
  // see comment in auth.repository.ts:create)
  specialty?:       string;
  licenseNumber?:   string;
  experience?:      number;
  pricePerConsult?: number;
}

export interface LoginInput {
  email:    string;
  password: string;
}

/**
 * `field` is an optional hint that tells the front-end which form field the
 * error should be attached to (e.g. "email" for a unique-violation conflict).
 * The route handler forwards it as `details.field` in the API error body so
 * the UI can either render an inline error or — when the field belongs to a
 * previous wizard step — show an alert with a "go back to step N" button.
 */
export type ServiceResult<T> =
  | { ok: true;  data: T }
  | { ok: false; code: string; message: string; field?: string };

function sanitizeUser(user: Awaited<ReturnType<typeof authRepository.findById>>) {
  if (!user) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safe } = user;
  return safe;
}

/**
 * Maps Prisma errors to API-friendly `ServiceResult` failures, and logs the
 * full error to stdout so it shows up in `docker compose logs svc-auth`.
 *
 * Without this wrapper any Prisma exception (unique violation, foreign key,
 * etc.) bubbles all the way up to Next.js and surfaces as a generic 500 with
 * no body — exactly what we hit on duplicate-email registration.
 */
function handleAuthError(err: unknown, context: string): ServiceResult<never> {
  // eslint-disable-next-line no-console
  console.error(`[${context}]`, err);

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002 = unique constraint violation. Most commonly hit on User.email.
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined) ?? [];
      const field  = target[0]; // e.g. "email"
      const isEmail = target.includes('email');
      return {
        ok: false,
        code: 'CONFLICT',
        message: isEmail
          ? 'Este correo ya está registrado. Inicia sesión o usa otro correo.'
          : `Ya existe un registro con el mismo ${target.join(', ') || 'campo único'}`,
        field,
      };
    }
    // P2003 = foreign key constraint failure
    if (err.code === 'P2003') {
      return {
        ok: false,
        code: 'BAD_REQUEST',
        message: 'Una referencia requerida no existe (clinic, etc.)',
      };
    }
    // P2021 = table does not exist. Almost always means the dev forgot to run
    // `npm run prisma:deploy` to apply migrations to a fresh database.
    if (err.code === 'P2021') {
      return {
        ok: false,
        code: 'INTERNAL',
        message:
          'La base de datos no está inicializada. Ejecuta `npm run prisma:deploy` en el servidor.',
      };
    }
    // P2022 = column does not exist (schema drift)
    if (err.code === 'P2022') {
      return {
        ok: false,
        code: 'INTERNAL',
        message:
          'El esquema de la base de datos está desactualizado. Ejecuta `npm run prisma:deploy`.',
      };
    }
    return {
      ok: false,
      code: 'BAD_REQUEST',
      message: `Error de base de datos: ${err.code}`,
    };
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    return {
      ok: false,
      code: 'BAD_REQUEST',
      message: 'Datos de registro inválidos para la base de datos',
    };
  }
  // Unknown error — return a clean message but log the full trace above.
  const msg = err instanceof Error ? err.message : 'Unknown error';
  return { ok: false, code: 'INTERNAL', message: `Operación falló: ${msg}` };
}

export const authService = {
  async register(input: RegisterInput): Promise<ServiceResult<{ token: string; user: object }>> {
    try {
      const existing = await authRepository.findByEmail(input.email);
      if (existing) {
        return {
          ok: false,
          code: 'CONFLICT',
          message: 'Este correo ya está registrado. Inicia sesión o usa otro correo.',
          field: 'email',
        };
      }

      const passwordHash = await bcrypt.hash(input.password, 10);
      const user = await authRepository.create({ ...input, passwordHash });

      const token = signToken({ sub: user.id, email: user.email, role: user.role });
      return { ok: true, data: { token, user: sanitizeUser(user)! } };
    } catch (err) {
      return handleAuthError(err, 'authService.register');
    }
  },

  async login(input: LoginInput): Promise<ServiceResult<{ token: string; user: object }>> {
    try {
      const user = await authRepository.findByEmail(input.email);
      if (!user) {
        return {
          ok: false,
          code: 'UNAUTHORIZED',
          message: 'Correo o contraseña incorrectos',
          field: 'email',
        };
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        return {
          ok: false,
          code: 'UNAUTHORIZED',
          message: 'Correo o contraseña incorrectos',
          field: 'password',
        };
      }

      const token = signToken({ sub: user.id, email: user.email, role: user.role });
      return { ok: true, data: { token, user: sanitizeUser(user)! } };
    } catch (err) {
      return handleAuthError(err, 'authService.login');
    }
  },

  async me(userId: string): Promise<ServiceResult<object>> {
    try {
      const user = await authRepository.findById(userId);
      if (!user) {
        return { ok: false, code: 'NOT_FOUND', message: 'User not found' };
      }
      return { ok: true, data: sanitizeUser(user)! };
    } catch (err) {
      return handleAuthError(err, 'authService.me');
    }
  },
};
