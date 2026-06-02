/**
 * LegalConsent — checkbox unificado de Términos + Privacidad para los 3
 * formularios finales de registro (paciente / médico / clínica).
 *
 * - Un solo checkbox cubre AMBOS documentos (UX estándar).
 * - Cada documento linkea a su propia página (target="_blank" para que
 *   el usuario pueda leerlos sin perder el progreso del formulario).
 * - El padre controla el estado (`accepted`) y debe deshabilitar el
 *   botón de envío si `!accepted`.
 *
 * El backend (svc-auth/register) exige `acceptedTerms === true` y
 * `acceptedPrivacy === true`. Como el UI los maneja como uno solo,
 * cuando el caller envía el body de registro pasa ambos en true cuando
 * `accepted` es true.
 */

import { Link } from 'react-router-dom';

interface LegalConsentProps {
  accepted: boolean;
  onChange: (next: boolean) => void;
  /** Color del checkbox para que combine con el flujo del rol. */
  accent?: 'blue' | 'teal' | 'indigo';
  /** Mensaje de error inline (cuando intentaron enviar sin aceptar). */
  error?: string | null;
}

const ACCENT: Record<NonNullable<LegalConsentProps['accent']>, { ring: string; check: string }> = {
  blue:   { ring: 'focus:ring-blue-500',   check: 'accent-blue-600' },
  teal:   { ring: 'focus:ring-teal-500',   check: 'accent-teal-600' },
  indigo: { ring: 'focus:ring-indigo-500', check: 'accent-indigo-600' },
};

export function LegalConsent({ accepted, onChange, accent = 'blue', error }: LegalConsentProps) {
  const a = ACCENT[accent];
  return (
    <div>
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => onChange(e.target.checked)}
          className={`mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-600 ${a.check} ${a.ring} focus:ring-2 focus:ring-offset-0`}
        />
        <span className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Declaro que leí y acepto los{' '}
          <Link
            to="/terminos"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline font-medium"
          >
            Términos y Condiciones
          </Link>{' '}
          y la{' '}
          <Link
            to="/privacidad"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline font-medium"
          >
            Política de Privacidad
          </Link>{' '}
          de MedicGet.
        </span>
      </label>
      {error ? (
        <p className="text-xs text-rose-600 mt-1.5 ml-7">{error}</p>
      ) : null}
    </div>
  );
}
