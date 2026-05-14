/**
 * SubscribePage — checkout flow para planes pagados (PRO / PREMIUM).
 *
 *  /subscribe/:planId          → resumen + widget Cajita de PayPhone
 *  /subscribe/return?...       → handler del retorno de PayPhone
 *
 * Flujo (igual que /payment/checkout para citas):
 *   1. POST /subscriptions/checkout → devuelve la sesión (token, storeId,
 *      amount, ...) que el widget de PayPhone necesita.
 *   2. Cargamos el SDK del CDN + montamos `#pp-button`.
 *   3. El widget hace todo el flow de pago en el navegador.
 *   4. PayPhone redirige a `/subscribe/return?id=...&clientTransactionId=...`.
 *   5. POST /subscriptions/confirm activa la suscripción y manda voucher
 *      por email.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import {
  Loader2, ArrowLeft, CheckCircle2, XCircle, ShieldCheck, ArrowRight,
} from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { Alert }       from '@/components/ui/Alert';
import { useApi }      from '@/hooks/useApi';
import { useAuth }     from '@/context/AuthContext';
import { plansApi, subscriptionsApi, type PlanDto, type PaymentBreakdownDto } from '@/lib/api';

/** Tipos mínimos del SDK global de PayPhone (el mismo que usa PaymentCheckoutPage). */
interface PayphoneSdk {
  new (opts: Record<string, unknown>): { render: (containerId: string) => void };
}
declare global {
  interface Window {
    PPaymentButtonBox?: PayphoneSdk;
  }
}

const PAYPHONE_JS_URL  = 'https://cdn.payphonetodoesposible.com/box/v2.0/payphone-payment-box.js';
const PAYPHONE_CSS_URL = 'https://cdn.payphonetodoesposible.com/box/v2.0/payphone-payment-box.css';
const OVERRIDE_STYLE_ID = 'payphone-overrides';

// Stack de fuentes del sistema (Tailwind default).
const SYSTEM_FONT_STACK =
  `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, ` +
  `"Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, ` +
  `"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`;

// Overrides que neutralizan reglas globales del CSS de PayPhone
// (font-size/font-family/transform/zoom/margin/padding). El widget
// mantiene su look porque usa selectores con clase que ganan por
// specificity sobre nuestro override en elementos.
const PAYPHONE_OVERRIDES_CSS = `
  html {
    font-size: 16px !important;
    font-family: ${SYSTEM_FONT_STACK} !important;
    margin: 0 !important;
    padding: 0 !important;
    transform: none !important;
    zoom: 1 !important;
  }
  body {
    margin: 0 !important;
    padding: 0 !important;
    max-width: none !important;
    min-width: 0 !important;
    width: auto !important;
    transform: none !important;
    zoom: 1 !important;
    line-height: 1.5 !important;
    font-family: ${SYSTEM_FONT_STACK} !important;
    color: inherit;
  }
  #root, #app-root {
    padding: 0 !important;
    margin: 0 !important;
    max-width: none !important;
    transform: none !important;
    zoom: 1 !important;
    font-family: ${SYSTEM_FONT_STACK} !important;
  }
`;

async function loadPayphoneSdk(): Promise<void> {
  if (!document.querySelector(`link[href="${PAYPHONE_CSS_URL}"]`)) {
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = PAYPHONE_CSS_URL;
    document.head.appendChild(link);
  }
  if (!document.getElementById(OVERRIDE_STYLE_ID)) {
    const style = document.createElement('style');
    style.id   = OVERRIDE_STYLE_ID;
    style.textContent = PAYPHONE_OVERRIDES_CSS;
    document.head.appendChild(style);
  }
  if (window.PPaymentButtonBox) return;
  if (document.querySelector(`script[src="${PAYPHONE_JS_URL}"]`)) {
    await new Promise<void>((resolve) => {
      const check = () => (window.PPaymentButtonBox ? resolve() : setTimeout(check, 100));
      check();
    });
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.type = 'module';
    s.src  = PAYPHONE_JS_URL;
    s.onload  = () => {
      const check = () => (window.PPaymentButtonBox ? resolve() : setTimeout(check, 100));
      check();
    };
    s.onerror = () => reject(new Error('No se pudo cargar el SDK de PayPhone'));
    document.head.appendChild(s);
  });
}

