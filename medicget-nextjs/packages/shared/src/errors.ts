export interface ServiceError {
  code: string;
  message: string;
  details?: unknown;
}

export function isServiceError(value: unknown): value is ServiceError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    typeof (value as ServiceError).code === 'string' &&
    typeof (value as ServiceError).message === 'string'
  );
}
