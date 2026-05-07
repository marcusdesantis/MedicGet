/**
 * PlanBadge — widget compacto que muestra el plan actual del usuario y
 * un CTA "Mejorar" cuando está en FREE. Pensado para los dashboards
 * de doctor y clínica como header secundario.
 */

import { Link } from 'react-router-dom';
import { BadgeCheck, Sparkles, ArrowRight } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { subscriptionsApi } from '@/lib/api';

interface PlanBadgeProps {
  /** Path al que va el botón "Gestionar plan". /doctor/plan o /clinic/plan. */
  managePath: string;
}

export function PlanBadge({ managePath }: PlanBadgeProps) {
  const { state } = useApi(() => subscriptionsApi.me(), []);

  if (state.status !== 'ready') return null;

  const sub  = state.data.subscription;
  const plan = sub?.plan ?? state.data.freePlan;
  if (!plan) return null;

  const isFree    = plan.code === 'FREE';
  const isPremium = plan.code === 'PREMIUM';

  return (
    <Link
      to={managePath}
      className={`group inline-flex items-center gap-3 rounded-2xl border px-4 py-3 transition hover:shadow-md ${
        isPremium
          ? 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-900'
          : isFree
            ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
            : 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-900'
      }`}
    >
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isPremium ? 'bg-amber-500 text-white' : isFree ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : 'bg-blue-600 text-white'
      }`}>
        {isPremium ? <Sparkles size={18} /> : <BadgeCheck size={18} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Plan actual</p>
        <p className={`font-bold text-sm truncate ${
          isPremium ? 'text-amber-800 dark:text-amber-200' : 'text-slate-800 dark:text-white'
        }`}>{plan.name}</p>
        {sub && plan.monthlyPrice > 0 && (
          <p className="text-[11px] text-slate-500">
            Vence el {new Date(sub.expiresAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
          </p>
        )}
        {isFree && (
          <p className="text-[11px] text-slate-500">Mejorá para desbloquear funciones</p>
        )}
      </div>
      <span className="text-xs font-semibold text-blue-600 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
        {isFree ? 'Mejorar' : 'Gestionar'} <ArrowRight size={11} />
      </span>
    </Link>
  );
}
