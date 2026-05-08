/**
 * /doctor/reports — reportes para el médico.
 *
 *  - Filtro de rango de fechas (30/90 días, este año, todo el historial).
 *  - KPIs (citas, completadas, no-shows, ingresos).
 *  - Línea de tendencia de citas + línea de ingresos.
 *  - Distribución por modalidad y top pacientes.
 *  - Botones de descarga CSV (citas, pagos, pacientes recurrentes).
 *
 * Bloqueado para planes que no incluyen REPORTS — upsell a /doctor/plan.
 */
import { useMemo, useState } from 'react';
import {
  Loader2, Lock, Calendar, Star, TrendingUp, AlertCircle, Download,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader }    from '@/components/ui/PageHeader';
import { SectionCard }   from '@/components/ui/SectionCard';
import { CardContainer } from '@/components/ui/CardContainer';
import { Alert }         from '@/components/ui/Alert';
import { TrendLineChart } from '@/components/ui/TrendLineChart';
import { useApi }        from '@/hooks/useApi';
import {
  appointmentsApi, subscriptionsApi,
  type AppointmentDto, type PaginatedData,
} from '@/lib/api';
import { downloadCsv, dateStampedName } from '@/lib/csv';

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

type RangeKey = '30d' | '90d' | 'ytd' | 'all';
const RANGE_LABELS: Record<RangeKey, string> = {
  '30d': 'Últimos 30 días',
  '90d': 'Últimos 90 días',
  'ytd': 'Este año',
  'all': 'Todo el historial',
};

