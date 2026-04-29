import { TrendingUp, Users, Calendar, DollarSign } from 'lucide-react';
import { PageHeader }  from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { BarChart }    from '@/components/ui/BarChart';
import { CardContainer } from '@/components/ui/CardContainer';
import {
  monthlyChartData,
  monthlyAppointmentsData,
  monthlyPatientsData,
  specialtyDistribution,
} from '@/lib/mockData';

// ─── KPI tiles ───────────────────────────────────────────────────────────────
const KPIS = [
  { label: 'Ingresos YTD',     value: '€125,800', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  { label: 'Citas YTD',        value: '860',       icon: Calendar,   color: 'text-blue-600',    bg: 'bg-blue-100 dark:bg-blue-900/30'       },
  { label: 'Nuevos pacientes', value: '699',       icon: Users,      color: 'text-violet-600',  bg: 'bg-violet-100 dark:bg-violet-900/30'   },
  { label: 'Crecimiento',      value: '+18.4%',    icon: TrendingUp, color: 'text-indigo-600',  bg: 'bg-indigo-100 dark:bg-indigo-900/30'   },
];

// ─── Donut chart (pure SVG, unique to reports) ───────────────────────────────
function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function DonutChart({ data }: { data: typeof specialtyDistribution }) {
  const total      = data.reduce((s, d) => s + d.value, 0);
  let cumulative   = 0;
  const CX = 90, CY = 90, R = 70;

  const segments = data.map((d) => {
    const startAngle = (cumulative / total) * 360 - 90;
    cumulative += d.value;
    const endAngle = (cumulative / total) * 360 - 90;
    const start    = polarToCartesian(CX, CY, R, startAngle);
    const end      = polarToCartesian(CX, CY, R, endAngle);
    const large    = endAngle - startAngle > 180 ? 1 : 0;
    const path     = `M ${CX} ${CY} L ${start.x} ${start.y} A ${R} ${R} 0 ${large} 1 ${end.x} ${end.y} Z`;
    return { ...d, path };
  });

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width={180} height={180} viewBox="0 0 180 180">
        {segments.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} opacity={0.9} />
        ))}
        <circle cx={CX} cy={CY} r={42} className="fill-white dark:fill-slate-900" />
        <text x={CX} y={CY - 6}  textAnchor="middle" style={{ fontSize: 14, fontWeight: 700 }} className="fill-slate-800 dark:fill-white">{total}%</text>
        <text x={CX} y={CY + 10} textAnchor="middle" style={{ fontSize: 9,  fill: '#94a3b8'   }}>distribución</text>
      </svg>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.color }} />
            <span className="text-xs text-slate-600 dark:text-slate-300">{d.name}</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 ml-auto">{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Horizontal bar (patients by month) ──────────────────────────────────────
function HorizontalBars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-8">{d.label}</span>
          <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 dark:bg-violet-600 rounded-full transition-all"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-8 text-right">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Informes" subtitle="Análisis y métricas de la clínica" />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map((kpi) => (
          <CardContainer key={kpi.label} className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center flex-shrink-0`}>
              <kpi.icon size={18} className={kpi.color} />
            </div>
            <div>
              <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-xs text-slate-400">{kpi.label}</p>
            </div>
          </CardContainer>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Ingresos mensuales (€)">
          <BarChart data={monthlyChartData}      height={112} activeColor="bg-indigo-600" inactiveColor="bg-indigo-200 dark:bg-indigo-900/40" />
        </SectionCard>
        <SectionCard title="Citas mensuales">
          <BarChart data={monthlyAppointmentsData} height={112} activeColor="bg-blue-600"   inactiveColor="bg-blue-200 dark:bg-blue-900/40" />
        </SectionCard>
        <SectionCard title="Distribución por especialidad">
          <DonutChart data={specialtyDistribution} />
        </SectionCard>
        <SectionCard title="Nuevos pacientes por mes">
          <HorizontalBars data={monthlyPatientsData} />
        </SectionCard>
      </div>
    </div>
  );
}
