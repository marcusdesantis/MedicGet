/**
 * BarChart — reusable SVG-free bar chart built with Tailwind divs.
 * Replaces 4 separate inline bar chart implementations across the app.
 */

interface BarChartItem {
  label: string;
  value: number;
}

interface BarChartProps {
  data:           BarChartItem[];
  height?:        number;    // px, default 112
  activeColor?:   string;    // tailwind class for highlighted bar
  inactiveColor?: string;    // tailwind class for other bars
  highlightLast?: boolean;   // highlight the last bar (current period)
  showValues?:    boolean;   // show value above each bar
  gap?:           string;    // tailwind gap class, default gap-2
}

export function BarChart({
  data,
  height        = 112,
  activeColor   = 'bg-blue-600',
  inactiveColor = 'bg-blue-200 dark:bg-blue-900/40',
  highlightLast = true,
  showValues    = false,
  gap           = 'gap-2',
}: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={`flex items-end ${gap}`} style={{ height }}>
      {data.map((item, i) => {
        const isActive = highlightLast ? i === data.length - 1 : false;
        const barH     = Math.max((item.value / max) * (height - 20), item.value > 0 ? 4 : 0);

        return (
          <div key={item.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            {showValues && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-none">
                {item.value > 0 ? item.value : ''}
              </span>
            )}
            <div
              className={`w-full rounded-t-lg transition-all ${isActive ? activeColor : inactiveColor}`}
              style={{ height: barH }}
            />
            <span className="text-[11px] text-slate-400 truncate w-full text-center">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
