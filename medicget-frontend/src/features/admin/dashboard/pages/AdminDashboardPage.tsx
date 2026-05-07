/**
 * Superadmin home — high-level KPIs across the whole platform.
 */
import { Loader2, Users, Stethoscope, Building2, UserCheck, Calendar, DollarSign, Percent, BadgeCheck } from 'lucide-react';
import { PageHeader }    from '@/components/ui/PageHeader';
import { CardContainer } from '@/components/ui/CardContainer';
import { Alert }         from '@/components/ui/Alert';
import { useApi }        from '@/hooks/useApi';
import { adminApi }      from '@/lib/api';

function fmtMoney(n: number) { return `$${n.toFixed(2)}`; }

export function AdminDashboardPage() {
  const { state, refetch } = useApi(() => adminApi.stats(), []);

  if (state.status === 'loading') {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <Alert variant="error" action={
        <button onClick={refetch} className="text-sm font-medium underline">Reintentar</button>
      }>{state.error.message}</Alert>
    );
  }

  const s = state.data;

  return (
    <div className="space-y-6">
      <PageHeader title="Panel general" subtitle="Visión global de la plataforma MedicGet" />

      {/* Users row */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Usuarios</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={Users}       color="blue"    label="Total activos" value={s.users.total} />
          <Kpi icon={UserCheck}   color="indigo"  label="Pacientes"     value={s.users.patients} />
          <Kpi icon={Stethoscope} color="teal"    label="Médicos"       value={s.users.doctors} />
          <Kpi icon={Building2}   color="purple"  label="Clínicas"      value={s.users.clinics} />
        </div>
      </div>

      {/* Activity row */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Actividad</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={Calendar}   color="indigo"  label="Citas totales"        value={s.appointments.total} />
          <Kpi icon={DollarSign} color="emerald" label="Volumen pagado"       value={fmtMoney(s.revenue.gross)} />
          <Kpi icon={Percent}    color="purple"  label="Comisión retenida"    value={fmtMoney(s.revenue.platformFees)} />
          <Kpi icon={BadgeCheck} color="amber"   label="Suscripciones activas" value={s.subscriptions.active} />
        </div>
      </div>

      <CardContainer>
        <h3 className="font-semibold text-slate-800 dark:text-white mb-2">Atajos del superadmin</h3>
        <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
          <li>· <strong>Usuarios</strong> — ver, suspender o eliminar cualquier cuenta.</li>
          <li>· <strong>Planes</strong> — crear, editar y desactivar planes para médicos y clínicas.</li>
          <li>· <strong>Suscripciones</strong> — auditar pagos y extender períodos manualmente.</li>
          <li>· <strong>Configuración</strong> — SMTP, PayPhone, Jitsi, comisión y branding sin redeploy.</li>
        </ul>
      </CardContainer>
    </div>
  );
}

function Kpi({ icon: Icon, color, label, value }: {
  icon:  typeof Users;
  color: 'blue' | 'teal' | 'indigo' | 'purple' | 'emerald' | 'amber';
  label: string;
  value: number | string;
}) {
  const colors = {
    blue:    'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
    teal:    'bg-teal-100 dark:bg-teal-900/30 text-teal-600',
    indigo:  'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600',
    purple:  'bg-purple-100 dark:bg-purple-900/30 text-purple-600',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600',
    amber:   'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
  };
  return (
    <CardContainer>
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-xs text-slate-400">{label}</p>
          <p className="text-xl font-bold text-slate-800 dark:text-white">{value}</p>
        </div>
      </div>
    </CardContainer>
  );
}
