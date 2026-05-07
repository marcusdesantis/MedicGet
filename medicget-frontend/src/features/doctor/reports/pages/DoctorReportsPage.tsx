/**
 * /doctor/reports — reportes para el médico.
 *
 *  - KPIs trimestrales (citas, ingresos, valoración media, no-shows)
 *  - Gráfico de citas por mes (últimos 6 meses)
 *  - Distribución por modalidad (online/presencial/chat)
 *  - Top pacientes recurrentes
 *
 * Bloqueado para planes que no incluyen REPORTS — upsell que lleva a
 * /doctor/plan.
 */
import { useMemo } from 'react';
import { Loader2, Lock, Calendar, Star, TrendingUp, AlertCircle, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader }    from '@/components/ui/PageHeader';
import { SectionCard }   from '@/components/ui/SectionCard';
import { CardContainer } from '@/components/ui/CardContainer';
import { Alert }         from '@/components/ui/Alert';
import { useApi }        from '@/hooks/useApi';
import {
  appointmentsApi, subscriptionsApi,
  type AppointmentDto, type PaginatedData,
} from '@/lib/api';

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function DoctorReportsPage() {
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
    const completed = all.filter((a) => a.status === 'COMPLETED');
    const noShows   = all.filter((a) => a.status === 'NO_SHOW');
    const cancelled = all.filter((a) => a.status === 'CANCELLED');

    const grossRevenue = all
      .filter((a) => a.payment?.status === 'PAID')
      .reduce((s, a) => s + (a.payment?.doctorAmount ?? 0), 0);

    // Conteo por mes (últimos 6)
    const monthly = new Array(6).fill(0).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const ym = `${d.getFullYear()}-${d.getMonth()}`;
      const count = all.filter((a) => {
        const ad = new Date(a.date);
        return `${ad.getFullYear()}-${ad.getMonth()}` === ym;
      }).length;
      return { label: MONTH_LABELS[d.getMonth()], count };
    });

    // Modalidades
    const byModality = {
      ONLINE:     all.filter((a) => a.modality === 'ONLINE').length,
      PRESENCIAL: all.filter((a) => a.modality === 'PRESENCIAL').length,
      CHAT:       all.filter((a) => a.modality === 'CHAT').length,
    };

    // Top pacientes
    const patientMap = new Map<string, { name: string; count: number }>();
    for (const a of all) {
      const id = a.patient?.id;
      if (!id) continue;
      const name = `${a.patient?.user?.profile?.firstName ?? ''} ${a.patient?.user?.profile?.lastName ?? ''}`.trim() || 'Paciente';
      const cur = patientMap.get(id) ?? { name, count: 0 };
      cur.count += 1;
      patientMap.set(id, cur);
    }
    const topPatients = [...patientMap.values()].sort((a, b) => b.count - a.count).slice(0, 5);

    return {
      total: all.length,
      completed: completed.length,
      noShows: noShows.length,
      cancelled: cancelled.length,
      grossRevenue,
      monthly,
      byModality,
      topPatients,
    };
  }, [appts.state]);

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
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi icon={Calendar}    label="Citas totales"   value={String(data.total)}     color="blue" />
            <Kpi icon={TrendingUp}  label="Atendidas"       value={String(data.completed)} color="emerald" sub={`${data.total > 0 ? Math.round(data.completed / data.total * 100) : 0}% del total`} />
            <Kpi icon={AlertCircle} label="Inasistencias"   value={String(data.noShows)}   color="amber" />
            <Kpi icon={Star}        label="Ingresos netos"  value={`$${data.grossRevenue.toFixed(2)}`} color="purple" sub="después de comisión" />
          </div>

          {/* Mensual */}
          <SectionCard title="Citas por mes" subtitle="Últimos 6 meses">
            <div className="flex items-end justify-between gap-2 h-40">
              {data.monthly.map((m, i) => {
                const max = Math.max(1, ...data.monthly.map((x) => x.count));
                const h = (m.count / max) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full relative flex items-end h-32">
                      <div
                        className="w-full bg-gradient-to-t from-blue-500 to-indigo-500 rounded-t-lg transition-all"
                        style={{ height: `${h}%`, minHeight: m.count > 0 ? '8px' : '0' }}
                      />
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                        {m.count}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">{m.label}</span>
                  </div>
                );
              })}
            </div>
          </SectionCard>

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