export function SubscribePage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const { state } = useApi(() => plansApi.list(), [planId]);
  const plan: PlanDto | undefined =
    state.status === 'ready' ? state.data.find((p) => p.id === planId) : undefined;

  const [widgetReady,    setWidgetReady]    = useState(false);
  const [widgetMounted,  setWidgetMounted]  = useState(false);
  const [stubMode,       setStubMode]       = useState(false);
  const [stubConfirming, setStubConfirming] = useState(false);
  const [freePlanConfirmed, setFreePlanConfirmed] = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [breakdown,      setBreakdown]      = useState<PaymentBreakdownDto | null>(null);
  const pendingSubIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated && state.status === 'ready') {
      navigate(`/login?next=${encodeURIComponent(`/subscribe/${planId}`)}`);
    }
  }, [isAuthenticated, state.status, navigate, planId]);

  // Cuando el plan + el user están listos y NO está montado todavía,
  // pedimos la sesión y montamos el widget.
  useEffect(() => {
    if (!plan || !user || widgetMounted) return;

    const userAudience = user.role === 'clinic' ? 'CLINIC' : 'DOCTOR';
    if (plan.audience !== userAudience) return; // audience mismatch — no monto

    let cancelled = false;
    (async () => {
      try {
        const responseUrl = `${window.location.origin}/subscribe/return`;
        const res = await subscriptionsApi.checkout({
          planId: plan.id,
          responseUrl,
        });
        if (cancelled) return;

        // FREE: el backend no devuelve sesión PayPhone, solo activa
        // la suscripción directo. Marcamos como confirmado.
        if (plan.monthlyPrice === 0) {
          setFreePlanConfirmed(true);
          setWidgetMounted(true);
          return;
        }

        pendingSubIdRef.current = res.data.subscriptionId;
        sessionStorage.setItem('medicget_pending_sub', res.data.subscriptionId);
        if (res.data.breakdown) setBreakdown(res.data.breakdown);

        // Stub mode (sin credenciales PayPhone) — botón directo.
        if (res.data.stubMode) {
          setStubMode(true);
          setWidgetReady(true);
          setWidgetMounted(true);
          return;
        }

        await loadPayphoneSdk();
        if (cancelled || !window.PPaymentButtonBox) return;

        const Ctor = window.PPaymentButtonBox;
        new Ctor({
          token:               res.data.token,
          storeId:             res.data.storeId,
          amount:              res.data.amount,
          amountWithoutTax:    res.data.amountWithoutTax,
          amountWithTax:       res.data.amountWithTax,
          tax:                 res.data.tax,
          service:             res.data.service,
          tip:                 res.data.tip,
          currency:            res.data.currency,
          clientTransactionId: res.data.clientTransactionId,
          reference:           res.data.reference,
          lang:                'es',
          defaultMethod:       'card',
          timeZone:            -5,
        }).render('pp-button');

        setWidgetReady(true);
        setWidgetMounted(true);
      } catch (err: unknown) {
        if (cancelled) return;
        const msg =
          (err as { response?: { data?: { error?: { message?: string } } } })
            ?.response?.data?.error?.message ?? (err as Error).message ?? 'No se pudo iniciar la suscripción';
        setError(msg);
      }
    })();

    return () => { cancelled = true; };
  }, [plan, user, widgetMounted]);

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

  // Stub mode: confirmación directa (sin PayPhone real).
  const handleStubConfirm = async () => {
    if (!pendingSubIdRef.current) return;
    setStubConfirming(true);
    setError(null);
    try {
      await subscriptionsApi.confirm({
        subscriptionId: pendingSubIdRef.current,
        fakeOk:         true,
      });
      sessionStorage.removeItem('medicget_pending_sub');
      navigate('/subscribe/return?fakeOk=1');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'No se pudo confirmar la suscripción (stub).';
      setError(msg);
      setStubConfirming(false);
    }
  };

  // Plan FREE confirmado directo desde checkout → mostramos éxito.
  if (freePlanConfirmed) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
        <SectionCard>
          <div className="text-center py-8 px-4 max-w-md">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="text-emerald-600" size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">¡Plan {plan.name} activado!</h2>
            <p className="text-sm text-slate-500 mb-6">Tu plan gratuito está listo para usar.</p>
            <Link to="/" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl">
              Ir al panel <ArrowRight size={14} />
            </Link>
          </div>
        </SectionCard>
      </div>
    );
  }

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

            {/* Desglose con comisión por uso de plataforma. Aparece solo
                cuando el backend la devolvió (planes pagados, no FREE). */}
            {breakdown && breakdown.platformFee > 0 && (
              <div className="mt-4 pt-4 border-t border-blue-200/60 dark:border-blue-700/40 space-y-1.5 text-sm">
                <div className="flex justify-between text-blue-700/80 dark:text-blue-300/80">
                  <span>Plan {plan.name}</span>
                  <span>${breakdown.baseAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-blue-700/80 dark:text-blue-300/80">
                  <span>Comisión por uso de plataforma ({breakdown.feePct}%)</span>
                  <span>${breakdown.platformFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-blue-200/60 dark:border-blue-700/40 font-bold text-blue-800 dark:text-blue-200">
                  <span>Total a pagar</span>
                  <span>${breakdown.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <h3 className="font-semibold text-slate-800 dark:text-white mt-6 mb-2">Incluye</h3>
          <ul className="space-y-1.5 text-sm">
            {plan.modules.map((m) => (
              <li key={m} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <CheckCircle2 size={14} className="text-emerald-500" /> {moduleLabel(m)}
              </li>
            ))}
          </ul>

          {/* Widget Cajita PayPhone */}
          {!audienceMismatch && (
            <div className="mt-8">
              {!widgetReady && (
                <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                  <Loader2 className="animate-spin" size={18} />
                  <span className="text-sm">Cargando pasarela de pago…</span>
                </div>
              )}

              {stubMode ? (
                <>
                  <Alert variant="info">
                    <strong>Modo desarrollo:</strong> sin credenciales PayPhone. La suscripción se activa al confirmar.
                  </Alert>
                  <button
                    onClick={handleStubConfirm}
                    disabled={stubConfirming}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-4 rounded-xl transition disabled:opacity-50"
                  >
                    {stubConfirming
                      ? <><Loader2 size={16} className="animate-spin" /> Confirmando…</>
                      : <><ShieldCheck size={16} /> Activar plan (modo dev)</>}
                  </button>
                </>
              ) : (
                <div
                  id="pp-button"
                  style={{ display: widgetReady ? 'block' : 'none' }}
                />
              )}
            </div>
          )}

          <p className="mt-4 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck size={12} /> Pago procesado por PayPhone con cifrado TLS
          </p>
        </SectionCard>
      </div>
    </div>
  );
}

/**
 * SubscribeReturnPage — landing tras el redirect de PayPhone.
 */
export function SubscribeReturnPage() {
  const [params] = useSearchParams();
  // El backend usa `subscriptionId` como `clientTransactionId` — viene de
  // vuelta por PayPhone. Si por algún motivo no llega, recuperamos desde
  // sessionStorage.
  const payphoneId = params.get('id') ?? '';
  const cancelled  = params.get('cancel') === '1';
  const fakeOk     = params.get('fakeOk') === '1';

  const [phase, setPhase] = useState<'confirming' | 'ok' | 'fail'>(
    cancelled ? 'fail' : 'confirming',
  );
  const [reason, setReason] = useState<string | null>(
    cancelled ? 'Cancelaste el pago en PayPhone.' : null,
  );

  useEffect(() => {
    if (phase !== 'confirming') return;

    const stashedSubId = sessionStorage.getItem('medicget_pending_sub');

    (async () => {
      try {
        let subscriptionId = stashedSubId;

        if (!subscriptionId) {
          const me = await subscriptionsApi.me();
          const sub = me.data.subscription;
          if (!sub || sub.status !== 'PENDING_PAYMENT') {
            setPhase('ok'); // probablemente ya se confirmó
            return;
          }
          subscriptionId = sub.id;
        }

        const conf = await subscriptionsApi.confirm({
          subscriptionId,
          payphoneId: payphoneId || undefined,
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
  }, [payphoneId, fakeOk, phase]);

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
                Tu plan ya está activo. Te enviamos el comprobante de pago por correo.
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
