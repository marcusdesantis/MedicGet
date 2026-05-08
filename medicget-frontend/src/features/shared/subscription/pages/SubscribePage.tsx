/**
 * SubscribePage — checkout flow for paid plans (PRO / PREMIUM).
 *
 *  /subscribe/:planId          → resumen + botón "Suscribirme con PayPhone"
 *  /subscribe/return?...       → handler del retorno de PayPhone
 *
 * El flujo es análogo al de pago de citas:
 *   1. POST /subscriptions/checkout devuelve { redirectUrl, subscriptionId }
 *   2. window.location.assign(redirectUrl) → PayPhone hosted checkout
 *   3. PayPhone redirige a /subscribe/return?id=...&clientTransactionId=...
 *   4. POST /subscriptions/confirm flippea la suscripción a ACTIVE
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import {
  Loader2, ArrowLeft, CheckCircle2, XCircle, ShieldCheck, CreditCard, ArrowRight,
} from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { Alert }       from '@/components/ui/Alert';
import { useApi }      from '@/hooks/useApi';
import { useAuth }     from '@/context/AuthContext';
import { plansApi, subscriptionsApi, type PlanDto } from '@/lib/api';

export function SubscribePage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Find the plan from the public list. We can't query a single plan
  // because there's no /plans/:id public endpoint; the cost of pulling
  // all plans is trivial.
  const { state } = useApi(() => plansApi.list(), [planId]);
  const plan: PlanDto | undefined =
    state.status === 'ready' ? state.data.find((p) => p.id === planId) : undefined;

  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if anonymous; once they come back here, we'll
  // continue.
  useEffect(() => {
    if (!isAuthenticated && state.status === 'ready') {
      navigate(`/login?next=${encodeURIComponent(`/subscribe/${planId}`)}`);
    }
  }, [isAuthenticated, state.status, navigate, planId]);

  if (state.status === 'loading' || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  if (!user) return null;

  const userAudience = user.role === 'clinic' ? 'CLINIC' : 'DOCTOR';
  const audienceMismatch = plan.audience !== userAudience;

  const handleSubscribe = async () => {
    if (!plan) return;
    setRedirecting(true);
    setError(null);
    try {
      const responseUrl = `${window.location.origin}/subscribe/return`;
      const cancellationUrl = `${responseUrl}?cancel=1`;
      const res = await subscriptionsApi.checkout({ planId: plan.id, responseUrl, cancellationUrl });
      // Guardamos el subscriptionId local en sessionStorage para que el
      // return handler confirme exactamente esa suscripción. Si no, /me
      // podría devolvernos la suscripción ACTIVE vieja (FREE) y nunca
      // confirmaríamos la nueva PENDING_PAYMENT.
      sessionStorage.setItem('medicget_pending_sub', res.data.subscriptionId);
      window.location.assign(res.data.redirectUrl);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'No se pudo iniciar la suscripción';
      setError(msg);
      setRedirecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={14} /> Volver
        </button>

        {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}

        {audienceMismatch && (
          <div className="mb-4">
            <Alert variant="error">
              Este plan es para <strong>{plan.audience === 'CLINIC' ? 'clínicas' : 'médicos'}</strong> y tu cuenta es <strong>{userAudience === 'CLINIC' ? 'clínica' : 'médico'}</strong>. Elegí un plan compatible.
            </Alert>
          </div>
        )}

        <SectionCard>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Suscribirse a {plan.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{plan.description}</p>

          <div className="mt-6 p-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-blue-700 dark:text-blue-300">${plan.monthlyPrice.toFixed(2)}</span>
              <span className="text-sm text-blue-700/70 dark:text-blue-300/70">/mes</span>
            </div>
            <p className="text-xs text-blue-700/70 dark:text-blue-300/70 mt-1">
              Pago cada 30 días. Sin permanencia — podés cancelar cuando quieras.
            </p>
          </div>

          <h3 className="font-semibold text-slate-800 dark:text-white mt-6 mb-2">Incluye</h3>
          <ul className="space-y-1.5 text-sm">
            {plan.modules.map((m) => (
              <li key={m} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <CheckCircle2 size={14} className="text-emerald-500" /> {moduleLabel(m)}
              </li>
            ))}
          </ul>

          <button
            onClick={handleSubscribe}
            disabled={redirecting || audienceMismatch}
            className="mt-8 w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-4 rounded-xl text-base transition shadow-md disabled:opacity-50"
          >
            {redirecting ? (
              <><Loader2 size={18} className="animate-spin" /> Redirigiendo…</>
            ) : (
              <><CreditCard size={18} /> Pagar ${plan.monthlyPrice.toFixed(2)} y activar</>
            )}
          </button>

          <p className="mt-4 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck size={12} /> Pago procesado por PayPhone con cifrado TLS
          </p>
        </SectionCard>
      </div>
    </div>
  );
}

/**
 * SubscribeReturnPage — landing tras el redirect de PayPhone para la
 * suscripción. Espeja a PaymentReturnPage pero llama al endpoint
 * /subscriptions/confirm.
 */
