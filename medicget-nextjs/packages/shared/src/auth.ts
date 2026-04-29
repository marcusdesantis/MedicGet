import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { apiError } from './response';
import { requireEnv } from './env';

/* -------------------------------------------------------------------------- */
/*  Public types                                                              */
/* -------------------------------------------------------------------------- */

export interface AuthUser {
  id:    string;
  email: string;
  role:  string;
}

/**
 * RouteContext<P> — the EXACT shape Next.js 15 (App Router) expects as the
 * second argument of a route handler.
 *
 *   `params` is ALWAYS a Promise in Next.js 15 (it must be awaited).
 *
 * Any wrapper exposed to Next.js (e.g. the value of `export const GET = ...`)
 * MUST match this signature — `params` cannot be optional, and cannot be a
 * union of `P | Promise<P>`. Mismatches produce the build error:
 *
 *   "Route has an invalid GET export: Expected RouteContext"
 *
 * Public dynamic routes that do not use `withAuth` should also type their
 * second argument with this same type for consistency.
 */
export interface RouteContext<P extends Record<string, string> = Record<string, string>> {
  params: Promise<P>;
}

/**
 * AuthedContext<P> — the context passed to the INNER handler that you write
 * inside `withAuth(...)` / `withRole(...)`.
 *
 * `params` here is already resolved — no `await` needed. The wrapper unwraps
 * the Promise from Next.js once, validates the JWT, and forwards a plain
 * object to your handler.
 */
export interface AuthedContext<P extends Record<string, string> = Record<string, string>> {
  user:   AuthUser;
  params: P;
}

type Handler<P extends Record<string, string> = Record<string, string>> = (
  req: NextRequest,
  ctx: AuthedContext<P>,
) => Promise<Response> | Response;

/* -------------------------------------------------------------------------- */
/*  JWT helpers                                                               */
/* -------------------------------------------------------------------------- */

function extractToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

function verify(token: string): AuthUser {
  const secret = requireEnv('JWT_SECRET');
  const payload = jwt.verify(token, secret) as jwt.JwtPayload;
  if (
    !payload.sub ||
    typeof payload.email !== 'string' ||
    typeof payload.role  !== 'string'
  ) {
    throw new Error('Invalid token payload');
  }
  return { id: String(payload.sub), email: payload.email, role: payload.role };
}

/* -------------------------------------------------------------------------- */
/*  withAuth — JWT-authenticated route wrapper                                */
/* -------------------------------------------------------------------------- */

/**
 * Wraps a Next.js 15 App Router route handler with JWT authentication.
 *
 * The returned function exposes EXACTLY the Next.js 15 `RouteContext<P>`
 * signature so the framework's type checker accepts it without complaints.
 *
 * Inside, the wrapper:
 *   1. Extracts and verifies the Bearer token.
 *   2. Awaits `ctx.params` once.
 *   3. Calls the inner handler with `{ user, params }` — params already
 *      resolved.
 *
 * Usage:
 *   export const GET = withAuth<{ id: string }>(
 *     async (req, { user, params }) => {
 *       const { id } = params;
 *       ...
 *     },
 *   );
 */
export function withAuth<P extends Record<string, string> = Record<string, string>>(
  handler: Handler<P>,
) {
  return async (req: NextRequest, context: RouteContext<P>): Promise<Response> => {
    const token = extractToken(req);
    if (!token) return apiError('UNAUTHORIZED', 'Missing bearer token');
    try {
      const user   = verify(token);
      const params = (await context.params) ?? ({} as P);
      return handler(req, { user, params });
    } catch {
      return apiError('UNAUTHORIZED', 'Invalid or expired token');
    }
  };
}

/* -------------------------------------------------------------------------- */
/*  withRole — withAuth + role membership check                               */
/* -------------------------------------------------------------------------- */

/**
 * Like `withAuth`, but also enforces that the authenticated user holds one of
 * the supplied roles. Returns 403 FORBIDDEN otherwise.
 *
 * Usage:
 *   export const POST = withRole<{ id: string }>(
 *     ['CLINIC'],
 *     async (req, { user, params }) => { ... },
 *   );
 */
export function withRole<P extends Record<string, string> = Record<string, string>>(
  roles:   string[],
  handler: Handler<P>,
) {
  return withAuth<P>(async (req, ctx) => {
    if (!roles.includes(ctx.user.role)) {
      return apiError('FORBIDDEN', 'Insufficient permissions');
    }
    return handler(req, ctx);
  });
}

/* -------------------------------------------------------------------------- */
/*  Token signing                                                             */
/* -------------------------------------------------------------------------- */

export function signToken(
  payload:   { sub: string; email: string; role: string },
  expiresIn: string = '7d',
): string {
  const secret = requireEnv('JWT_SECRET');
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}
