/**
 * ManagePlanPage — gestión del plan del usuario logueado.
 *
 *  ┌───────────────────────────────────────────────────────────┐
 *  │  Plan actual: Pro                                         │
 *  │  Vence el 12 jun 2026                                     │
 *  │  ✓ Online · Presencial · Chat · Pagos                     │
 *  │  [ Cancelar suscripción ]                                 │
 *  ├───────────────────────────────────────────────────────────┤
 *  │  Otros planes para vos                                    │
 *  │  ┌─────────┐  ┌─────────┐  ┌─────────┐                    │
 *  │  │  Free   │  │  Pro ✓  │  │ Premium │                    │
 *  │  │  $0     │  │  $19    │  │  $39    │                    │
 *  │  │ [Cambiar]│  │ activo │  │[Mejorar]│                    │
 *  │  └─────────┘  └─────────┘  └─────────┘                    │
 *  └───────────────────────────────────────────────────────────┘
 *
 * Reutiliza el flujo de `/subscribe/:planId` (que llama al checkout
 * de PayPhone) para upgrade y downgrade entre planes pagos. El "downgrade
 * a FREE" usa el endpoint `cancel` que es inmediato y no toca PayPhone.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Loader2, Sparkles, Check, X, AlertCircle, BadgeCheck,
  ShieldCheck, ArrowRight,
} from 'lucide-react';
import { toast }       from 'sonner';
import { PageHeader }  from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { Alert }       from '@/components/ui/Alert';
import { useApi }      from '@/hooks/useApi';
import { useAuth }     from '@/context/AuthContext';
import { plansApi, subscriptionsApi, type PlanDto } from '@/lib/api';

const MODULE_LABELS: Record<string, string> = {
  ONLINE:             'Videollamadas ilimitadas',
  PRESENCIAL:         'Citas presenciales',
  CHAT:               'Chat en vivo con pacientes',
  PAYMENTS_DASHBOARD: 'Panel de pagos online',
  REPORTS:            'Reportes avanzados',
  PRIORITY_SEARCH:    'Prioridad en búsqueda',
  BRANDING:           'Branding personalizado',
  MULTI_LOCATION:     'Multi-sede',
  PRIORITY_SUPPORT:   'Soporte prioritario',
};

export function ManagePlanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const audience = user?.role === 'clinic' ? 'CLINIC' : 'DOCTOR';

  const meQ    = useApi(() => subscriptionsApi.me(), []);
  const plansQ = useApi(() => plansApi.list(audience), []);

  const [cancelling, setCancelling] = useState(false);

  const currentPlan: PlanDto | null = useMemo(() => {
    if (meQ.state.status !== 'ready') return null;
    return meQ.state.data.subscription?.plan ?? meQ.state.data.freePlan ?? null;
  }, [meQ.state]);

  const sub = meQ.state.status === 'ready' ? meQ.state.data.subscription : null;

  const isFree = currentPlan?.code === 'FREE';

  const onCancel = async () => {
    if (!confirm(
      '¿Cancelar tu suscripción? Volverás al plan gratuito y perderás las funciones premium inmediatamente.'
    )) return;
    setCancelling(true);
    try {
      await subscriptionsApi.cancel();
      toast.success('Suscripción cancelada. Estás en plan gratuito.');
      meQ.refetch();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'No se pudo cancelar';
      toast.error(msg);
    } finally {
      setCancelling(false);
    }
  };

  if (meQ.state.status === 'loading' || plansQ.state.status === 'loading') {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }
  if (plansQ.state.status === 'error') {
    return <Alert variant="error">{plansQ.state.error.message}</Alert>;
  }

  const plans = plansQ.state.status === 'ready' ? plansQ.state.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi plan"
        subtitle="Gestiona tu suscripción y desbloqueá funcionalidades"
      />

      {/* Plan actual */}
      {currentPlan && (
        <SectionCard>
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              currentPlan.code === 'PREMIUM'
                ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white'
                : currentPlan.code === 'PRO'
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              {currentPlan.code === 'PREMIUM' ? <Sparkles size={22} /> : <BadgeCheck size={22} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Plan actual</p>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{currentPlan.name}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{currentPlan.description}</p>
              {sub && currentPlan.monthlyPrice > 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  Renueva el <strong>{new Date(sub.expiresAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
                  {sub.autoRenew ? ' · Auto-renovación activa' : ' · Auto-renovación inactiva'}
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-3xl font-bold text-slate-800 dark:text-white">${currentPlan.monthlyPrice.toFixed(2)}</p>
              <p className="text-xs text-slate-400">por mes</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs uppercase tracking-wider text-slate-400 mb-2 font-semibold">Tu plan incluye</p>
            <div className="flex flex-wrap gap-1.5">
              {currentPlan.modules.map((m) => (
                <span key={m} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                  <Check size={11} /> {MODULE_LABELS[m] ?? m}
                </span>
              ))}
            </div>
          </div>

          {!isFree && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={onCancel}
                disabled={cancelling}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-3 py-2 rounded-lg transition disabled:opacity-50"
              >
                {cancelling ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                Cancelar suscripción
              </button>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Volverás al plan gratuito al instante. No hay reembolso del período actual.
              </p>
            </div>
          )}
        </SectionCard>
      )}

      {/* Otros planes */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
          {isFree ? 'Mejorá tu plan' : 'Cambiar de plan'}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Sin permanencia · cambiá cuando quieras · pago seguro con PayPhone
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => {
            const isCurrent  = p.id === currentPlan?.id;
            const isFreeOpt  = p.monthlyPrice === 0;
            const isHighlight = p.code === 'PRO';
            return (
              <div
                key={p.id}
                className={`relative rounded-2xl p-6 border transition ${
                  isCurrent
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
                    : isHighlight
                      ? 'bg-blue-600 text-white border-blue-700 shadow-lg shadow-blue-600/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                }`}
              >
                {isHighlight && !isCurrent && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-amber-900">
                    Más popular
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white">
                    Tu plan
                  </span>
                )}

                <h4 className={`text-sm font-bold uppercase tracking-wider ${
                  isHighlight && !isCurrent ? 'text-blue-100' : 'text-slate-500'
                }`}>{p.code}</h4>
                <p className={`text-xl font-bold mt-1 ${
                  isHighlight && !isCurrent ? 'text-white' : 'text-slate-800 dark:text-white'
                }`}>{p.name}</p>

                <div className="mt-3">
                  <span className={`text-3xl font-bold ${
                    isHighlight && !isCurrent ? 'text-white' : 'text-slate-800 dark:text-white'
                  }`}>${p.monthlyPrice.toFixed(0)}</span>
                  <span className={`text-sm ${
                    isHighlight && !isCurrent ? 'text-blue-100' : 'text-slate-500'
                  }`}>/mes</span>
                </div>

                <ul className={`mt-5 space-y-1.5 text-xs ${
                  isHighlight && !isCurrent ? 'text-blue-50' : 'text-slate-600 dark:text-slate-300'
                }`}>
                  {p.modules.slice(0, 6).map((m) => (
                    <li key={m} className="flex items-start gap-1.5">
                      <Check size={11} className={`mt-0.5 flex-shrink-0 ${
                        isHighlight && !isCurrent ? 'text-blue-200' : 'text-emerald-500'
                      }`} />
                      <span>{MODULE_LABELS[m] ?? m}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5">
                  {isCurrent ? (
                    <span className="block w-full text-center text-xs font-semibold text-emerald-700 dark:text-emerald-300 py-2">
                      Plan activo
                    </span>
                  ) : isFreeOpt ? (
                    <button
                      onClick={onCancel}
                      disabled={cancelling || !sub || (currentPlan?.code === 'FREE')}
                      className="w-full inline-flex items-center justify-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
                    >
                      {cancelling ? <Loader2 size={12} className="animate-spin" /> : null}
                      Bajar a gratuito
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/subscribe/${p.id}`)}
                      className={`w-full inline-flex items-center justify-center gap-1.5 font-semibold text-sm px-4 py-2 rounded-xl transition ${
                        isHighlight
                          ? 'bg-white text-blue-700 hover:bg-blue-50'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {currentPlan && currentPlan.monthlyPrice < p.monthlyPrice ? 'Mejorar' : 'Cambiar'}
                      <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Alert variant="info">
        <ShieldCheck size={14} className="inline mr-1.5" />
        Pagos procesados por PayPhone con cifrado TLS · podés cancelar cuando quieras
      </Alert>
    </div>
  );
}
