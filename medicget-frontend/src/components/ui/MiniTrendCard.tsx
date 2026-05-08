/**
 * MiniTrendCard — pequeña card con título, sparkline (TrendLineChart) y un
 * link "Ver reportes →". Para resaltar tendencias en los dashboards.
 *
 *   <MiniTrendCard
 *     title="Ingresos últimos 6 meses"
 *     reportsLink="/doctor/reports"
 *     data={[{ label: 'Ene', value: 120 }, ...]}
 *     color="#10b981"
 *     formatValue={(v) => `$${v.toFixed(0)}`}
 *   />
 */

import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { TrendLineChart, type TrendPoint } from './TrendLineChart';

interface Props {
  title:        string;
  subtitle?:    string;
  reportsLink:  string;
  data:         TrendPoint[];
  color?:       string;
  formatValue?: (n: number) => string;
}

export function MiniTrendCard({
  title,
  subtitle,
  reportsLink,
  data,
  color,
  formatValue,
}: Props) {
  const total = data.reduce((s, p) => s + p.value, 0);
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-white">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <Link
          to={reportsLink}
          className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1 flex-shrink-0"
        >
          Ver reportes <ArrowRight size={12} />
        </Link>
      </div>
      <TrendLineChart
        data={data}
        height={140}
        color={color}
        formatValue={formatValue}
      />
      <p className="mt-2 text-[11px] text-slate-400">
        Total acumulado: <strong className="text-slate-700 dark:text-slate-200">
          {formatValue ? formatValue(total) : total}
        </strong>
      </p>
    </div>
  );
}
