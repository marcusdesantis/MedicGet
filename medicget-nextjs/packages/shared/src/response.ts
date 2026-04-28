import { NextResponse } from 'next/server';

export interface ApiOkBody<T> {
  ok: true;
  data: T;
  message?: string;
}

export interface ApiErrorBody {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

const ERROR_STATUS: Record<string, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export function apiOk<T>(data: T, message?: string, init?: ResponseInit): NextResponse<ApiOkBody<T>> {
  return NextResponse.json({ ok: true, data, message }, init);
}

export function apiError(code: string, message: string, details?: unknown): NextResponse<ApiErrorBody> {
  const status = ERROR_STATUS[code] ?? 500;
  return NextResponse.json({ ok: false, error: { code, message, details } }, { status });
}
