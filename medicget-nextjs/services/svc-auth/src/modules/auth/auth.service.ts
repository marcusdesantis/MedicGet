import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { Prisma, Role } from '@prisma/client';
import { signToken }              from '@medicget/shared/auth';
import { ensureFreeSubscription } from '@medicget/shared/subscription';
import { sendEmail }              from '@medicget/shared/email';
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
  province?: string;
  latitude?: number;
  longitude?: number;

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
  async register(input: RegisterInput): Promise<ServiceResult<{ requiresVerification: true; email: string; user: object }>> {
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
      // Crear con status PENDING_VERIFICATION — el usuario no podrá loguearse
      // hasta hacer click en el link / ingresar el código del email.
      const user = await authRepository.create({
        ...input,
        passwordHash,
        status: 'PENDING_VERIFICATION',
      });

      // Auto-asignar plan FREE a médicos y clínicas. Pacientes y admins no
      // tienen suscripción. Best-effort — si falla seguimos con el alta.
      if (input.role === 'DOCTOR' || input.role === 'CLINIC') {
        await ensureFreeSubscription(user.id, input.role).catch(() => {/* swallow */});
      }

      // Generar y enviar token de verificación. Best-effort: si falla el
      // envío, el usuario puede pedir reenvío con /auth/resend-verification.
      void issueAndSendVerification(user.id, user.email, input.firstName).catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[authService.register] verification email failed:', err);
      });

      // NO devolvemos token — el usuario debe verificar primero.
      return {
        ok: true,
        data: {
          requiresVerification: true,
          email: user.email,
          user:  sanitizeUser(user)!,
        },
      };
    } catch (err) {
      return handleAuthError(err, 'authService.register');
    }
  },

  async login(input: LoginInput): Promise<ServiceResult<{ token: string; user: object }>> {
    try {
      // Lazy seed the superadmin on first login attempt. Idempotent —
      // does nothing once the row exists.
      await ensureSuperadminSeeded();

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

      // Cuenta pendiente de verificación de email → bloquear login.
      // Usamos un código específico (EMAIL_NOT_VERIFIED) para que el
      // frontend pueda redirigir a /verify-email en lugar de mostrar
      // el toast genérico de 403.
      if (user.status === 'PENDING_VERIFICATION') {
        return {
          ok: false,
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Tu correo todavía no está verificado. Te llevamos a la pantalla de verificación.',
          field: 'email',
        };
      }
      if (user.status === 'INACTIVE' || user.status === 'DELETED') {
        return {
          ok: false,
          code: 'FORBIDDEN',
          message: 'Tu cuenta no está activa. Contactá al soporte.',
        };
      }

      const token = signToken({ sub: user.id, email: user.email, role: user.role });
      return { ok: true, data: { token, user: sanitizeUser(user)! } };
    } catch (err) {
      return handleAuthError(err, 'authService.login');
    }
  },

  /**
   * Verifica el email del usuario. Acepta token (del link) o code (6
   * dígitos del email). Cualquiera de los dos hace match. Marca el token
   * como usado, setea `emailVerifiedAt` y transiciona status a ACTIVE.
   */
  async verifyEmail(input: { token?: string; code?: string; email?: string }): Promise<ServiceResult<{ token: string; user: object }>> {
    try {
      const { prisma } = await import('@medicget/shared/prisma');
      const now = new Date();

      let record: { id: string; userId: string; usedAt: Date | null; expiresAt: Date } | null = null;

      if (input.token) {
        const hash = crypto.createHash('sha256').update(input.token).digest('hex');
        record = await prisma.emailVerificationToken.findUnique({
          where: { tokenHash: hash },
          select: { id: true, userId: true, usedAt: true, expiresAt: true },
        });
      } else if (input.code && input.email) {
        const user = await authRepository.findByEmail(input.email);
        if (user) {
          record = await prisma.emailVerificationToken.findFirst({
            where:  { userId: user.id, code: input.code, usedAt: null },
            orderBy: { createdAt: 'desc' },
            select: { id: true, userId: true, usedAt: true, expiresAt: true },
          });
        }
      } else {
        return { ok: false, code: 'BAD_REQUEST', message: 'Falta token o código de verificación' };
      }

      if (!record) {
        return { ok: false, code: 'NOT_FOUND', message: 'Token o código inválido' };
      }
      if (record.usedAt) {
        return { ok: false, code: 'BAD_REQUEST', message: 'Este enlace/código ya fue usado' };
      }
      if (record.expiresAt < now) {
        return { ok: false, code: 'BAD_REQUEST', message: 'El enlace o código expiró. Pedí uno nuevo.' };
      }

      // Marcar token usado + activar usuario.
      await prisma.$transaction([
        prisma.emailVerificationToken.update({
          where: { id: record.id },
          data:  { usedAt: now },
        }),
        prisma.user.update({
          where: { id: record.userId },
          data:  { status: 'ACTIVE', emailVerifiedAt: now },
        }),
      ]);

      const user = await authRepository.findById(record.userId);
      if (!user) return { ok: false, code: 'INTERNAL', message: 'Usuario no encontrado tras verificar' };

      const jwt = signToken({ sub: user.id, email: user.email, role: user.role });
      return { ok: true, data: { token: jwt, user: sanitizeUser(user)! } };
    } catch (err) {
      return handleAuthError(err, 'authService.verifyEmail');
    }
  },

  /**
   * Reenvía email de verificación. Por privacidad responde OK aunque el
   * email no exista — no queremos filtrar la lista de cuentas.
   */
  async resendVerification(email: string): Promise<ServiceResult<{ ok: true }>> {
    try {
      const user = await authRepository.findByEmail(email);
      if (user && user.status === 'PENDING_VERIFICATION') {
        const firstName = (user as { profile?: { firstName?: string } }).profile?.firstName ?? '';
        // Fire-and-forget — el envío SMTP puede tardar / colgarse si el
        // puerto está bloqueado, no queremos que la API responda 30 s
        // después. Los errores se loguean a stdout, el cliente recibe
        // siempre la misma respuesta opaca (por privacidad).
        void issueAndSendVerification(user.id, user.email, firstName).catch((err) => {
          // eslint-disable-next-line no-console
          console.error('[authService.resendVerification] email failed:', err);
        });
      }
      // Respuesta uniforme: existe o no, válida o no — no filtramos info.
      return { ok: true, data: { ok: true } };
    } catch (err) {
      return handleAuthError(err, 'authService.resendVerification');
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

/* ─────────────── Email verification helpers ─────────────── */

/**
 * Genera un token largo + un código numérico de 6 dígitos, los persiste
 * (hash del token solamente; el plano se manda por email) y envía el
 * email al usuario con ambos accesos (link y código).
 *
 * Vence en 24 h. Single-use (`usedAt`).
 */
async function issueAndSendVerification(userId: string, email: string, firstName: string): Promise<void> {
  const { prisma } = await import('@medicget/shared/prisma');

  // Token plano (URL-safe). Lo embebemos en un link de la app frontend
  // — el dominio se infiere de FRONTEND_URL si está seteada.
  const plainToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash  = crypto.createHash('sha256').update(plainToken).digest('hex');
  const code       = String(Math.floor(100_000 + Math.random() * 900_000));
  const expiresAt  = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.emailVerificationToken.create({
    data: { userId, tokenHash, code, expiresAt },
  });

  const frontendBase = process.env['FRONTEND_URL'] ?? 'http://localhost:5173';
  const verifyUrl    = `${frontendBase}/verify-email?token=${encodeURIComponent(plainToken)}`;

  const html = `
    <!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;margin:0;padding:24px">
      <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0">
        <h1 style="font-size:22px;color:#0f172a;margin:0 0 8px">¡Hola ${firstName || ''}! Verificá tu correo</h1>
        <p style="font-size:14px;color:#475569;line-height:1.6">
          Para terminar tu registro en MedicGet, hacé click en el botón o ingresá el código en la app.
          El enlace y el código son válidos por 24 horas.
        </p>
        <p style="text-align:center;margin:24px 0">
          <a href="${verifyUrl}"
             style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">
            Verificar mi cuenta
          </a>
        </p>
        <div style="background:#f1f5f9;border-radius:12px;padding:18px;text-align:center;margin:16px 0">
          <p style="margin:0 0 6px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.08em;font-weight:600">
            Código de verificación
          </p>
          <p style="margin:0;font-family:ui-monospace,monospace;font-size:28px;font-weight:700;color:#0f172a;letter-spacing:.2em">
            ${code}
          </p>
        </div>
        <p style="font-size:11px;color:#94a3b8;margin:24px 0 0">
          Si no creaste esta cuenta, ignorá este correo. MedicGet · correo automático.
        </p>
      </div>
    </body></html>`;

  const text = [
    `Hola ${firstName || ''},`,
    `Para verificar tu cuenta en MedicGet entrá al siguiente link:`,
    `  ${verifyUrl}`,
    ``,
    `O ingresá el código en la app: ${code}`,
    ``,
    `Válido por 24 horas.`,
  ].join('\n');

  await sendEmail({
    to:      email,
    subject: 'Verificá tu correo en MedicGet',
    html,
    text,
  });
}

/* ─────────────── Superadmin seed ─────────────── */
//
// admin@gmail.com / 12345678 — created on first login attempt against
// any service. We do this in code rather than in a SQL migration so we
// can use bcrypt (a hardcoded hash would couple us to a specific
// bcrypt version + cost). Idempotent thanks to User.email being unique.

let superadminBootstrapped = false;
let superadminInflight: Promise<void> | null = null;

async function ensureSuperadminSeeded(): Promise<void> {
  if (superadminBootstrapped) return;
  if (superadminInflight) return superadminInflight;

  superadminInflight = (async () => {
    try {
      const { prisma } = await import('@medicget/shared/prisma');
      const existing = await prisma.user.findUnique({ where: { email: 'admin@gmail.com' } });
      if (!existing) {
        const hash = await bcrypt.hash('12345678', 10);
        await prisma.user.create({
          data: {
            email:        'admin@gmail.com',
            passwordHash: hash,
            role:         'ADMIN',
            status:       'ACTIVE',
            profile: { create: { firstName: 'Super', lastName: 'Admin' } },
          },
        });
        // eslint-disable-next-line no-console
        console.log('[svc-auth] Superadmin seeded: admin@gmail.com');
      }
      superadminBootstrapped = true;
    } finally {
      superadminInflight = null;
    }
  })();

  return superadminInflight;
}
