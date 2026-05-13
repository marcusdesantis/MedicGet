/**
 * AuthContext — real JWT-backed authentication.
 *
 * - login()    → POST /auth/login,    stores token in localStorage
 * - register() → POST /auth/register, stores token in localStorage
 * - logout()   → clears token + user state
 * - bootstrap  → on first render, calls GET /auth/me with stored token
 *                to restore the session without re-logging in
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
import { authApi, RegisterBody, TOKEN_KEY, UserDto } from '@/lib/api';
import { clearRegistrationDraft } from '@/features/auth/register/state';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'patient' | 'doctor' | 'clinic' | 'admin';

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

export interface AuthResult {
  success: boolean;
  error?:  string;
  /**
   * When the backend can attribute the failure to a specific form field
   * (e.g. duplicate email → `field: "email"`), it surfaces that name here.
   * The wizard pages use it to either render the error inline next to the
   * matching input or — when the field belongs to a previous step — to
   * show an alert with a "go back" button.
   */
  field?:  string;
  role?:   UserRole;
  /**
   * Código de error del backend (ej. 'EMAIL_NOT_VERIFIED', 'CONFLICT').
   * El consumidor lo usa para tomar acciones específicas más allá del
   * mensaje (redirigir a otra pantalla, mostrar UI distinta, etc.).
   */
  code?:   string;
  /**
   * En el flujo nuevo, register devuelve `requiresVerification` y NO
   * loguea al usuario automáticamente. La página de registro debe
   * redirigir a /verify-email cuando este flag está en true.
   * También se setea cuando login encuentra una cuenta sin verificar
   * (code === 'EMAIL_NOT_VERIFIED').
   */
  requiresVerification?: boolean;
  email?:                string;
}

interface AuthContextType {
  user:            User | null;
  isAuthenticated: boolean;
  loading:         boolean;
  login:           (email: string, password: string) => Promise<AuthResult>;
  register:        (body: RegisterBody) => Promise<AuthResult>;
  logout:          () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_MAP: Record<string, UserRole> = {
  CLINIC:  'clinic',
  DOCTOR:  'doctor',
  PATIENT: 'patient',
  ADMIN:   'admin',
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

/**
 * Pulls a user-friendly message AND the optional `field` hint out of an
 * Axios error returned by our API. The backend has TWO error shapes:
 *
 *   1. Auth service business errors (handled by handleAuthError):
 *        { code, message, details: { field: "email" } }
 *
 *   2. Zod validation errors (handled by parseBody → apiError):
 *        { code: "VALIDATION_ERROR", message: "Validation failed",
 *          details: { lastName: ["String must contain at least 1 character"] } }
 *
 * We extract the field name and the most actionable message from either
 * shape, falling back to the generic Spanish copy on network errors.
 */
function extractApiError(err: unknown, fallback: string): { message: string; field?: string; code?: string } {
  const errorBody = (err as {
    response?: {
      data?: {
        error?: {
          code?:    string;
          message?: string;
          details?: unknown;
        };
      };
    };
  })?.response?.data?.error;

  const message = errorBody?.message ?? fallback;
  const code    = errorBody?.code;
  const details = errorBody?.details;

  // Shape #1 — { field: "email" }
  if (details && typeof details === "object" && "field" in details) {
    const fieldVal = (details as { field?: unknown }).field;
    if (typeof fieldVal === "string") {
      return { message, field: fieldVal, code };
    }
  }

  // Shape #2 — Zod fieldErrors: { lastName: ["msg"], firstName: ["msg"] }
  // Pick the first field that has a non-empty error array, and surface the
  // first message from it so the inline UI can be specific.
  if (details && typeof details === "object") {
    const entries = Object.entries(details as Record<string, unknown>);
    for (const [field, msgs] of entries) {
      if (Array.isArray(msgs) && msgs.length > 0 && typeof msgs[0] === "string") {
        return { message: msgs[0] as string, field, code };
      }
    }
  }

  return { message, code };
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

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      const res = await authApi.login(email, password);
      localStorage.setItem(TOKEN_KEY, res.data.token);
      const mappedUser = dtoToUser(res.data.user);
      setUser(mappedUser);
      return { success: true, role: mappedUser.role };
    } catch (err: unknown) {
      const { message, field, code } = extractApiError(err, 'Credenciales incorrectas');
      // Si la cuenta existe pero el email no fue verificado, marcamos
      // requiresVerification para que LoginPage redirija a /verify-email
      // en lugar de mostrar solo el mensaje.
      if (code === 'EMAIL_NOT_VERIFIED') {
        return {
          success: false,
          error:   message,
          field,
          code,
          requiresVerification: true,
          email,
        };
      }
      return { success: false, error: message, field, code };
    }
  }, []);

  const register = useCallback(async (body: RegisterBody): Promise<AuthResult> => {
    try {
      const res = await authApi.register(body);
      // El backend ahora requiere verificación de email — no se loguea
      // automáticamente. Limpiamos el draft del wizard y devolvemos
      // requiresVerification:true para que la página redirija a /verify-email.
      clearRegistrationDraft();
      return {
        success: true,
        requiresVerification: true,
        email: res.data.email,
      };
    } catch (err: unknown) {
      const { message, field } = extractApiError(err, 'No se pudo crear la cuenta');
      return { success: false, error: message, field };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
