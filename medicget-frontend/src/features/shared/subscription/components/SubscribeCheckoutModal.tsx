/**
 * SubscribeCheckoutModal — abre el widget Cajita de PayPhone dentro de un
 * popup modal en lugar de redirigir a una pagina completa. Reusa exactamente
 * la misma logica que SubscribePage:
 *
 *   1. POST /subscriptions/checkout (con responseUrl apuntando a
 *      `/subscribe/return`)
 *   2. Cargamos el SDK de PayPhone desde el CDN
 *   3. Montamos el widget en un div interno `#pp-button-modal`
 *   4. Cuando el usuario completa el pago, PayPhone redirige la pestania
 *      entera a `/subscribe/return` y la SubscribeReturnPage hace el
 *      POST /subscriptions/confirm.
 *
 * Notas:
 *   - El planId que recibimos NO se valida por audience aca; se asume que
 *      el caller (ManagePlanPage) ya filtra por audience del usuario.
 *   - Si el plan es FREE: confirmamos directo y cerramos el modal con
 *      callback `onSuccess`.
 *   - Si el backend devuelve stubMode (sin credenciales PayPhone): mostramos
 *      un boton "Activar plan (modo dev)" que llama a /confirm con fakeOk.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Loader2, X, CheckCircle2, ShieldCheck,
} from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { subscriptionsApi, type PlanDto, type PaymentBreakdownDto } from '@/lib/api';

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

const SYSTEM_FONT_STACK =
  `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, ` +
  `"Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, ` +
  `"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`;

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

export interface SubscribeCheckoutModalProps {
  plan:      PlanDto;
  onClose:   () => void;
  /** Llamado tras confirmar exitosamente (FREE o stub). NO se invoca en flujo
   *  PayPhone real, porque ahi el redirect lleva a `/subscribe/return`. */
  onSuccess?: () => void;
}

export function SubscribeCheckoutModal({
  plan, onClose, onSuccess,
}: SubscribeCheckoutModalProps) {
  const [widgetReady,       setWidgetReady]       = useState(false);
  const [widgetMounted,     setWidgetMounted]     = useState(false);
  const [stubMode,          setStubMode]          = useState(false);
  const [stubConfirming,    setStubConfirming]    = useState(false);
  const [freePlanConfirmed, setFreePlanConfirmed] = useState(false);
  const [error,             setError]             = useState<string | null>(null);
  const [breakdown,         setBreakdown]         = useState<PaymentBreakdownDto | null>(null);
  const pendingSubIdRef = useRef<string | null>(null);

  // Bloquear scroll del body mientras el modal esta abierto.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Inicializar checkout + montar widget.
  useEffect(() => {
    if (widgetMounted) return;
    let cancelled = false;
    (async () => {
      try {
        const responseUrl = `${window.location.origin}/subscribe/return`;
        const res = await subscriptionsApi.checkout({
          planId: plan.id,
          responseUrl,
        });
        if (cancelled) return;

        // FREE — el backend ya activa la suscripcion, solo cerramos.
        if (plan.monthlyPrice === 0) {
          setFreePlanConfirmed(true);
          setWidgetMounted(true);
          return;
        }

        pendingSubIdRef.current = res.data.subscriptionId;
        sessionStorage.setItem('medicget_pending_sub', res.data.subscriptionId);
        if (res.data.breakdown) setBreakdown(res.data.breakdown);

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
        }).render('pp-button-modal');

        setWidgetReady(true);
        setWidgetMounted(true);
      } catch (err: unknown) {
        if (cancelled) return;
        const msg =
          (err as { response?: { data?: { error?: { message?: string } } } })
            ?.response?.data?.error?.message ?? (err as Error).message ?? 'No se pudo iniciar la suscripcion';
        setError(msg);
      }
    })();
    return () => { cancelled = true; };
  }, [plan, widgetMounted]);

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
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'No se pudo confirmar la suscripcion (stub).';
      setError(msg);
      setStubConfirming(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-sm overflow-y-auto p-4 pt-8 sm:pt-16"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Suscripcion</p>
            <h2 className="font-bold text-slate-800 dark:text-white text-lg">
              {plan.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="px-6 py-5 space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          {freePlanConfirmed ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                <CheckCircle2 className="text-emerald-600" size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
                Plan {plan.name} activado
              </h3>
              <p className="text-sm text-slate-500 mb-5">
                Tu plan gratuito ya esta listo para usar.
              </p>
              <button
                onClick={() => { onSuccess?.(); onClose(); }}
                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl"
              >
                Listo
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500 dark:text-slate-400">{plan.description}</p>

              <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-blue-700 dark:text-blue-300">
                    ${plan.monthlyPrice.toFixed(2)}
                  </span>
                  <span className="text-sm text-blue-700/70 dark:text-blue-300/70">/mes</span>
                </div>
                <p className="text-xs text-blue-700/70 dark:text-blue-300/70 mt-1">
                  Pago cada 30 dias. Sin permanencia.
                </p>

                {breakdown && breakdown.platformFee > 0 && (
                  <div className="mt-4 pt-4 border-t border-blue-200/60 dark:border-blue-700/40 space-y-1.5 text-sm">
                    <div className="flex justify-between text-blue-700/80 dark:text-blue-300/80">
                      <span>Plan {plan.name}</span>
                      <span>${breakdown.baseAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-blue-700/80 dark:text-blue-300/80">
                      <span>Comision plataforma ({breakdown.feePct}%)</span>
                      <span>${breakdown.platformFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-blue-200/60 dark:border-blue-700/40 font-bold text-blue-800 dark:text-blue-200">
                      <span>Total</span>
                      <span>${breakdown.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Widget Cajita */}
              <div>
                {!widgetReady && (
                  <div className="flex items-center justify-center py-6 text-slate-400 gap-2">
                    <Loader2 className="animate-spin" size={18} />
                    <span className="text-sm">Cargando pasarela de pago...</span>
                  </div>
                )}

                {stubMode ? (
                  <>
                    <Alert variant="info">
                      <strong>Modo desarrollo:</strong> sin credenciales PayPhone. La suscripcion se activa al confirmar.
                    </Alert>
                    <button
                      onClick={handleStubConfirm}
                      disabled={stubConfirming}
                      className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3.5 rounded-xl transition disabled:opacity-50"
                    >
                      {stubConfirming
                        ? <><Loader2 size={16} className="animate-spin" /> Confirmando...</>
                        : <><ShieldCheck size={16} /> Activar plan (modo dev)</>}
                    </button>
                  </>
                ) : (
                  <div
                    id="pp-button-modal"
                    style={{ display: widgetReady ? 'block' : 'none' }}
                  />
                )}
              </div>

              <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                <ShieldCheck size={12} /> Pago procesado por PayPhone con cifrado TLS
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