export function SubscribeReturnPage() {
  const [params] = useSearchParams();
  const id = params.get('id') ?? '';
  const cancelled = params.get('cancel') === '1';
  const fakeOk    = params.get('fakeOk') === '1';
  const freeOk    = params.get('freeOk') === '1';

  const [phase, setPhase] = useState<'confirming' | 'ok' | 'fail'>(freeOk || cancelled ? (cancelled ? 'fail' : 'ok') : 'confirming');
  const [reason, setReason] = useState<string | null>(cancelled ? 'Cancelaste el pago en PayPhone.' : null);

  useEffect(() => {
    if (phase !== 'confirming') return;
    if (!id) {
      setPhase('fail');
      setReason('No se identificó la transacción.');
      return;
    }
    // El subscriptionId local fue guardado por SubscribePage en
    // sessionStorage justo antes de redirigir a PayPhone — eso nos da
    // la suscripción PENDING_PAYMENT exacta a confirmar, sin depender
    // de heurísticas sobre /me (que para usuarios con FREE preexistente
    // devuelve la FREE en vez de la nueva pendiente).
    const stashedSubId = sessionStorage.getItem('medicget_pending_sub');

    (async () => {
      try {
        let subscriptionId = stashedSubId;

        // Fallback: si por alguna razón no quedó stasheada (otra pestaña,
        // sessionStorage limpiado), buscamos por /me la pendiente.
        if (!subscriptionId) {
          const me = await subscriptionsApi.me();
          const sub = me.data.subscription;
          if (!sub || sub.status !== 'PENDING_PAYMENT') {
            // Probablemente ya se confirmó en otra pestaña — tratamos como éxito.
            setPhase('ok');
            return;
          }
          subscriptionId = sub.id;
        }

        const conf = await subscriptionsApi.confirm({
          subscriptionId,
          payphonePaymentId: id,
          fakeOk,
        });
        sessionStorage.removeItem('medicget_pending_sub');
        if (conf.data.status === 'ACTIVE') setPhase('ok');
        else                                { setPhase('fail'); setReason('PayPhone rechazó el cobro.'); }
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo confirmar la suscripción.';
        setPhase('fail');
        setReason(msg);
      }
    })();
  }, [id, fakeOk, phase]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
      <SectionCard>
        <div className="text-center py-8 px-4 max-w-md">
          {phase === 'confirming' && (
            <>
              <Loader2 size={32} className="text-blue-600 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Activando tu suscripción…</h2>
              <p className="text-sm text-slate-500">Estamos confirmando el pago con PayPhone.</p>
            </>
          )}
          {phase === 'ok' && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                <CheckCircle2 className="text-emerald-600" size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">¡Suscripción activada!</h2>
              <p className="text-sm text-slate-500 mb-6">
                Tu plan ya está activo. Disfrutá las nuevas funciones desde tu panel.
              </p>
              <Link to="/" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl">
                Ir al panel <ArrowRight size={14} />
              </Link>
            </>
          )}
          {phase === 'fail' && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center mb-4">
                <XCircle className="text-rose-600" size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No pudimos activar la suscripción</h2>
              <p className="text-sm text-slate-500 mb-6">{reason}</p>
              <Link to="/" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl">
                Volver al inicio
              </Link>
            </>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function moduleLabel(code: string): string {
  const m: Record<string, string> = {
    ONLINE:             'Videollamadas ilimitadas',
    PRESENCIAL:         'Citas presenciales',
    CHAT:               'Chat en vivo con pacientes',
    REPORTS:            'Reportes avanzados',
    PRIORITY_SEARCH:    'Prioridad en los resultados de búsqueda',
    BRANDING:           'Branding personalizado',
    PAYMENTS_DASHBOARD: 'Panel completo de pagos',
    MULTI_LOCATION:     'Multi-sede',
    PRIORITY_SUPPORT:   'Soporte prioritario',
  };
  return m[code] ?? code;
}
