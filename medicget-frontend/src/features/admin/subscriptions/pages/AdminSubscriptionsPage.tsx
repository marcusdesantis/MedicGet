import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { toast }       from 'sonner';
import { PageHeader }  from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { Alert }       from '@/components/ui/Alert';
import { useApi }      from '@/hooks/useApi';
import { adminApi, type SubscriptionDto, type PaginatedData } from '@/lib/api';

const STATUS_PILL: Record<string, string> = {
  ACTIVE:          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  EXPIRED:         'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  CANCELLED:       'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  PENDING_PAYMENT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

export function AdminSubscriptionsPage() {
  const [status, setStatus]   = useState<string>('');
  const [extending, setExtending] = useState<string | null>(null);

  const { state, refetch } = useApi<PaginatedData<SubscriptionDto>>(
    () => adminApi.subscriptions({ status: status || undefined, pageSize: 100 }),
    [status],
  );

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
                      {s.plan?.name} <span className="text-xs text-slate-400">${s.plan?.monthlyPrice}/mes</span>
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
                      <button
                        onClick={() => extend(s.id)}
                        disabled={extending === s.id}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded-lg transition disabled:opacity-50"
                      >
                        {extending === s.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                        Extender
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
