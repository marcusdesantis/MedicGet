import { ZodSchema, ZodError } from 'zod';
import { apiError } from './response';

export async function parseBody<T>(
  req:    Request,
  schema: ZodSchema<T>,
): Promise<{ data: T } | { error: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { error: apiError('BAD_REQUEST', 'Request body must be valid JSON') };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const details = (result.error as ZodError).flatten().fieldErrors;
    return { error: apiError('VALIDATION_ERROR', 'Validation failed', details) };
  }
  return { data: result.data };
}
