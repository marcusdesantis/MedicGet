/**
 * StatusBadge — renders a colored pill badge from a centralized status map.
 * Pages never define badge colors inline; they import a statusMap from lib/statusConfig.
 */

export interface StatusConfig {
  label:     string;
  className: string; // full Tailwind class string (bg + text + dark variants)
}

export type StatusMap = Record<string, StatusConfig>;

interface StatusBadgeProps {
  status:    string;
  statusMap: StatusMap;
  size?:     'sm' | 'md';
}

export function StatusBadge({ status, statusMap, size = 'md' }: StatusBadgeProps) {
  const config = statusMap[status] ?? {
    label:     status,
    className: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  };

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${config.className}`}>
      {config.label}
    </span>
  );
}
