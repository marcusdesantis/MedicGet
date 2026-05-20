/**
 * Mapa de codigos telefonicos por pais. Cubre Latam + EEUU/Espana como
 * minimo viable; agregar mas paises es trivial.
 *
 * Cada entrada combina ISO-2, prefijo internacional con `+`, nombre en
 * espanol y bandera emoji para que el PhoneField pueda renderizar el
 * selector sin imagenes externas.
 */

export interface PhoneCode {
  iso:      string; // ISO 3166-1 alpha-2 (lowercase)
  dialCode: string; // ej '+593'
  name:     string;
  flag:     string;
}

export const PHONE_CODES: PhoneCode[] = [
  { iso: 'ec', dialCode: '+593', name: 'Ecuador',           flag: '🇪🇨' },
  { iso: 'pe', dialCode: '+51',  name: 'Perú',              flag: '🇵🇪' },
  { iso: 'co', dialCode: '+57',  name: 'Colombia',          flag: '🇨🇴' },
  { iso: 'ar', dialCode: '+54',  name: 'Argentina',         flag: '🇦🇷' },
  { iso: 'mx', dialCode: '+52',  name: 'México',            flag: '🇲🇽' },
  { iso: 'cl', dialCode: '+56',  name: 'Chile',             flag: '🇨🇱' },
  { iso: 've', dialCode: '+58',  name: 'Venezuela',         flag: '🇻🇪' },
  { iso: 'bo', dialCode: '+591', name: 'Bolivia',           flag: '🇧🇴' },
  { iso: 'py', dialCode: '+595', name: 'Paraguay',          flag: '🇵🇾' },
  { iso: 'uy', dialCode: '+598', name: 'Uruguay',           flag: '🇺🇾' },
  { iso: 'gt', dialCode: '+502', name: 'Guatemala',         flag: '🇬🇹' },
  { iso: 'hn', dialCode: '+504', name: 'Honduras',          flag: '🇭🇳' },
  { iso: 'sv', dialCode: '+503', name: 'El Salvador',       flag: '🇸🇻' },
  { iso: 'ni', dialCode: '+505', name: 'Nicaragua',         flag: '🇳🇮' },
  { iso: 'cr', dialCode: '+506', name: 'Costa Rica',        flag: '🇨🇷' },
  { iso: 'pa', dialCode: '+507', name: 'Panamá',            flag: '🇵🇦' },
  { iso: 'do', dialCode: '+1',   name: 'República Dominicana', flag: '🇩🇴' },
  { iso: 'cu', dialCode: '+53',  name: 'Cuba',              flag: '🇨🇺' },
  { iso: 'br', dialCode: '+55',  name: 'Brasil',            flag: '🇧🇷' },
  { iso: 'us', dialCode: '+1',   name: 'Estados Unidos',    flag: '🇺🇸' },
  { iso: 'es', dialCode: '+34',  name: 'España',            flag: '🇪🇸' },
];

/** Devuelve el PhoneCode default (Ecuador) o el indicado por ISO. */
export function getPhoneCode(iso?: string): PhoneCode {
  const target = (iso ?? 'ec').toLowerCase();
  return PHONE_CODES.find((p) => p.iso === target) ?? PHONE_CODES[0]!;
}

/**
 * Intenta detectar el PhoneCode a partir de un numero E.164 (`+593987...`).
 * Greedy: prueba prefijos de 4 → 1 digitos. Si no matchea, devuelve EC.
 */
export function detectPhoneCode(fullNumber: string): {
  code:  PhoneCode;
  rest:  string;
} {
  const cleaned = fullNumber.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    return { code: getPhoneCode('ec'), rest: cleaned };
  }
  for (let len = 4; len >= 1; len--) {
    const candidate = cleaned.slice(0, len + 1);
    const match = PHONE_CODES.find((p) => p.dialCode === candidate);
    if (match) return { code: match, rest: cleaned.slice(len + 1) };
  }
  return { code: getPhoneCode('ec'), rest: cleaned.slice(1) };
}
