import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconBg?: string;   // e.g. "bg-blue-100 dark:bg-blue-900/30"
  iconColor?: string; // e.g. "text-blue-600"
  trend?: string;
  trendUp?: boolean;
}

export function StatCard({ label, value, icon: Icon, iconBg, iconColor, trend, trendUp }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700
                    p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center
                       ${iconBg ?? 'bg-slate-100 dark:bg-slate-800'}`}>
        <Icon size={22} className={iconColor ?? 'text-slate-600 dark:text-slate-300'} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{label}</p>
        <p className="text-2xl font-bold text-slate-800 dark:text-white leading-tight mt-0.5">{value}</p>
        {trend && (
          <p className={`text-xs mt-0.5 font-medium ${trendUp ? 'text-emerald-600' : 'text-rose-500'}`}>
            {trendUp ? '▲' : '▼'} {trend}
          </p>
        )}
      </div>
    </div>
  );
}
