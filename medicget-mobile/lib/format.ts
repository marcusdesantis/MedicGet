/**
 * Helpers de formato compartidos por las pantallas del paciente.
 */

import type { ProfileDto } from '@/lib/api';

export function fmtShortDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
  });
}

export function fmtLongDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function fmtMedDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function initialsFrom(
  firstName?: string,
  lastName?: string,
  fallback = 'U',
): string {
  const a = firstName?.[0] ?? '';
  const b = lastName?.[0] ?? '';
  const result = (a + b).toUpperCase();
  return result || fallback;
}

export function profileInitials(profile?: ProfileDto | null, fallback = 'U'): string {
  return initialsFrom(profile?.firstName, profile?.lastName, fallback);
}

/** Convierte fecha YYYY-MM-DD + hora HH:mm en un Date en TZ del navegador. */
export function combineDateTime(date: string, time: string): Date {
  const datePart = date.length > 10 ? date.slice(0, 10) : date;
  return new Date(`${datePart}T${time}:00`);
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export function calcAge(isoBirth?: string): number | null {
  if (!isoBirth) return null;
  const birth = new Date(isoBirth);
  if (Number.isNaN(birth.getTime())) return null;
  const ms = Date.now() - birth.getTime();
  return Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000));
}
