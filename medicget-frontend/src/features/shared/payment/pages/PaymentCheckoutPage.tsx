/**
 * PaymentCheckoutPage — pantalla previa al pago, ahora con el widget
 * oficial "Cajita de Pagos" de PayPhone embebido.
 *
 *  ┌──────────────────────────────────────────────┐
 *  │ ← Volver           Pagar reserva             │
 *  ├──────────────────────────────────────────────┤
 *  │  Dr. Pérez · Cardiología                     │
 *  │  miércoles 15 de mayo · 10:00                │
 *  │                                              │
 *  │  Total a pagar        $50.00                 │
 *  │  [ ⏰ Tu reserva expira en 14:32 ]           │
 *  │                                              │
 *  │  ┌────────────────────────────────────────┐  │
 *  │  │ [ widget oficial PayPhone Cajita ]     │  │
 *  │  └────────────────────────────────────────┘  │
 *  │  [ Cancelar reserva ]                        │
 *  └──────────────────────────────────────────────┘
 *
 *  Flujo:
 *   1. Llamamos al backend `/payment/checkout` que devuelve la sesión
 *      ({ token, storeId, amount, ... }) — el backend NO contacta a
 *      PayPhone aún, solo nos da los datos del comercio.
 *   2. Cargamos el script/CSS del CDN de PayPhone (idempotente).
 *   3. Instanciamos `new PPaymentButtonBox({...}).render('pp-button')`.
 *   4. El widget se hace cargo: muestra el botón, abre el modal de pago,
 *      cobra y redirige a `responseUrl` con `?id=N&clientTransactionId=X`.
 *   5. Esa redirección la captura `PaymentReturnPage`.
 *
 *  Stub mode (sin PAYPHONE_TOKEN): el backend nos manda `stubMode: true`.
 *  Saltamos el widget y mostramos un botón que confirma el pago directo,
 *  útil para probar el resto del flujo end-to-end sin credenciales.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Clock, Stethoscope, Loader2, ShieldCheck,
  AlertCircle, X,
} from 'lucide-react';
import { useApi }      from '@/hooks/useApi';
import { Avatar }      from '@/components/ui/Avatar';
import { Alert }       from '@/components/ui/Alert';
import { SectionCard } from '@/components/ui/SectionCard';
import { appointmentsApi, paymentApi, type AppointmentDto, type PaymentBreakdownDto } from '@/lib/api';

/** Tipos mínimos del SDK global de PayPhone. */
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

/**
 * Overrides que neutralizan las reglas globales del CSS de PayPhone
 * Cajita SIN romper el widget. Estrategia: anclar `html`/`body`/root
 * a valores conocidos para que cualquier regla que PayPhone aplique
 * en esos selectores quede sobreescrita.
 *
 * Causa raíz del "zoom-out": PayPhone aplica reglas tipo
 *   html { font-size: 12px }
 *   body { max-width: ...; transform: scale(...) }
 *   #root { padding: 2rem; max-width: 100vw }
 *
 * Como Tailwind usa rem (1rem = html font-size), si PayPhone cambia
 * el font-size del html, TODO se reescala. Por eso forzamos
 * `font-size: 16px` en html (default del browser que asume Tailwind).
 *
 * No filtramos el CSS del widget (eso rompía sus estilos internos).
 */
/**
 * Stack de fuentes del sistema — mismo que usa Tailwind por default.
 * Lo aplicamos al root con !important para que cualquier
 * `body { font-family: ... }` que PayPhone meta no contamine la app.
 * El widget de PayPhone usa selectores específicos (`.payment-box`,
 * `.ppb-content`, etc.) que ganan por specificity, así que mantienen
 * su propio look.
 */
const SYSTEM_FONT_STACK =
  `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, ` +
  `"Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, ` +
  `"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`;

const PAYPHONE_OVERRIDES_CSS = `
  /* Root del documento — anclamos font-size (Tailwind asume 16px) y
     font-family para que reglas globales de PayPhone no escalen la app
     ni cambien la tipografía. */
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

  /* Root React (en cualquiera de sus nombres) hereda la fuente. */
  #root, #app-root {
    padding: 0 !important;
    margin: 0 !important;
    max-width: none !important;
    transform: none !important;
    zoom: 1 !important;
    font-family: ${SYSTEM_FONT_STACK} !important;
  }
`;

/**
 * Carga el CSS y JS del widget. Idempotente.
 */
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

