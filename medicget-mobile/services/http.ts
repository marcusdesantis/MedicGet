/**
 * services/http.ts — instancia Axios centralizada para la app móvil.
 *
 * Espeja la implementación del frontend web (`src/lib/api.ts`) pero
 * adaptada a React Native:
 *   - Token persistido en SecureStore (vía `lib/storage`) en lugar de
 *     localStorage.
 *   - Sin redirect global en 401 — el AuthContext lo maneja limpiando
 *     sesión y dejando que la pantalla raíz redirija a /login.
 *   - El backend está expuesto via nginx en :8080. La base se configura
 *     con `EXPO_PUBLIC_API_BASE_URL` en `.env`.
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from '@/lib/storage';

// ─── Constantes ──────────────────────────────────────────────────────────────

const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:8080/api/v1';

// Cache en memoria del token. Permite inyectarlo síncronamente desde el
// interceptor sin pagar el costo de leer SecureStore por cada request.
let cachedToken: string | null = null;

export function setAuthToken(token: string | null): void {
  cachedToken = token;
}

export function getAuthToken(): string | null {
  return cachedToken;
}

// Listeners para 401 — el AuthContext se suscribe para limpiar sesión.
type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorized(fn: UnauthorizedListener): () => void {
  unauthorizedListeners.add(fn);
  return () => unauthorizedListeners.delete(fn);
}

// ─── Tipos de respuesta del backend ──────────────────────────────────────────

export interface ApiOk<T> {
  ok: true;
  data: T;
  message?: string;
}

export interface ApiErrorBody {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: { field?: string } & Record<string, unknown>;
  };
}

// ─── Instancia Axios ─────────────────────────────────────────────────────────

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (cachedToken && config.headers) {
    config.headers.Authorization = `Bearer ${cachedToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    if (!error.response) {
      // Sin respuesta → problema de red. Dejamos que el caller lo muestre
      // (toast, alert inline, etc.).
      return Promise.reject(error);
    }
    const { status, config } = error.response;

    if (status === 401) {
      // No expulsamos al usuario si el 401 viene de un formulario de auth —
      // ya está en login/registro y debe ver el mensaje inline.
      const url = config?.url ?? '';
      const isAuthForm =
        url.includes('/auth/login') || url.includes('/auth/register');
      if (!isAuthForm) {
        await tokenStorage.clear();
        setAuthToken(null);
        unauthorizedListeners.forEach((fn) => {
          try {
            fn();
          } catch {
            /* ignore listener errors */
          }
        });
      }
    }
    return Promise.reject(error);
  },
);

// ─── Helpers tipados ─────────────────────────────────────────────────────────

export async function apiGet<T>(
  url: string,
  params?: Record<string, unknown>,
): Promise<ApiOk<T>> {
  const res = await api.get<ApiOk<T>>(url, { params });
  return res.data;
}

export async function apiPost<T>(url: string, body?: unknown): Promise<ApiOk<T>> {
  const res = await api.post<ApiOk<T>>(url, body);
  return res.data;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<ApiOk<T>> {
  const res = await api.patch<ApiOk<T>>(url, body);
  return res.data;
}

export async function apiDelete<T>(url: string): Promise<ApiOk<T>> {
  const res = await api.delete<ApiOk<T>>(url);
  return res.data;
}

/**
 * Extrae mensaje + campo + código de error desde un AxiosError —
 * idéntica lógica al `extractApiError` de la web. Devuelve `null` en
 * `field` si el backend no atribuye el error a un campo.
 */
export function extractApiError(
  err: unknown,
  fallback: string,
): { message: string; field?: string; code?: string } {
  const errorBody = (err as { response?: { data?: ApiErrorBody } })?.response
    ?.data?.error;

  const message = errorBody?.message ?? fallback;
  const code = errorBody?.code;
  const details = errorBody?.details;

  if (details && typeof details === 'object' && 'field' in details) {
    const fieldVal = (details as { field?: unknown }).field;
    if (typeof fieldVal === 'string') {
      return { message, field: fieldVal, code };
    }
  }

  if (details && typeof details === 'object') {
    for (const [field, msgs] of Object.entries(details as Record<string, unknown>)) {
      if (Array.isArray(msgs) && msgs.length > 0 && typeof msgs[0] === 'string') {
        return { message: msgs[0] as string, field, code };
      }
    }
  }

  return { message, code };
}
