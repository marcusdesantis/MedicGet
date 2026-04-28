type Option = {
  label: string;
  value: string;
};

type Props = {
  options: Option[];
  value?: string;
  onChange: (value: string) => void;
};

export const Select = ({ options, value, onChange }: Props) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="
        w-full rounded-lg border border-slate-300 dark:border-slate-700
        bg-white dark:bg-slate-900
        px-3 py-2 text-sm
        text-slate-800 dark:text-white
        focus:outline-none focus:ring-2 focus:ring-[#1A82FE]
      "
    >
      <option value="">Selecciona una opción</option>

      {options.map((opt) => (
        <option key={opt.value} value={opt.label}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};