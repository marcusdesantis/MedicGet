/**
 * search.ts - utilidades de busqueda case + diacritics-insensitive.
 * Espejo del helper del frontend web (`src/lib/search.ts`).
 *
 * Toda busqueda en cliente debe pasar BOTH la query Y los campos del
 * registro por `normalizeSearch` antes de comparar. Esto garantiza que:
 *
 *   - "ANA"   matchee "ana", "Ana", "ANA"
 *   - "jose"  matchee "Jose", "Jose", "jose"
 *   - "senor" matchee "Senor", "senor"
 */

// Bloque Unicode "Combining Diacritical Marks" (U+0300-U+036F).
const DIACRITIC_RE = new RegExp('[\\u0300-\\u036f]', 'g');

/**
 * Devuelve la version "buscable" de una string: minusculas, sin tildes,
 * sin diacriticos, con whitespace colapsado.
 */
export function normalizeSearch(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(DIACRITIC_RE, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * La query (normalizada) aparece dentro de alguno de los campos
 * provistos (tambien normalizados).
 */
export function matchesSearch(
  query: string | null | undefined,
  ...fields: (string | null | undefined)[]
): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  for (const f of fields) {
    if (normalizeSearch(f).includes(q)) return true;
  }
  return false;
}
