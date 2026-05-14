/**
 * PaymentReturnPage — landing page after PayPhone redirects the user back.
 *
 * URL shape:
 *   /payment/return?appt=<id>&id=<payphonePaymentId>&clientTransactionId=<id>&fakeOk=1
 *
 * Where:
 *   - `appt`  → set by US in checkout, identifies the local appointment
 *   - `id`, `clientTransactionId` → set by PayPhone on success/failure
 *   - `fakeOk` → set in stub mode (no PayPhone token configured)
 *   - `cancel`  → set when the user explicitly cancelled on PayPhone
 *
 * Flow:
 *   1. Read the params
 *   2. POST /payment/confirm so the server checks PayPhone's view of the
 *      transaction (idempotent — re-loading this page is safe).
 *   3. Render success / pending / failure UI.
 *
 * The page is rendered inside the patient dashboard so the sidebar nav
 * and top header are available — the patient can navigate away if they
 * want without losing context.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2, XCircle, Loader2, Clock, ArrowRight,
} from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { paymentApi }  from '@/lib/api';

type ReturnState =
  | { phase: 'confirming' }
  | { phase: 'paid'      }
  | { phase: 'pending'   }
  | { phase: 'failed'; reason: string };

export function PaymentReturnPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // El backend usa `appointment.id` o `sub-<userId>-<timestamp>` como
  // `clientTransactionId` cuando arma la sesión PayPhone. PayPhone nos
  // lo devuelve en el callback como `?clientTransactionId=X`.
  const clientTxId         = params.get('clientTransactionId') ?? '';
  const payphonePaymentId  = params.get('id') ?? '';
  const userCancelled      = params.get('cancel') === '1';
  const fakeOk             = params.get('fakeOk') === '1';

  // Si el clientTransactionId empieza con `sub-` es una suscripción
  // — redirigimos a /subscribe/return que sabe manejar ese flow.
  // PayPhone usa una sola URL de respuesta configurada en el panel,
  // por eso TODOS los pagos (citas + suscripciones) caen acá primero.
  useEffect(() => {
    if (clientTxId.startsWith('sub-')) {
      const qs = new URLSearchParams();
      if (payphonePaymentId) qs.set('id', payphonePaymentId);
      qs.set('clientTransactionId', clientTxId);
      if (userCancelled) qs.set('cancel', '1');
      if (fakeOk)        qs.set('fakeOk', '1');
      navigate(`/subscribe/return?${qs.toString()}`, { replace: true });
    }
  }, [clientTxId, payphonePaymentId, userCancelled, fakeOk, navigate]);

  const apptId = params.get('appt') ?? clientTxId;

  const [s, setS] = useState<ReturnState>({ phase: 'confirming' });

  useEffect(() => {
    if (!apptId) {
      setS({ phase: 'failed', reason: 'No se identificó la cita asociada al pago.' });
      return;
    }
    if (userCancelled) {
      setS({ phase: 'failed', reason: 'Cancelaste el pago en PayPhone. Podés volver a intentarlo.' });
      return;
    }
    if (!payphonePaymentId) {
      setS({ phase: 'failed', reason: 'PayPhone no devolvió un identificador de transacción.' });
      return;
    }

    paymentApi.confirm(apptId, { payphoneId: payphonePaymentId, fakeOk })
      .then((res) => {
        if (res.data.status === 'PAID')        setS({ phase: 'paid'    });
        else if (res.data.status === 'PENDING') setS({ phase: 'pending' });
        else                                    setS({ phase: 'failed', reason: 'PayPhone rechazó el pago.' });
      })
      .catch((err) => {
        const msg =
          (err as { response?: { data?: { error?: { message?: string } } } })
            ?.response?.data?.error?.message ?? 'No se pudo confirmar el pago.';
        setS({ phase: 'failed', reason: msg });
      });
  }, [apptId, payphonePaymentId, userCancelled, fakeOk]);

  // Auto-redirect to my appointments on success after 3 seconds.
  useEffect(() => {
    if (s.phase !== 'paid') return;
    const t = window.setTimeout(() => navigate('/patient/appointments'), 3500);
    return () => window.clearTimeout(t);
  }, [s.phase, navigate]);

  return (
    <div className="max-w-xl mx-auto py-12">
      <SectionCard>
        <div className="text-center py-8 px-4">
          {s.phase === 'confirming' && <ConfirmingView />}
          {s.phase === 'paid'       && <PaidView apptId={apptId} />}
          {s.phase === 'pending'    && <PendingView apptId={apptId} />}
          {s.phase === 'failed'     && <FailedView apptId={apptId} reason={s.reason} />}
        </div>
      </SectionCard>
    </div>
  );
}

function ConfirmingView() {
  return (
    <>
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
        <Loader2 className="text-blue-600 dark:text-blue-400 animate-spin" size={28} />
      </div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
        Confirmando tu pago…
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
        Estamos verificando con PayPhone que el cobro se haya realizado correctamente.
        Esto suele tomar unos segundos.
      </p>
    </>
  );
}

function PaidView({ apptId }: { apptId: string }) {
  return (
    <>
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
        <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={32} />
      </div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
        ¡Pago confirmado!
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
        Tu cita está reservada. Te enviamos los detalles a tu correo.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Link
          to={`/patient/appointments/${apptId}`}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl transition"
        >
          Ver detalles de la cita <ArrowRight size={14} />
        </Link>
        <Link
          to="/patient/appointments"
          className="inline-flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-5 py-2.5 rounded-xl transition"
        >
          Mis citas
        </Link>
      </div>
      <p className="text-[11px] text-slate-400 mt-4">Te redirigimos en unos segundos…</p>
    </>
  );
}

function PendingView({ apptId }: { apptId: string }) {
  return (
    <>
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
        <Clock className="text-amber-600 dark:text-amber-400" size={28} />
      </div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
        Pago pendiente de confirmación
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
        El procesador todavía no confirmó la transacción. En cuanto tengamos novedades te
        avisamos por correo. No vuelvas a pagar para evitar duplicados.
      </p>
      <Link
        to={`/patient/appointments/${apptId}`}
        className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl transition"
      >
        Ver cita <ArrowRight size={14} />
      </Link>
    </>
  );
}

function FailedView({ apptId, reason }: { apptId: string; reason: string }) {
  return (
    <>
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center">
        <XCircle className="text-rose-600 dark:text-rose-400" size={32} />
      </div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
        No pudimos completar el pago
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
        {reason}
      </p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        {apptId && (
          <Link
            to={`/payment/checkout/${apptId}`}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl transition"
          >
            Reintentar pago
          </Link>
        )}
        <Link
          to="/patient/appointments"
          className="inline-flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-5 py-2.5 rounded-xl transition"
        >
          Volver a mis citas
        </Link>
      </div>
    </>
  );
}
