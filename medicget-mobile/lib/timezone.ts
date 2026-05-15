/**
 * timezone.ts — helpers para mostrar y comparar horarios en la zona del
 * médico, no la del paciente. Mirror del helper web pero compilable en
 * React Native (sin DOM).
 */

export const DEFAULT_TIMEZONE = 'America/Guayaquil';

const COUNTRY_TZ: Record<string, string> = {
  Ecuador: 'America/Guayaquil',
  EC: 'America/Guayaquil',
  Colombia: 'America/Bogota',
  CO: 'America/Bogota',
  Perú: 'America/Lima',
  Peru: 'America/Lima',
  PE: 'America/Lima',
  Argentina: 'America/Argentina/Buenos_Aires',
  AR: 'America/Argentina/Buenos_Aires',
  Chile: 'America/Santiago',
  CL: 'America/Santiago',
  México: 'America/Mexico_City',
  Mexico: 'America/Mexico_City',
  MX: 'America/Mexico_City',
  Venezuela: 'America/Caracas',
  VE: 'America/Caracas',
  Bolivia: 'America/La_Paz',
  BO: 'America/La_Paz',
  Paraguay: 'America/Asuncion',
  PY: 'America/Asuncion',
  Uruguay: 'America/Montevideo',
  UY: 'America/Montevideo',
  Brasil: 'America/Sao_Paulo',
  Brazil: 'America/Sao_Paulo',
  BR: 'America/Sao_Paulo',
  España: 'Europe/Madrid',
  Spain: 'Europe/Madrid',
  ES: 'Europe/Madrid',
  Italia: 'Europe/Rome',
  Italy: 'Europe/Rome',
  IT: 'Europe/Rome',
  Francia: 'Europe/Paris',
  France: 'Europe/Paris',
  FR: 'Europe/Paris',
  Alemania: 'Europe/Berlin',
  Germany: 'Europe/Berlin',
  DE: 'Europe/Berlin',
  'Reino Unido': 'Europe/London',
  'United Kingdom': 'Europe/London',
  UK: 'Europe/London',
  GB: 'Europe/London',
  'Estados Unidos': 'America/New_York',
  USA: 'America/New_York',
  US: 'America/New_York',
  Canadá: 'America/Toronto',
  Canada: 'America/Toronto',
  CA: 'America/Toronto',
};

export function countryToTimezone(country?: string | null): string {
  if (!country) return DEFAULT_TIMEZONE;
  const trimmed = country.trim();
  if (!trimmed) return DEFAULT_TIMEZONE;
  return (
    COUNTRY_TZ[trimmed] ??
    COUNTRY_TZ[trimmed.toUpperCase()] ??
    DEFAULT_TIMEZONE
  );
}

function tzOffsetMinutesAt(tz: string, utcMs: number): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(new Date(utcMs)).map((p) => [p.type, p.value]),
  );
  const hour = Number(parts.hour) === 24 ? 0 : Number(parts.hour);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second),
  );
  return (asUtc - utcMs) / 60_000;
}

export function wallClockInTzToUtc(
  dayKey: string,
  time: string,
  tz: string,
): number {
  const baseUtcMs = Date.parse(`${dayKey}T${time}:00Z`);
  if (Number.isNaN(baseUtcMs)) return NaN;
  let offset = tzOffsetMinutesAt(tz, baseUtcMs);
  let utcMs = baseUtcMs - offset * 60_000;
  offset = tzOffsetMinutesAt(tz, utcMs);
  utcMs = baseUtcMs - offset * 60_000;
  return utcMs;
}

export function isSlotPastInTz(
  dayKey: string,
  time: string,
  tz: string,
  bufferMin = 0,
): boolean {
  const slotUtc = wallClockInTzToUtc(dayKey, time, tz);
  if (Number.isNaN(slotUtc)) return false;
  return slotUtc <= Date.now() + bufferMin * 60_000;
}

export function tzShortLabel(tz: string, lang = 'es-ES'): string {
  try {
    const parts = new Intl.DateTimeFormat(lang, {
      timeZone: tz,
      timeZoneName: 'short',
    }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? tz;
  } catch {
    return tz;
  }
}
