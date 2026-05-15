/**
 * useApi — fetcher con estados loading / ready / error y refetch.
 * Espejo simétrico del hook en el frontend web.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiOk } from '@/services/http';

export interface ApiErrorInfo {
  status: number | null;
  code?: string;
  message: string;
}

export type ApiState<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: T; error: null }
  | { status: 'error'; data: null; error: ApiErrorInfo };

function toErrorInfo(err: unknown, fallback = 'Ocurrió un error al cargar los datos'): ApiErrorInfo {
  const e = err as {
    response?: {
      status?: number;
      data?: { error?: { code?: string; message?: string } };
    };
  };
  const body = e?.response?.data?.error;
  return {
    status: e?.response?.status ?? null,
    code: body?.code,
    message: body?.message ?? fallback,
  };
}

export function useApi<T>(
  apiCall: () => Promise<ApiOk<T>>,
  deps: ReadonlyArray<unknown> = [],
) {
  const [state, setState] = useState<ApiState<T>>({
    status: 'loading',
    data: null,
    error: null,
  });

  const apiCallRef = useRef(apiCall);
  apiCallRef.current = apiCall;

  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', data: null, error: null });

    apiCallRef.current()
      .then((res) => {
        if (cancelled) return;
        setState({ status: 'ready', data: res.data, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: 'error', data: null, error: toErrorInfo(err) });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  // `refetch` debe tener identidad estable entre renders. Si lo
  // declaráramos como `() => setTick(...)` se recrearía en cada render
  // y cualquier hook que lo use como dependencia (p. ej.
  // `useRefetchOnFocus(refetch)`) se invalida en cada render y
  // dispara un loop infinito ("maximum update depth exceeded").
  const refetch = useCallback(() => setTick((n) => n + 1), []);

  return { state, refetch };
}
