/**
 * PaymentCheckoutPage — pre-redirect screen for the patient.
 *
 *  ┌──────────────────────────────────────────────┐
 *  │ ← Volver           Resumen del pago          │
 *  ├──────────────────────────────────────────────┤
 *  │  Dr. Pérez · Cardiología                     │
 *  │  miércoles 15 de mayo · 10:00                │
 *  │                                              │
 *  │  Subtotal             $50.00                 │
 *  │  Comisión plataforma  $5.00 (10%)            │
 *  │  ───────────────────────────                 │
 *  │  Total a pagar        $50.00                 │
 *  │                                              │
 *  │  [ ⏰ Tu reserva expira en 14:32 ]           │
 *  │                                              │
 *  │  [ Pagar con PayPhone — $50.00 ]             │
 *  │  [ Cancelar reserva ]                        │
 *  └──────────────────────────────────────────────┘
 *
 *  After clicking "Pagar con PayPhone", we hit `/payment/checkout` which
 *  registers the sale with PayPhone and returns a redirect URL — we then
 *  `window.location.assign` to it. PayPhone hosts the actual card form;
 *  on completion they redirect back to `/payment/return` (handled by the
 *  PaymentReturnPage component).
 *
 *  In stub mode (no PAYPHONE_TOKEN configured) the redirect URL points
 *  directly at our own /payment/return with `fakeOk=1`, so the dev flow
 *  works end-to-end without a real merchant account.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Clock, Stethoscope, Loader2, ShieldCheck,
  AlertCircle, CreditCard, X,
} from 'lucide-react';
import { useApi }      from '@/hooks/useApi';
import { Avatar }      from '@/components/ui/Avatar';
import { Alert }       from '@/components/ui/Alert';
import { SectionCard } from '@/components/ui/SectionCard';
import { appointmentsApi, paymentApi, type AppointmentDto } from '@/lib/api';

export function PaymentCheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { state, refetch } = useApi<AppointmentDto>(
    () => appointmentsApi.getById(id!),
    [id],
  );

  const [redirecting, setRedirecting] = useState(false);
  const [error,        setError]      = useState<string | null>(null);

  // ─── Countdown derived from Payment.expiresAt ────────────────────────
  const expiresAt = useMemo(
    () => state.status === 'ready' ? state.data.payment?.expiresAt ?? null : null,
    [state],
  );
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

  const expired = secondsLeft <= 0 && !!expiresAt;
  const alreadyPaid = a.payment?.status === 'PAID';
  const cancelled   = a.status === 'CANCELLED';

  const handlePay = async () => {
    if (!id) return;
    setRedirecting(true);
    setError(null);
    try {
      // The responseUrl tells PayPhone where to redirect AFTER payment.
      // We use the full origin so it works in dev (5173) and production.
      const responseUrl     = `${window.location.origin}/payment/return?appt=${id}`;
      const cancellationUrl = `${window.location.origin}/payment/return?appt=${id}&cancel=1`;
      const res = await paymentApi.checkout(id, { responseUrl, cancellationUrl });
      window.location.assign(res.data.redirectUrl);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo iniciar el pago';
      setError(msg);
      setRedirecting(false);
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
            <span>${a.price.toFixed(2)}</span>
          </div>
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 flex items-center justify-between font-bold text-base">
            <span className="text-slate-800 dark:text-white">Total a pagar</span>
            <span className="text-slate-800 dark:text-white">${a.price.toFixed(2)}</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4">
          El pago se procesa de forma segura a través de PayPhone. MedicGet retiene una
          comisión de servicio sobre el monto cobrado al médico.
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

      {/* Acciones */}
      {!alreadyPaid && !cancelled && !expired && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handlePay}
            disabled={redirecting}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-4 rounded-xl text-base transition shadow-md disabled:opacity-50"
          >
            {redirecting ? (
              <><Loader2 size={18} className="animate-spin" /> Redirigiendo a PayPhone…</>
            ) : (
              <><CreditCard size={18} /> Pagar ${a.price.toFixed(2)} con PayPhone</>
            )}
          </button>
          <button
            onClick={handleCancelReservation}
            disabled={redirecting}
            className="inline-flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 font-medium px-5 py-3 rounded-xl transition"
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
