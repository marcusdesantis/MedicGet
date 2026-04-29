/**
 * Tabs — pill-style tab switcher used across all role dashboards.
 * Accepts either plain string labels or {label, value} objects.
 */

interface TabItem {
  label: string;
  value: string;
}

interface TabsProps {
  tabs:      string[] | TabItem[];
  active:    string;
  onChange:  (value: string) => void;
  className?: string;
}

function normalize(tab: string | TabItem): TabItem {
  return typeof tab === 'string' ? { label: tab, value: tab } : tab;
}

export function Tabs({ tabs, active, onChange, className = '' }: TabsProps) {
  const items = tabs.map(normalize);

  return (
    <div className={`flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit ${className}`}>
      {items.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`
            px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap
            ${active === value
              ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }
          `}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
