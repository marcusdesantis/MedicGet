/**
 * CSV export helpers — convertir un array de objetos a CSV y disparar la
 * descarga en el navegador sin librerías extra. Usado por las páginas de
 * reportes del médico y la clínica.
 *
 *   downloadCsv('citas-2026-05.csv', [
 *     { fecha: '2026-05-01', paciente: 'Juan Pérez', estado: 'COMPLETED' },
 *     ...
 *   ]);
 *
 * Detalles:
 * - El BOM UTF-8 (`﻿`) al inicio garantiza que Excel abra los acentos
 *   correctamente en Windows en español.
 * - Cada celda se entrecomilla y los `"` internos se duplican según RFC 4180.
 * - Si el array está vacío, el archivo se genera con sólo los headers que
 *   se pasen explícitamente, o nada si tampoco se pasaron.
 */

export type CsvRow = Record<string, string | number | boolean | null | undefined>;

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function rowsToCsv(rows: CsvRow[], headers?: string[]): string {
  const cols = headers && headers.length > 0
    ? headers
    : Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  if (cols.length === 0) return '';
  const head = cols.map(escapeCell).join(',');
  const body = rows.map((r) => cols.map((c) => escapeCell(r[c])).join(',')).join('\n');
  return `﻿${head}\n${body}\n`;
}

export function downloadCsv(filename: string, rows: CsvRow[], headers?: string[]): void {
  const csv = rowsToCsv(rows, headers);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Liberamos la URL después de un tick para que Safari alcance a iniciar
  // la descarga antes de invalidar el blob.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Atajo: arma el filename con la fecha de hoy. */
export function dateStampedName(prefix: string): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${prefix}-${yyyy}-${mm}-${dd}.csv`;
}
