/**
 * Validación de cédula ecuatoriana (10 dígitos) con el algoritmo oficial
 * del dígito verificador (módulo 10 / coeficientes 2,1,2,1...).
 *
 * Reglas:
 *   • 10 dígitos numéricos.
 *   • Los dos primeros (provincia) entre 01 y 24, o 30 (ecuatorianos en
 *     el exterior / casos especiales recientes).
 *   • Tercer dígito < 6 para personas naturales (6 = sociedades públicas,
 *     9 = jurídicas — no aplican a un médico).
 *   • Dígito verificador (último) calculado con el algoritmo de módulo 10.
 *
 * Es una validación ESTRUCTURAL — confirma que la cédula es un número
 * bien formado, NO que exista en el Registro Civil ni que pertenezca a la
 * persona. Sirve como primer filtro barato antes de consultar ACESS.
 */

export function isValidEcuadorianCedula(raw: string): boolean {
  const cedula = (raw ?? '').trim();

  if (!/^\d{10}$/.test(cedula)) return false;

  const province = Number(cedula.slice(0, 2));
  if (province < 1 || (province > 24 && province !== 30)) return false;

  const thirdDigit = Number(cedula[2]);
  if (thirdDigit >= 6) return false; // 6/9 = no personas naturales

  // Algoritmo módulo 10: coeficientes alternados 2,1,2,1,... sobre los
  // primeros 9 dígitos. Si el producto > 9 se le resta 9.
  const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let product = Number(cedula[i]) * coefficients[i];
    if (product > 9) product -= 9;
    sum += product;
  }

  const checkDigit = Number(cedula[9]);
  const nextTen = Math.ceil(sum / 10) * 10;
  const expected = (nextTen - sum) % 10;

  return expected === checkDigit;
}

/** Normaliza una cédula: quita espacios/guiones, deja solo dígitos. */
export function normalizeCedula(raw: string): string {
  return (raw ?? '').replace(/\D/g, '');
}
