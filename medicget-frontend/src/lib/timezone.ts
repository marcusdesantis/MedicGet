/**
 * timezone.ts — helpers para renderizar y comparar horarios en la zona
 * horaria del médico, no la del navegador del paciente.
 *
 * El backend guarda los slots / disponibilidades como `date` (YYYY-MM-DD)
 * y `time` (HH:mm) en la "wall clock" del médico — no en UTC. Hasta hace
 * poco el frontend hacía `new Date(\`${day}T${time}:00\`)`, lo cual JS
 * interpreta como hora local del navegador y rompe en cuanto el paciente
 * usa la app desde otra TZ (síntoma: PC del paciente en Italia veía
 * "09:00" como 09:00 italiano → 02:00 hora Ecuador → todos los slots
 * aparecían "pasados").
 *
 * Solución: mapeamos `country → IANA timezone` y resolvemos el offset
 * real con Intl.DateTimeFormat. El default cubre el mercado principal
 * (Ecuador).
 */

export const DEFAULT_TIMEZONE = 'America/Guayaquil';

// Mapeo defensivo. Acepta tanto nombres en español/inglés como código ISO.
// Cuando se agregue `timezone` al schema del Doctor, este mapa se vuelve
// solo un fallback.
const COUNTRY_TZ: Record<string, string> = {
  // Latinoamérica
  Ecuador:       'America/Guayaquil',
  EC:            'America/Guayaquil',
  Colombia:      'America/Bogota',
  CO:            'America/Bogota',
  Perú:          'America/Lima',
  Peru:          'America/Lima',
  PE:            'America/Lima',
  Argentina:     'America/Argentina/Buenos_Aires',
  AR:            'America/Argentina/Buenos_Aires',
  Chile:         'America/Santiago',
  CL:            'America/Santiago',
  México:        'America/Mexico_City',
  Mexico:        'America/Mexico_City',
  MX:            'America/Mexico_City',
  Venezuela:     'America/Caracas',
  VE:            'America/Caracas',
  Bolivia:       'America/La_Paz',
  BO:            'America/La_Paz',
  Paraguay:      'America/Asuncion',
  PY:            'America/Asuncion',
  Uruguay:       'America/Montevideo',
  UY:            'America/Montevideo',
  Brasil:        'America/Sao_Paulo',
  Brazil:        'America/Sao_Paulo',
  BR:            'America/Sao_Paulo',
  // Europa
  España:        'Europe/Madrid',
  Spain:         'Europe/Madrid',
  ES:            'Europe/Madrid',
  Italia:        'Europe/Rome',
  Italy:         'Europe/Rome',
  IT:            'Europe/Rome',
  Francia:       'Europe/Paris',
  France:        'Europe/Paris',
  FR:            'Europe/Paris',
  Alemania:      'Europe/Berlin',
  Germany:       'Europe/Berlin',
  DE:            'Europe/Berlin',
  'Reino Unido': 'Europe/London',
  'United Kingdom': 'Europe/London',
  UK:            'Europe/London',
  GB:            'Europe/London',
  // Norteamérica
  'Estados Unidos': 'America/New_York',
  USA:           'America/New_York',
  US:            'America/New_York',
  Canadá:        'America/Toronto',
  Canada:        'America/Toronto',
  CA:            'America/Toronto',
};

/** Resuelve la TZ IANA a partir del país. Fallback America/Guayaquil. */
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

/**
 * Devuelve el offset (en minutos) de la TZ pasada respecto a UTC en el
 * instante UTC `utcMs`. Positivo significa "al este de UTC" (p.e. Rome
 * en verano = +120).
 */
function tzOffsetMinutesAt(tz: string, utcMs: number): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year:    'numeric',
    month:   '2-digit',
    day:     '2-digit',
    hour:    '2-digit',
    minute:  '2-digit',
    second:  '2-digit',
    hour12:  false,
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

/**
 * Convierte un "wall clock" (día + hora local del médico) a un instante
 * UTC absoluto en ms. Itera 2 veces para converger en bordes de DST.
 *
 *   wallClockInTzToUtc('2026-05-15', '09:00', 'Europe/Rome') →
 *     instante UTC correspondiente a las 09:00 hora de Roma ese día.
 */
export function wallClockInTzToUtc(
  dayKey: string,
  time:   string,
  tz:     string,
): number {
  const baseUtcMs = Date.parse(`${dayKey}T${time}:00Z`);
  if (Number.isNaN(baseUtcMs)) return NaN;
  let offset = tzOffsetMinutesAt(tz, baseUtcMs);
  let utcMs  = baseUtcMs - offset * 60_000;
  // Segunda pasada por DST.
  offset = tzOffsetMinutesAt(tz, utcMs);
  utcMs  = baseUtcMs - offset * 60_000;
  return utcMs;
}

/**
 * ¿Ya pasó este slot (en la TZ del médico), con `bufferMin` opcional?
 * Se compara contra `Date.now()` que es UTC, así que la respuesta es
 * correcta sin importar la TZ del navegador.
 */
export function isSlotPastInTz(
  dayKey:    string,
  time:      string,
  tz:        string,
  bufferMin: number = 0,
): boolean {
  const slotUtc = wallClockInTzToUtc(dayKey, time, tz);
  if (Number.isNaN(slotUtc)) return false;
  return slotUtc <= Date.now() + bufferMin * 60_000;
}

/**
 * Etiqueta corta para mostrar al usuario, por ejemplo "ECT", "CET",
 * "GMT-5". Se obtiene desde Intl con `timeZoneName: 'short'`.
 */
export function tzShortLabel(tz: string, lang: string = 'es-ES'): string {
  try {
    const parts = new Intl.DateTimeFormat(lang, {
      timeZone:     tz,
      timeZoneName: 'short',
    }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? tz;
  } catch {
    return tz;
  }
}
