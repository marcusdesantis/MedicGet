/**
 * search.ts — utilidades de búsqueda case + diacritics-insensitive.
 *
 * Toda búsqueda en cliente debe pasar BOTH la query Y los campos del
 * registro por `normalizeSearch` antes de comparar. Esto garantiza que:
 *
 *   • "ANA"   matchee "ana", "Ana", "ANA"
 *   • "jose"  matchee "José", "Jóse", "jose"
 *   • "senor" matchee "Señor", "señor"
 *
 * Implementación: descomponemos a forma NFD (cada caracter acentuado se
 * separa en "letra base" + "combinador diacrítico") y borramos el bloque
 * Unicode U+0300–U+036F (Combining Diacritical Marks). Después
 * minúsculas y trim.
 */

// Bloque Unicode "Combining Diacritical Marks" (U+0300–U+036F).
// Usamos escape Unicode para que el regex sea legible en código fuente
// sin depender de caracteres combinadores invisibles inline.
const DIACRITIC_RE = new RegExp('[\\u0300-\\u036f]', 'g');

/**
 * Devuelve la versión "buscable" de una string: minúsculas, sin tildes,
 * sin diacríticos, con whitespace colapsado.
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
 * ¿La query (normalizada) aparece dentro de alguno de los campos
 * provistos (también normalizados)? Útil para filtros tipo:
 *
 *   list.filter((r) => matchesSearch(query, r.firstName, r.lastName, r.email))
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
