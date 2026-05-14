/**
 * AuthContext — versión React Native del contexto de autenticación.
 *
 * - bootstrap()   al arranque: lee token de SecureStore, si existe llama
 *                 a /auth/me; si falla → limpia y sigue sin sesión.
 * - login()       POST /auth/login + persiste token.
 * - register()    POST /auth/register (devuelve requiresVerification, no
 *                 hace auto-login).
 * - verifyEmail() consume código de 6 dígitos y, si OK, persiste token.
 * - logout()      borra SecureStore + estado.
 *
 * Mantiene la misma forma pública que `AuthContext` del frontend web para
 * que la lógica de las pantallas portadas no cambie.
 */

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { authApi, RegisterBody, UserDto } from '@/lib/api';
import {
  extractApiError,
  onUnauthorized,
  setAuthToken,
} from '@/services/http';
import { tokenStorage } from '@/lib/storage';

// ─── Tipos públicos ──────────────────────────────────────────────────────────

export type UserRole = 'patient' | 'doctor' | 'clinic' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  avatar?: string;
  dto: UserDto;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  field?: string;
  code?: string;
  role?: UserRole;
  requiresVerification?: boolean;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (body: RegisterBody) => Promise<AuthResult>;
  verifyEmail: (body: { token?: string; code?: string; email?: string }) => Promise<AuthResult>;
  refreshMe: () => Promise<void>;
  logout: () => Promise<void>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_MAP: Record<string, UserRole> = {
  CLINIC: 'clinic',
  DOCTOR: 'doctor',
  PATIENT: 'patient',
  ADMIN: 'admin',
};

function dtoToUser(dto: UserDto): User {
  const firstName = dto.profile?.firstName ?? '';
  const lastName = dto.profile?.lastName ?? '';
  const fullName = `${firstName} ${lastName}`.trim();
  const name =
    dto.role === 'DOCTOR'
      ? `Dr. ${fullName}`.trim()
      : fullName || dto.email;

  return {
    id: dto.id,
    email: dto.email,
    role: ROLE_MAP[dto.role] ?? 'patient',
    name,
    avatar: dto.profile?.avatarUrl ?? undefined,
    dto,
  };
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Bootstrap al arrancar
  useEffect(() => {
    let mounted = true;
    (async () => {
      const stored = await tokenStorage.get();
      if (!stored) {
        if (mounted) setLoading(false);
        return;
      }
      setAuthToken(stored);
      try {
        const res = await authApi.me();
        if (mounted) setUser(dtoToUser(res.data));
      } catch {
        await tokenStorage.clear();
        setAuthToken(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Si el HTTP detecta 401 fuera de auth-form → limpiamos el estado local.
  useEffect(() => {
    const off = onUnauthorized(() => {
      setUser(null);
    });
    return () => {
      off();
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      try {
        const res = await authApi.login(email, password);
        await tokenStorage.set(res.data.token);
        setAuthToken(res.data.token);
        const mapped = dtoToUser(res.data.user);
        setUser(mapped);
        return { success: true, role: mapped.role };
      } catch (err) {
        const { message, field, code } = extractApiError(
          err,
          'Credenciales incorrectas',
        );
        if (code === 'EMAIL_NOT_VERIFIED') {
          return {
            success: false,
            error: message,
            field,
            code,
            requiresVerification: true,
            email,
          };
        }
        return { success: false, error: message, field, code };
      }
    },
    [],
  );

  const register = useCallback(
    async (body: RegisterBody): Promise<AuthResult> => {
      try {
        const res = await authApi.register(body);
        return {
          success: true,
          requiresVerification: true,
          email: res.data.email,
        };
      } catch (err) {
        const { message, field, code } = extractApiError(
          err,
          'No se pudo crear la cuenta',
        );
        return { success: false, error: message, field, code };
      }
    },
    [],
  );

  const verifyEmail = useCallback(
    async (body: { token?: string; code?: string; email?: string }): Promise<AuthResult> => {
      try {
        const res = await authApi.verifyEmail(body);
        await tokenStorage.set(res.data.token);
        setAuthToken(res.data.token);
        const mapped = dtoToUser(res.data.user);
        setUser(mapped);
        return { success: true, role: mapped.role };
      } catch (err) {
        const { message, field, code } = extractApiError(
          err,
          'No se pudo verificar el correo',
        );
        return { success: false, error: message, field, code };
      }
    },
    [],
  );

  const refreshMe = useCallback(async () => {
    try {
      const res = await authApi.me();
      setUser(dtoToUser(res.data));
    } catch {
      /* si falla, AuthContext quedará desincronizado y el siguiente fetch
         del usuario lo refrescará. Evitamos romper UI en este punto. */
    }
  }, []);

  const logout = useCallback(async () => {
    await tokenStorage.clear();
    setAuthToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        verifyEmail,
        refreshMe,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