export function PaymentCheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { state, refetch } = useApi<AppointmentDto>(
    () => appointmentsApi.getById(id!),
    [id],
  );

  const [error,         setError]         = useState<string | null>(null);
  const [widgetReady,   setWidgetReady]   = useState(false);
  const [widgetMounted, setWidgetMounted] = useState(false);
  const [stubMode,      setStubMode]      = useState(false);
  const [stubConfirming, setStubConfirming] = useState(false);
  // `sessionExpiresAt` proviene de la respuesta DEL checkout — siempre
  // fresco. Usar `state.data.payment.expiresAt` da problemas porque ese
  // valor es del intento anterior y puede estar vencido aunque el nuevo
  // checkout sí haya creado una sesión válida.
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null);
  const [breakdown,        setBreakdown]        = useState<PaymentBreakdownDto | null>(null);
  const sessionRef = useRef<{ clientTransactionId: string; responseUrl: string } | null>(null);

  // ─── Countdown derived from session expiresAt ───────────────────────
  const expiresAt = sessionExpiresAt;
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setSecondsLeft(Math.max(0, Math.floor(ms / 1000)));
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [expiresAt]);

  // ─── Montaje del widget ──────────────────────────────────────────────
  // Carga el script de PayPhone, llama al backend para la sesión, y
  // monta el widget cuando todo está listo. Se ejecuta una sola vez por
  // appointmentId (si el componente se desmonta y vuelve, el script
  // sigue en el DOM pero el contenedor se re-llena).
  useEffect(() => {
    if (!id || state.status !== 'ready' || widgetMounted) return;
    if (state.data.payment?.status === 'PAID')   return;
    if (state.data.status === 'CANCELLED')       return;

    let cancelled = false;
    (async () => {
      try {
        const responseUrl = `${window.location.origin}/payment/return?appt=${id}`;
        const res = await paymentApi.checkout(id, { responseUrl });
        if (cancelled) return;
        sessionRef.current = {
          clientTransactionId: res.data.clientTransactionId,
          responseUrl,
        };
        setSessionExpiresAt(res.data.expiresAt);
        if (res.data.breakdown) setBreakdown(res.data.breakdown);

        // Stub mode — el backend nos avisa que no hay credenciales.
        // Mostramos un botón directo para confirmar la cita.
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
            ?.response?.data?.error?.message ?? (err as Error).message ?? 'No se pudo iniciar el pago';
        setError(msg);
      }
    })();

    return () => { cancelled = true; };
  }, [id, state.status, widgetMounted, state]);

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

  const a = state.data;
  const profile = a.doctor.user.profile;
  const docName = `Dr. ${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim();
  const docInitials = ((profile?.firstName?.[0] ?? '') + (profile?.lastName?.[0] ?? '')).toUpperCase() || '··';
  const dateStr = new Date(a.date).toLocaleDateString('es-ES', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  const expired     = secondsLeft <= 0 && !!expiresAt;
  const alreadyPaid = a.payment?.status === 'PAID';
  const cancelled   = a.status === 'CANCELLED';

  // Stub: el dev confirma manualmente sin pasar por PayPhone.
  const handleStubConfirm = async () => {
    if (!id) return;
    setStubConfirming(true);
    setError(null);
    try {
      await paymentApi.confirm(id, { fakeOk: true });
      navigate(`/patient/appointments/${id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'No se pudo confirmar el pago (stub).';
      setError(msg);
      setStubConfirming(false);
    }
  };

  const handleCancelReservation = async () => {
    if (!id) return;
    if (!confirm('¿Cancelar la reserva? El horario quedará liberado.')) return;
    try {
      await appointmentsApi.update(id, { status: 'CANCELLED' });
      navigate('/patient/appointments');
    } catch {
      /* errors are toasted by the axios interceptor */
    }
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Pagar reserva</h1>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {alreadyPaid && (
        <Alert variant="success">
          <ShieldCheck size={14} className="inline mr-1.5" />
          Esta cita ya está pagada. <button onClick={() => navigate('/patient/appointments')} className="underline ml-1">Ver mis citas</button>
        </Alert>
      )}

      {cancelled && (
        <Alert variant="error">
          La cita fue cancelada. No se puede pagar.
        </Alert>
      )}

      {expired && !alreadyPaid && !cancelled && (
        <Alert variant="error">
          <AlertCircle size={14} className="inline mr-1.5" />
          La ventana de pago expiró. El horario fue liberado — reservalo de nuevo.
        </Alert>
      )}

      {/* Doctor + cita */}
      <SectionCard>
        <div className="flex items-center gap-4">
          <Avatar initials={docInitials} size="lg" shape="rounded" variant="blue" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-lg text-slate-800 dark:text-white">{docName}</p>
            <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1.5 mt-0.5">
              <Stethoscope size={13} /> {a.doctor.specialty}
            </p>
            <div className="flex items-center gap-3 mt-2 text-sm text-slate-500 dark:text-slate-400 flex-wrap">
              <span className="flex items-center gap-1.5"><Calendar size={13} /> <span className="capitalize">{dateStr}</span></span>
              <span className="flex items-center gap-1.5"><Clock size={13} /> {a.time}</span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Resumen del pago */}
      <SectionCard>
        <h2 className="font-semibold text-slate-800 dark:text-white mb-4">Resumen</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span>Honorarios profesionales</span>
            <span>${(breakdown?.baseAmount ?? a.price).toFixed(2)}</span>
          </div>
          {breakdown && breakdown.platformFee > 0 && (
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
              <span>Comisión por uso de plataforma ({breakdown.feePct}%)</span>
              <span>${breakdown.platformFee.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 flex items-center justify-between font-bold text-base">
            <span className="text-slate-800 dark:text-white">Total a pagar</span>
            <span className="text-slate-800 dark:text-white">
              ${(breakdown?.totalAmount ?? a.price).toFixed(2)}
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4">
          El pago se procesa de forma segura a través de PayPhone. La comisión por uso
          de plataforma se suma al precio del servicio y la retiene MedicGet.
        </p>
      </SectionCard>

      {/* Countdown */}
      {!alreadyPaid && !cancelled && expiresAt && !expired && (
        <SectionCard>
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800 dark:text-white">
                Tu reserva expira en {formatCountdown(secondsLeft)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Si no completás el pago a tiempo, el horario quedará disponible para otros pacientes.
              </p>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Widget oficial PayPhone — escondido. Nuestro botón abre el modal */}
      {!alreadyPaid && !cancelled && !expired && (
        <SectionCard>
          {!widgetReady && (
            <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
              <Loader2 className="animate-spin" size={18} />
              <span className="text-sm">Cargando pasarela de pago…</span>
            </div>
          )}

          {stubMode ? (
            <div className="space-y-3">
              <Alert variant="info">
                <strong>Modo desarrollo:</strong> el sistema no tiene credenciales de PayPhone configuradas.
                Al continuar, la cita se aprobará automáticamente sin cobro real.
              </Alert>
              <button
                onClick={handleStubConfirm}
                disabled={stubConfirming}
                className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-4 rounded-xl transition disabled:opacity-50"
              >
                {stubConfirming
                  ? <><Loader2 size={16} className="animate-spin" /> Confirmando…</>
                  : <><ShieldCheck size={16} /> Confirmar pago (modo dev)</>}
              </button>
            </div>
          ) : (
            <>
              {/* Widget oficial PayPhone — modo "Cajita con DOM". El SDK
                  renderiza el formulario de pago COMPLETO embebido dentro
                  de `#pp-button` (no un botón que abra modal), así que lo
                  dejamos visible para que el paciente lo use directamente.
                  El SDK toma el control del UI y de la transacción. */}
              {!widgetReady && (
                <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                  <Loader2 className="animate-spin" size={18} />
                  <span className="text-sm">Cargando pasarela de pago…</span>
                </div>
              )}
              <div
                id="pp-button"
                className="payphone-widget-wrapper"
                style={{ display: widgetReady ? 'block' : 'none' }}
              />
              <p className="text-xs text-slate-400 text-center mt-3">
                Pago procesado por PayPhone — completa los datos en el formulario para finalizar.
              </p>
            </>
          )}
        </SectionCard>
      )}

      {/* Cancelar reserva */}
      {!alreadyPaid && !cancelled && !expired && (
        <div className="flex justify-center">
          <button
            onClick={handleCancelReservation}
            className="inline-flex items-center justify-center gap-2 text-sm text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 font-medium px-5 py-2.5 rounded-xl transition"
          >
            <X size={15} /> Cancelar reserva
          </button>
        </div>
      )}

      <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
        <ShieldCheck size={12} /> Pago procesado con cifrado TLS · No almacenamos datos de tu tarjeta
      </p>
    </div>
  );
}

function formatCountdown(s: number): string {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss.toString().padStart(2, '0')}`;
}
