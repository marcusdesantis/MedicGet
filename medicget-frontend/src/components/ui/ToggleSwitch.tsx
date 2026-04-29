/**
 * ToggleSwitch — accessible on/off toggle used for availability, settings, etc.
 */

interface ToggleSwitchProps {
  checked:   boolean;
  onChange:  (checked: boolean) => void;
  label?:    string;
  onLabel?:  string;
  offLabel?: string;
  color?:    string; // active track color, default emerald
  disabled?: boolean;
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  onLabel  = 'Activo',
  offLabel = 'Inactivo',
  color    = 'bg-emerald-500',
  disabled = false,
}: ToggleSwitchProps) {
  const displayLabel = label ?? (checked ? onLabel : offLabel);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`
        flex items-center gap-2 select-none transition
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {/* Track */}
      <span
        className={`
          relative inline-flex w-11 h-6 rounded-full transition-colors
          ${checked ? color : 'bg-slate-300 dark:bg-slate-600'}
        `}
      >
        {/* Thumb */}
        <span
          className={`
            absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow
            transform transition-transform
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </span>
      {displayLabel && (
        <span className={`text-sm font-medium ${checked ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
          {displayLabel}
        </span>
      )}
    </button>
  );
}
