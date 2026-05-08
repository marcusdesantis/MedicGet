/**
 * CountryProvinceSelect — par de selectores País + Provincia alimentados
 * por el catálogo `locations.ts`. Versión liviana del LocationPicker (sin
 * mapa ni reverse geocoding) para formularios donde sólo nos interesa
 * registrar país/provincia, p. ej. el perfil del paciente.
 *
 * Guarda los nombres legibles ("Ecuador", "Pichincha") — no los códigos —
 * para mantener la simetría con el resto de la app y con los filtros del
 * directorio público.
 */

import { COUNTRIES, findCountry } from '@/lib/locations';

interface Props {
  country?:  string;
  province?: string;
  onChange:  (next: { country?: string; province?: string }) => void;
  /** Si true, se muestra "*" al lado de los labels y se pone aria-required. */
  required?: boolean;
  /** Tamaños de label/control. "sm" = compacto (perfil), "md" = registro. */
  size?: 'sm' | 'md';
}

export function CountryProvinceSelect({
  country,
  province,
  onChange,
  required,
  size = 'md',
}: Props) {
  const c = findCountry(country);
  const labelCls = size === 'sm'
    ? 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1'
    : 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';
  const selectCls =
    'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className={labelCls}>
          País{required && ' *'}
        </label>
        <select
          value={c?.code ?? ''}
          aria-required={required}
          onChange={(e) => {
            const next = COUNTRIES.find((x) => x.code === e.target.value);
            onChange({
              country:  next?.name,
              // Cambiar país siempre limpia provincia para evitar combinaciones inválidas.
              province: undefined,
            });
          }}
          className={selectCls}
        >
          <option value="">Elegí país…</option>
          {COUNTRIES.map((co) => (
            <option key={co.code} value={co.code}>
              {co.flag} {co.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>
          Provincia / Estado{required && ' *'}
        </label>
        <select
          value={c?.provinces.find((p) => p.name === province)?.code ?? ''}
          disabled={!c}
          aria-required={required}
          onChange={(e) => {
            const p = c?.provinces.find((x) => x.code === e.target.value);
            onChange({ country: c?.name, province: p?.name });
          }}
          className={selectCls}
        >
          <option value="">{c ? 'Elegí provincia…' : 'Elegí país primero'}</option>
          {c?.provinces.map((p) => (
            <option key={p.code} value={p.code}>{p.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
