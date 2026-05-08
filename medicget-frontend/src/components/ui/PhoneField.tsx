/**
 * PhoneField — wrapper consistente sobre `react-phone-input-2` con el
 * estilo `phone-input-wrapper` de `index.css`. Mantiene un selector de
 * código de país (default Ecuador) en TODA la app — perfiles, registro,
 * admin, etc. — para que el usuario elija país en lugar de escribir el
 * prefijo a mano.
 *
 *   <PhoneField
 *     value={form.phone}
 *     onChange={(v) => setForm({ ...form, phone: v })}
 *   />
 */

import PhoneInput from 'react-phone-input-2';

interface Props {
  value:    string;
  onChange: (value: string) => void;
  /** ISO-2 lowercase del país por defecto (default 'ec'). */
  country?: string;
  /** Si es true, marca el control como inválido (estilo aria). */
  invalid?: boolean;
  /** Permite desactivar el campo (vista de sólo lectura). */
  disabled?: boolean;
  /** Lista de países preferidos arriba en el dropdown. */
  preferredCountries?: string[];
}

export function PhoneField({
  value,
  onChange,
  country = 'ec',
  invalid,
  disabled,
  preferredCountries = ['ec', 'pe', 'co', 'ar', 'mx', 'cl'],
}: Props) {
  return (
    <div className="phone-input-wrapper" aria-invalid={invalid || undefined}>
      <PhoneInput
        country={country}
        value={value}
        onChange={(phone) => onChange(phone)}
        disabled={disabled}
        preferredCountries={preferredCountries}
        enableSearch
        searchPlaceholder="Buscar país…"
      />
    </div>
  );
}
