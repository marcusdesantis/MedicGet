import { useMemo, useState } from 'react';
import { Loader2, Plus, Repeat, X } from 'lucide-react';
import { toast }       from 'sonner';
import { PageHeader }  from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { Alert }       from '@/components/ui/Alert';
import { Button }      from '@/components/ui/Button';
import { useApi }      from '@/hooks/useApi';
import { adminApi, type SubscriptionDto, type PaginatedData, type PlanDto } from '@/lib/api';

const STATUS_PILL: Record<string, string> = {
  ACTIVE:          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  EXPIRED:         'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  CANCELLED:       'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  PENDING_PAYMENT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

export function AdminSubscriptionsPage() {
  const [status, setStatus]   = useState<string>('');
  const [extending, setExtending] = useState<string | null>(null);
  const [changingSub, setChangingSub] = useState<SubscriptionDto | null>(null);

  const { state, refetch } = useApi<PaginatedData<SubscriptionDto>>(
    () => adminApi.subscriptions({ status: status || undefined, pageSize: 100 }),
    [status],
  );

  // Cargo TODOS los planes una vez para el selector del modal — no es
  // pesado (6 filas) y evita un round-trip al abrir cada modal.
  const plansQ = useApi(() => adminApi.listPlans(), []);
  const plans  = plansQ.state.status === 'ready' ? plansQ.state.data : [];

  const extend = async (id: string) => {
    const days = Number(prompt('¿Cuántos días querés sumar?', '30'));
    if (!Number.isFinite(days) || days <= 0) return;
    setExtending(id);
    try {
      await adminApi.extendSubscription(id, days);
      toast.success(`Suscripción extendida ${days} días`);
      refetch();
    } catch {
      toast.error('No se pudo extender');
    } finally {
      setExtending(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Suscripciones" subtitle="Auditá pagos, extendé períodos y monitoreá renovaciones" />

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Todos los estados</option>
        <option value="ACTIVE">Activas</option>
        <option value="PENDING_PAYMENT">Pendientes de pago</option>
        <option value="EXPIRED">Expiradas</option>
        <option value="CANCELLED">Canceladas</option>
      </select>

      <SectionCard noPadding>
        {state.status === 'loading' && (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="animate-spin" size={20} />
          </div>
        )}
        {state.status === 'error' && <div className="p-6"><Alert variant="error">{state.error.message}</Alert></div>}
        {state.status === 'ready' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3">Cuenta</th>
                  <th className="text-left px-5 py-3">Plan</th>
                  <th className="text-left px-5 py-3">Estado</th>
                  <th className="text-left px-5 py-3">Inicio</th>
                  <th className="text-left px-5 py-3">Vence</th>
                  <th className="text-right px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {state.data.data.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-800 dark:text-white">
                        {s.user?.profile?.firstName} {s.user?.profile?.lastName}
                      </p>
                      <p className="text-xs text-slate-400">{s.user?.email}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      {s.plan?.name} <span className="text-xs text-slate-400">${(s.plan?.monthlyPrice ?? 0).toFixed(2)}/mes</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_PILL[s.status]}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {new Date(s.startsAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {new Date(s.expiresAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setChangingSub(s)}
                          className="inline-flex items-center gap-1 text-xs text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 px-2 py-1 rounded-lg transition"
                          title="Cambiar plan"
                        >
                          <Repeat size={12} /> Cambiar plan
                        </button>
                        <button
                          onClick={() => extend(s.id)}
                          disabled={extending === s.id}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded-lg transition disabled:opacity-50"
                          title="Extender vencimiento"
                        >
                          {extending === s.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                          Extender
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {changingSub && (
        <ChangePlanModal
          subscription={changingSub}
          plans={plans}
          onClose={() => setChangingSub(null)}
          onChanged={() => { setChangingSub(null); refetch(); }}
        />
      )}
    </div>
  );
}

/* ─────────────── Change-plan modal ─────────────── */

function ChangePlanModal({
  subscription, plans, onClose, onChanged,
}: {
  subscription: SubscriptionDto;
  plans:        PlanDto[];
  onClose:      () => void;
  onChanged:    () => void;
}) {
  const [selectedId, setSelectedId] = useState<string>(subscription.planId);
  const [saving,     setSaving]     = useState(false);

  // Filtrar planes a la audiencia correcta de la suscripción.
  const eligible = useMemo(
    () => plans.filter((p) => p.audience === subscription.plan?.audience && p.isActive),
    [plans, subscription.plan?.audience],
  );

  const userName = `${subscription.user?.profile?.firstName ?? ''} ${subscription.user?.profile?.lastName ?? ''}`.trim() || subscription.user?.email || 'Usuario';
  const isSame   = selectedId === subscription.planId;

  const handleSave = async () => {
    if (isSame || saving) return;
    setSaving(true);
    try {
      await adminApi.changeSubscriptionPlan(subscription.id, selectedId);
      const newPlan = plans.find((p) => p.id === selectedId);
      toast.success(`Plan cambiado a ${newPlan?.name ?? '—'}`);
      onChanged();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'No se pudo cambiar el plan';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-sm overflow-y-auto p-4 pt-16">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-semibold flex items-center gap-2 text-slate-800 dark:text-white">
            <Repeat size={18} className="text-purple-600" /> Cambiar plan
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <Alert variant="info">
            <strong>Acción manual del superadmin.</strong> No genera cobro ni reembolso a través de PayPhone.
            Si el usuario quiere mantener tracking comercial, registralo aparte.
          </Alert>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Cuenta</p>
            <p className="font-semibold text-slate-800 dark:text-white">{userName}</p>
            <p className="text-xs text-slate-500">{subscription.user?.email}</p>
            <p className="text-xs text-slate-500 mt-2">
              Plan actual: <strong className="text-slate-700 dark:text-slate-300">{subscription.plan?.name}</strong>
              {' '}· vence el {new Date(subscription.expiresAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">Plan destino</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {eligible.map((p) => {
                const on = p.id === selectedId;
                const isCurrent = p.id === subscription.planId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`text-left rounded-xl border-2 p-4 transition ${
                      on
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className={`text-[10px] uppercase tracking-wider font-bold ${
                        on ? 'text-purple-600' : 'text-slate-400'
                      }`}>{p.code}</p>
                      {isCurrent && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                          Actual
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-slate-800 dark:text-white text-sm mt-1">{p.name}</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-white mt-2">
                      ${p.monthlyPrice.toFixed(2)}<span className="text-xs text-slate-400 font-normal">/mes</span>
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 p-3">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              {selectedId !== subscription.planId ? (
                <>Al confirmar, la suscripción se actualiza al plan elegido y se extiende a 30 días desde hoy (FREE: sin vencimiento).</>
              ) : (
                <>El plan seleccionado es el mismo que el actual. Elegí otro para confirmar el cambio.</>
              )}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
          <Button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSame || saving}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Repeat size={14} />}
            Cambiar plan
          </Button>
        </div>
      </div>
    </div>
  );
}
