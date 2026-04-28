// components/ui/Checkbox.tsx
export const Checkbox = ({
  checked,
  onChange,
  children,
  className = "",
}: any) => {
  return (
    <label
      className={`
        flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors group
        hover:bg-slate-50 dark:hover:bg-slate-800
        ${className}
      `}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="
          mt-1 w-4 h-4 rounded
          border-slate-300 dark:border-slate-600
          bg-white dark:bg-slate-900
          text-[#1A82FE]
          focus:ring-[#1A82FE] focus:ring-2
          cursor-pointer
        "
      />

      <div className="text-sm text-slate-600 dark:text-slate-300 leading-tight select-none">
        {children}
      </div>
    </label>
  );
};