import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { signToken }      from '@medicget/shared/auth';
import { isServiceError } from '@medicget/shared/errors';
import { authRepository } from './auth.repository';

export interface RegisterInput {
  email:     string;
  password:  string;
  role:      Role;
  firstName: string;
  lastName:  string;
  phone?:    string;
}

export interface LoginInput {
  email:    string;
  password: string;
}

export type ServiceResult<T> =
  | { ok: true;  data: T }
  | { ok: false; code: string; message: string };

function sanitizeUser(user: Awaited<ReturnType<typeof authRepository.findById>>) {
  if (!user) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safe } = user;
  return safe;
}

export const authService = {
  async register(input: RegisterInput): Promise<ServiceResult<{ token: string; user: object }>> {
    const existing = await authRepository.findByEmail(input.email);
    if (existing) {
      return { ok: false, code: 'CONFLICT', message: 'Email already registered' };
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await authRepository.create({ ...input, passwordHash });

    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    return { ok: true, data: { token, user: sanitizeUser(user)! } };
  },

  async login(input: LoginInput): Promise<ServiceResult<{ token: string; user: object }>> {
    const user = await authRepository.findByEmail(input.email);
    if (!user) {
      return { ok: false, code: 'UNAUTHORIZED', message: 'Invalid email or password' };
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      return { ok: false, code: 'UNAUTHORIZED', message: 'Invalid email or password' };
    }

    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    return { ok: true, data: { token, user: sanitizeUser(user)! } };
  },

  async me(userId: string): Promise<ServiceResult<object>> {
    const user = await authRepository.findById(userId);
    if (!user) {
      return { ok: false, code: 'NOT_FOUND', message: 'User not found' };
    }
    return { ok: true, data: sanitizeUser(user)! };
  },
};
