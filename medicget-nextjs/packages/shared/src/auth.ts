import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { apiError } from './response';
import { requireEnv } from './env';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthedContext {
  user: AuthUser;
}

type Handler = (req: NextRequest, ctx: AuthedContext) => Promise<Response> | Response;

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
  if (!payload.sub || typeof payload.email !== 'string' || typeof payload.role !== 'string') {
    throw new Error('Invalid token payload');
  }
  return { id: String(payload.sub), email: payload.email, role: payload.role };
}

export function withAuth(handler: Handler) {
  return async (req: NextRequest): Promise<Response> => {
    const token = extractToken(req);
    if (!token) return apiError('UNAUTHORIZED', 'Missing bearer token');
    try {
      const user = verify(token);
      return handler(req, { user });
    } catch {
      return apiError('UNAUTHORIZED', 'Invalid or expired token');
    }
  };
}

export function withRole(roles: string[], handler: Handler) {
  return withAuth(async (req, ctx) => {
    if (!roles.includes(ctx.user.role)) {
      return apiError('FORBIDDEN', 'Insufficient permissions');
    }
    return handler(req, ctx);
  });
}

export function signToken(payload: { sub: string; email: string; role: string }, expiresIn: string = '7d'): string {
  const secret = requireEnv('JWT_SECRET');
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}