function rangeStart(range: RangeKey): Date | null {
  const now = new Date();
  if (range === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (range === '90d') return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  if (range === 'ytd') return new Date(now.getFullYear(), 0, 1);
  return null;
}

export function DoctorReportsPage() {
  const [range, setRange] = useState<RangeKey>('90d');

  const meSub = useApi(() => subscriptionsApi.me(), []);
  const appts = useApi<PaginatedData<AppointmentDto>>(
    () => appointmentsApi.list({ pageSize: 500 }),
    [],
  );

  const plan = meSub.state.status === 'ready'
    ? meSub.state.data.subscription?.plan ?? meSub.state.data.freePlan
    : null;
  const hasFeature = plan?.modules.includes('REPORTS') ?? false;

  const data = useMemo(() => {
    if (appts.state.status !== 'ready') return null;
    const all = appts.state.data.data;

    // Aplicar filtro de rango.
    const start = rangeStart(range);
    const filtered = start ? all.filter((a) => new Date(a.date) >= start) : all;

    const completed = filtered.filter((a) => a.status === 'COMPLETED');
    const noShows   = filtered.filter((a) => a.status === 'NO_SHOW');
    const cancelled = filtered.filter((a) => a.status === 'CANCELLED');

    const grossRevenue = filtered
      .filter((a) => a.payment?.status === 'PAID')
      .reduce((s, a) => s + (a.payment?.doctorAmount ?? 0), 0);

    // Tendencia de citas e ingresos por mes (últimos N según rango).
    const monthsCount = range === '30d' ? 1 : range === '90d' ? 3 : range === 'ytd' ? new Date().getMonth() + 1 : 12;
    const monthly = new Array(Math.max(monthsCount, 6)).fill(0).map((_, i) => {
      const limit = Math.max(monthsCount, 6);
      const d = new Date();
      d.setMonth(d.getMonth() - (limit - 1 - i));
      const ym = `${d.getFullYear()}-${d.getMonth()}`;
      const monthAppts = filtered.filter((a) => {
        const ad = new Date(a.date);
        return `${ad.getFullYear()}-${ad.getMonth()}` === ym;
      });
      const monthRevenue = monthAppts
        .filter((a) => a.payment?.status === 'PAID')
        .reduce((s, a) => s + (a.payment?.doctorAmount ?? 0), 0);
      return {
        label:   MONTH_LABELS[d.getMonth()] ?? '',
        count:   monthAppts.length,
        revenue: monthRevenue,
      };
    });

    // Modalidades.
    const byModality = {
      ONLINE:     filtered.filter((a) => a.modality === 'ONLINE').length,
      PRESENCIAL: filtered.filter((a) => a.modality === 'PRESENCIAL').length,
      CHAT:       filtered.filter((a) => a.modality === 'CHAT').length,
    };

    // Top pacientes.
    const patientMap = new Map<string, { name: string; count: number; lastDate: string }>();
    for (const a of filtered) {
      const id = a.patient?.id;
      if (!id) continue;
      const name = `${a.patient?.user?.profile?.firstName ?? ''} ${a.patient?.user?.profile?.lastName ?? ''}`.trim() || 'Paciente';
      const cur = patientMap.get(id) ?? { name, count: 0, lastDate: a.date };
      cur.count += 1;
      if (new Date(a.date) > new Date(cur.lastDate)) cur.lastDate = a.date;
      patientMap.set(id, cur);
    }
    const topPatients = [...patientMap.values()].sort((a, b) => b.count - a.count).slice(0, 5);

    return {
      filtered,
      total: filtered.length,
      completed: completed.length,
      noShows: noShows.length,
      cancelled: cancelled.length,
      grossRevenue,
      monthly,
      byModality,
      topPatients,
    };
  }, [appts.state, range]);

  // Exportadores CSV.
  const exportAppointments = () => {
    if (!data) return;
    const rows = data.filtered.map((a) => ({
      fecha:      new Date(a.date).toISOString().slice(0, 10),
      hora:       a.time,
      paciente:   `${a.patient?.user?.profile?.firstName ?? ''} ${a.patient?.user?.profile?.lastName ?? ''}`.trim(),
      modalidad:  a.modality,
      estado:     a.status,
      pago:       a.payment?.status ?? 'SIN_COBRO',
      bruto:      a.payment?.amount ?? 0,
      neto:       a.payment?.doctorAmount ?? 0,
    }));
    downloadCsv(dateStampedName('citas'), rows);
  };

  const exportPayments = () => {
    if (!data) return;
    const rows = data.filtered
      .filter((a) => a.payment)
      .map((a) => ({
        fecha:        new Date(a.date).toISOString().slice(0, 10),
        paciente:     `${a.patient?.user?.profile?.firstName ?? ''} ${a.patient?.user?.profile?.lastName ?? ''}`.trim(),
        modalidad:    a.modality,
        estado_cita:  a.status,
        estado_pago:  a.payment?.status,
        monto_bruto:  a.payment?.amount ?? 0,
        comision:    (a.payment?.amount ?? 0) - (a.payment?.doctorAmount ?? 0),
        monto_neto:   a.payment?.doctorAmount ?? 0,
      }));
    downloadCsv(dateStampedName('pagos'), rows);
  };

  const exportPatients = () => {
    if (!data) return;
    const rows = data.topPatients.map((p) => ({
      paciente:       p.name,
      visitas:        p.count,
      ultima_visita:  new Date(p.lastDate).toISOString().slice(0, 10),
    }));
    downloadCsv(dateStampedName('pacientes-recurrentes'), rows);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Reportes" subtitle="Analítica de tu actividad clínica" />

      {meSub.state.status === 'ready' && !hasFeature && (
        <SectionCard>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Lock size={20} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-800 dark:text-white">Reportes avanzados — Plan Premium</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tu plan actual ({plan?.name}) no incluye reportes. Actualizá para ver
                analítica de citas, ingresos y comportamiento de pacientes.
              </p>
            </div>
            <Link
              to="/doctor/plan"
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition flex-shrink-0"
            >
              Mejorar plan
            </Link>
          </div>
        </SectionCard>
      )}

      {appts.state.status === 'loading' && (
        <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="animate-spin" size={20} /></div>
      )}
      {appts.state.status === 'error' && <Alert variant="error">{appts.state.error.message}</Alert>}

      {hasFeature && data && (
        <>
          {/* Toolbar: rango + descargas */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {(Object.keys(RANGE_LABELS) as RangeKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setRange(k)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    range === k
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {RANGE_LABELS[k]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <DownloadButton onClick={exportAppointments} label="Citas (CSV)" />
              <DownloadButton onClick={exportPayments}     label="Pagos (CSV)" />
              <DownloadButton onClick={exportPatients}     label="Pacientes (CSV)" />
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi icon={Calendar}    label="Citas totales"   value={String(data.total)}     color="blue" />
            <Kpi icon={TrendingUp}  label="Atendidas"       value={String(data.completed)} color="emerald" sub={`${data.total > 0 ? Math.round(data.completed / data.total * 100) : 0}% del total`} />
            <Kpi icon={AlertCircle} label="Inasistencias"   value={String(data.noShows)}   color="amber" />
            <Kpi icon={Star}        label="Ingresos netos"  value={`$${data.grossRevenue.toFixed(2)}`} color="purple" sub="después de comisión" />
          </div>

          {/* Tendencias — citas + ingresos */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <SectionCard title="Tendencia de citas" subtitle="Evolución mensual">
              <TrendLineChart
                data={data.monthly.map((m) => ({ label: m.label, value: m.count }))}
                color="#3b82f6"
                formatValue={(v) => String(Math.round(v))}
              />
            </SectionCard>

            <SectionCard title="Tendencia de ingresos" subtitle="Después de comisión, mensual">
              <TrendLineChart
                data={data.monthly.map((m) => ({ label: m.label, value: m.revenue }))}
                color="#8b5cf6"
                formatValue={(v) => `$${v.toFixed(0)}`}
              />
            </SectionCard>
          </div>

          {/* Modalidades + Top pacientes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Distribución por modalidad">
              <div className="space-y-3">
                {Object.entries(data.byModality).map(([m, count]) => {
                  const total = data.total || 1;
                  const pct = (count / total) * 100;
                  return (
                    <div key={m}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="capitalize text-slate-600 dark:text-slate-300 font-medium">{m.toLowerCase()}</span>
                        <span className="text-slate-500">{count} · {pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            m === 'ONLINE'     ? 'bg-blue-500'    :
                            m === 'PRESENCIAL' ? 'bg-rose-500'    :
                                                  'bg-emerald-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Pacientes recurrentes" subtitle="Top 5 con más visitas">
              {data.topPatients.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">Sin datos suficientes todavía</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.topPatients.map((p, i) => (
                    <li key={i} className="py-2.5 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800 dark:text-white">{p.name}</span>
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                        {p.count} visita{p.count === 1 ? '' : 's'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}

function DownloadButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
    >
      <Download size={12} /> {label}
    </button>
  );
}

function Kpi({ icon: Icon, color, label, value, sub }: {
  icon: typeof Calendar;
  color: 'blue' | 'emerald' | 'amber' | 'purple';
  label: string;
  value: string;
  sub?: string;
}) {
  const c: Record<string, string> = {
    blue:    'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600',
    amber:   'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
    purple:  'bg-purple-100 dark:bg-purple-900/30 text-purple-600',
  };
  return (
    <CardContainer>
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${c[color]}`}><Icon size={18} /></div>
        <div>
          <p className="text-xs text-slate-400">{label}</p>
          <p className="text-xl font-bold text-slate-800 dark:text-white">{value}</p>
          {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
        </div>
      </div>
    </CardContainer>
  );
}
