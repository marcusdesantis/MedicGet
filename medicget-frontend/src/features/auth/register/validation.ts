/**
 * Pure validation helpers for the registration wizard.
 *
 * Each `validate*` function returns a Spanish error message when the value
 * is invalid, or `null` when it's OK. Callers then build a per-form errors
 * object by composing these primitives — no validation library required.
 *
 * The rules mirror the backend Zod schema in
 *   svc-auth/src/app/api/v1/auth/register/route.ts
 * so client-side errors match the server's. Keep them in sync if you change
 * one or the other.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRequired(value: string | undefined, label: string): string | null {
  return value && value.trim().length > 0 ? null : `${label} es obligatorio`;
}

export function validateEmail(value: string | undefined): string | null {
  if (!value || value.trim().length === 0) return "El correo es obligatorio";
  return EMAIL_RE.test(value) ? null : "Introduce un correo válido";
}

export function validateEmailMatch(email: string, confirm: string): string | null {
  if (!confirm) return "Confirma tu correo";
  return email === confirm ? null : "Los correos no coinciden";
}

export function validatePassword(value: string | undefined): string | null {
  if (!value) return "La contraseña es obligatoria";
  if (value.length < 6) return "La contraseña debe tener al menos 6 caracteres";
  return null;
}

export function validatePasswordMatch(password: string, confirm: string): string | null {
  if (!confirm) return "Repite tu contraseña";
  return password === confirm ? null : "Las contraseñas no coinciden";
}

export function validatePhone(value: string | undefined): string | null {
  // PhoneInput already returns digits only (with the country code prefix).
  // We just need at least 8 digits to consider it plausibly entered.
  if (!value) return "El teléfono es obligatorio";
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 ? null : "Introduce un teléfono válido";
}

// ─── Composed: per-form validators ──────────────────────────────────────────

export interface FieldErrors {
  [field: string]: string | null;
}

/** Returns true if every entry in the errors map is null. */
export function isClean(errors: FieldErrors): boolean {
  return Object.values(errors).every((e) => e === null);
}
