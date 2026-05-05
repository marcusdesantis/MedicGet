import { useEffect, useRef, useState } from "react";
import type { ApiOk } from "@/lib/api";

export type ApiState<T> =
  | { status: "loading"; data: null;        error: null }
  | { status: "ready";   data: T;           error: null }
  | { status: "error";   data: null;        error: ApiErrorInfo };

export interface ApiErrorInfo {
  /** HTTP status (4xx / 5xx). Null when the request never reached the server. */
  status:  number | null;
  /** Backend error code (e.g. "NOT_FOUND", "UNAUTHORIZED"). */
  code?:   string;
  /** User-facing message — already in Spanish if it came from the backend. */
  message: string;
}

function toErrorInfo(err: unknown, fallback = "Ocurrió un error al cargar los datos"): ApiErrorInfo {
  const e = err as {
    response?: {
      status?: number;
      data?: { error?: { code?: string; message?: string } };
    };
  };
  const body = e?.response?.data?.error;
  return {
    status:  e?.response?.status ?? null,
    code:    body?.code,
    message: body?.message ?? fallback,
  };
}

/**
 * useApi — fetches `apiCall()` once on mount (or when `deps` change) and
 * exposes a discriminated union state. Designed for dashboard-style screens
 * where you need to render loading / error / ready cleanly.
 *
 * Usage:
 *   const { state, refetch } = useApi(() => dashboardApi.patient(), []);
 *   if (state.status === "loading") return <Spinner />;
 *   if (state.status === "error")   return <Alert>{state.error.message}</Alert>;
 *   return <Dashboard data={state.data} />;
 */
export function useApi<T>(
  apiCall: () => Promise<ApiOk<T>>,
  deps: ReadonlyArray<unknown> = [],
) {
  const [state, setState] = useState<ApiState<T>>({ status: "loading", data: null, error: null });

  // Re-running effect with the same fn reference on every render would loop
  // forever, so we keep a stable ref to the latest version of `apiCall`.
  const apiCallRef = useRef(apiCall);
  apiCallRef.current = apiCall;

  const tick = useState(0);
  const setTick = tick[1];

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", data: null, error: null });

    apiCallRef.current()
      .then((res) => {
        if (cancelled) return;
        setState({ status: "ready", data: res.data, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: "error", data: null, error: toErrorInfo(err) });
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick[0]]);

  const refetch = () => setTick((n) => n + 1);

  return { state, refetch };
}
