/**
 * Validación replicada del frontend web — funciones puras que devuelven
 * un mensaje de error en español o `null` si el valor es válido. Los
 * mensajes coinciden con los del Zod schema del backend.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRequired(value: string | undefined, label: string): string | null {
  return value && value.trim().length > 0 ? null : `${label} es obligatorio`;
}

export function validateEmail(value: string | undefined): string | null {
  if (!value || value.trim().length === 0) return 'El correo es obligatorio';
  return EMAIL_RE.test(value) ? null : 'Introduce un correo válido';
}

export function validateEmailMatch(email: string, confirm: string): string | null {
  if (!confirm) return 'Confirma tu correo';
  return email === confirm ? null : 'Los correos no coinciden';
}

export function validatePassword(value: string | undefined): string | null {
  if (!value) return 'La contraseña es obligatoria';
  if (value.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
  return null;
}

export function validatePasswordMatch(password: string, confirm: string): string | null {
  if (!confirm) return 'Repite tu contraseña';
  return password === confirm ? null : 'Las contraseñas no coinciden';
}

export function validatePhone(value: string | undefined): string | null {
  if (!value) return 'El teléfono es obligatorio';
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8 ? null : 'Introduce un teléfono válido';
}

export interface FieldErrors {
  [field: string]: string | null;
}

export function isClean(errors: FieldErrors): boolean {
  return Object.values(errors).every((e) => e === null);
}
