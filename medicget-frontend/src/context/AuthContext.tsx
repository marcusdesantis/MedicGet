/**
 * AuthContext — real JWT-backed authentication.
 *
 * - login()  → POST /auth/login, stores token in localStorage
 * - logout() → clears token + user state
 * - bootstrap → on first render, calls GET /auth/me with stored token
 *               to restore the session without re-logging in
 *
 * The public interface (User shape, hook, Provider) is backward-compatible
 * with the mock version so page components need no changes.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { authApi, TOKEN_KEY, UserDto } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'patient' | 'doctor' | 'clinic';

export interface User {
  id:       string;
  email:    string;
  username: string;   // kept for backward-compat (= email local-part)
  role:     UserRole;
  name:     string;
  avatar?:  string;
  // raw DTO extras (available to pages that need them)
  dto:      UserDto;
}

interface AuthContextType {
  user:            User | null;
  isAuthenticated: boolean;
  loading:         boolean;
  login:           (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  logout:          () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_MAP: Record<string, UserRole> = {
  CLINIC:  'clinic',
  DOCTOR:  'doctor',
  PATIENT: 'patient',
};

function dtoToUser(dto: UserDto): User {
  const firstName = dto.profile?.firstName ?? '';
  const lastName  = dto.profile?.lastName  ?? '';
  const name      = dto.role === 'DOCTOR'
    ? `Dr. ${firstName} ${lastName}`.trim()
    : `${firstName} ${lastName}`.trim() || dto.email;

  return {
    id:       dto.id,
    email:    dto.email,
    username: dto.email.split('@')[0],
    role:     ROLE_MAP[dto.role] ?? 'patient',
    name,
    avatar:   dto.profile?.avatarUrl ?? undefined,
    dto,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Bootstrap: restore session from stored token
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }

    authApi.me()
      .then((res) => setUser(dtoToUser(res.data)))
      .catch(() => {
        // Token invalid/expired — clear it silently
        localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await authApi.login(email, password);
      localStorage.setItem(TOKEN_KEY, res.data.token);
      const mappedUser = dtoToUser(res.data.user);
      setUser(mappedUser);
      return { success: true, role: mappedUser.role };
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'Credenciales incorrectas';
      return { success: false, error: msg };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
