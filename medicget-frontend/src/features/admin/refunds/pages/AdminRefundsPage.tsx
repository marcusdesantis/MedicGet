/**
 * Superadmin · Cola de reembolsos.
 *
 * Lista las RefundRequest pendientes (default), procesadas o rechazadas.
 * Para cada PENDING el admin tiene dos acciones:
 *   • Marcar PROCESADO: una vez que ya hizo el reverso real en PayPhone
 *     Business. Acepta `externalReference` (el ID del reverso en PayPhone)
 *     y notas internas. Tras la acción, Payment pasa a REFUNDED y se
 *     notifica al paciente "tu reembolso fue procesado".
 *   • Rechazar: con motivo obligatorio (se envía al paciente por email +
 *     notif). Payment vuelve a PAID.
 *
 * NO procesa el reverso en PayPhone — eso lo hace el operador a mano
 * en el panel PayPhone Business. Esta página solo mantiene el estado
 * contable y la comunicación con el cliente.
 */

import { useState } from 'react';
import { toast }    from 'sonner';
import { Loader2, CheckCircle2, XCircle, Clock, CreditCard, X } from 'lucide-react';
import { PageHeader }    from '@/components/ui/PageHeader';
import { SectionCard }   from '@/components/ui/SectionCard';
import { Alert }         from '@/components/ui/Alert';
import { Avatar }        from '@/components/ui/Avatar';
import { EmptyState }    from '@/components/ui/EmptyState';
import { useApi }        from '@/hooks/useApi';
import {
  refundsApi,
  type RefundRequestDto,
  type RefundRequestStatus,
  type PaginatedData,
} from '@/lib/api';

const STATUS_TABS: Array<{ value: RefundRequestStatus | 'ALL'; label: string; activeClass: string }> = [
  { value: 'PENDING',   label: 'Pendientes',  activeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  { value: 'PROCESSED', label: 'Procesados',  activeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  { value: 'REJECTED',  label: 'Rechazados',  activeClass: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { value: 'ALL',       label: 'Todos',       activeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
];

export function AdminRefundsPage() {
  const [tab, setTab]   = useState<RefundRequestStatus | 'ALL'>('PENDING');
  const [selected, setSelected] = useState<RefundRequestDto | null>(null);
  const [mode, setMode] = useState<'process' | 'reject' | null>(null);

  const { state, refetch } = useApi<PaginatedData<RefundRequestDto>>(
    () => refundsApi.list({ status: tab, pageSize: 50 }),
    [tab],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reembolsos"
        subtitle="Cola de cancelaciones con reembolso aplicable. Procesá el reverso en PayPhone Business y marcalas como PROCESADAS acá."
      />

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              tab === t.value
                ? t.activeClass + ' shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {state.status === 'loading' && (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="animate-spin mr-2" size={18} /> Cargando solicitudes…
        </div>
      )}

      {state.status === 'error' && (
        <Alert variant="error" title="Error al cargar">{state.error.message}</Alert>
      )}

      {state.status === 'ready' && state.data.data.length === 0 && (
        <EmptyState
          icon={CreditCard}
          title="Sin solicitudes"
          description={
            tab === 'PENDING'
              ? 'No hay reembolsos pendientes. ¡Buena señal!'
              : 'Nada para mostrar en esta categoría.'
          }
        />
      )}

      {state.status === 'ready' && state.data.data.length > 0 && (
        <div className="space-y-3">
          {state.data.data.map((r) => (
            <RefundCard
              key={r.id}
              refund={r}
              onProcess={() => { setSelected(r); setMode('process'); }}
              onReject={()  => { setSelected(r); setMode('reject'); }}
            />
          ))}
        </div>
      )}

      {selected && mode && (
        <ActionModal
          refund={selected}
          mode={mode}
          onClose={() => { setSelected(null); setMode(null); }}
          onDone={() => { setSelected(null); setMode(null); refetch(); }}
        />
      )}
    </div>
  );
}

/* ─── Card ─────────────────────────────────────────────────────────────────── */

function initialsOf(first?: string | null, last?: string | null): string {
  return `${(first ?? '').charAt(0)}${(last ?? '').charAt(0)}`.trim() || '?';
}

function RefundCard({
  refund, onProcess, onReject,
}: {
  refund:     RefundRequestDto;
  onProcess:  () => void;
  onReject:   () => void;
}) {
  const appt    = refund.payment?.appointment;
  const pat     = appt?.patient?.user?.profile;
  const doc     = appt?.doctor?.user?.profile;
  const docSpec = appt?.doctor?.specialty;
  const amount  = refund.payment?.amount ?? 0;
  const date    = appt?.date ? new Date(appt.date) : null;

  const statusBadge =
    refund.status === 'PENDING'   ? { color: 'bg-amber-100 text-amber-700',     icon: Clock,        label: 'PENDIENTE' } :
    refund.status === 'PROCESSED' ? { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2, label: 'PROCESADO' } :
                                    { color: 'bg-slate-100 text-slate-700',    icon: XCircle,      label: 'RECHAZADO' };
  const Icon = statusBadge.icon;

  return (
    <SectionCard className="p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${statusBadge.color}`}>
              <Icon size={12} /> {statusBadge.label}
            </span>
            <span className="text-xs text-slate-500">
              Solicitado el {new Date(refund.requestedAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </div>

          <div className="flex items-start gap-3 mb-3">
            <Avatar
              imageUrl={pat?.avatarUrl}
              initials={initialsOf(pat?.firstName, pat?.lastName)}
              size="md"
            />
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">
                {`${pat?.firstName ?? ''} ${pat?.lastName ?? ''}`.trim() || 'Paciente'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Cita con Dr. {`${doc?.firstName ?? ''} ${doc?.lastName ?? ''}`.trim() || '—'} · {docSpec ?? '—'}
              </p>
              {date && (
                <p className="text-xs text-slate-500">
                  {date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} · {appt?.time}
                </p>
              )}
            </div>
          </div>

          {refund.requestReason && (
            <div className="mt-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Motivo del paciente</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">{refund.requestReason}</p>
            </div>
          )}

          {refund.status !== 'PENDING' && refund.processorNotes && (
            <div className={`mt-2 border rounded-lg p-3 ${
              refund.status === 'PROCESSED'
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50  dark:bg-amber-900/20  border-amber-200  dark:border-amber-800'
            }`}>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">
                Nota del admin {refund.processedAt && `· ${new Date(refund.processedAt).toLocaleDateString('es-ES')}`}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-200">{refund.processorNotes}</p>
              {refund.externalReference && (
                <p className="text-xs text-slate-500 mt-2">
                  Ref. PayPhone: <span className="font-mono">{refund.externalReference}</span>
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-3 lg:min-w-[200px]">
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase font-semibold">Monto</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">${amount.toFixed(2)}</p>
          </div>

          {refund.status === 'PENDING' && (
            <div className="flex gap-2 w-full">
              <button
                onClick={onProcess}
                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition"
              >
                <CheckCircle2 size={14} /> Procesado
              </button>
              <button
                onClick={onReject}
                className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 transition"
              >
                <XCircle size={14} /> Rechazar
              </button>
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

/* ─── Action Modal (process / reject) ────────────────────────────────────── */

function ActionModal({
  refund, mode, onClose, onDone,
}: {
  refund:  RefundRequestDto;
  mode:    'process' | 'reject';
  onClose: () => void;
  onDone:  () => void;
}) {
  const [externalRef, setExternalRef] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const minNotesForReject = notes.trim().length >= 5;
  const canSubmit = mode === 'process' || minNotesForReject;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (mode === 'process') {
        await refundsApi.process(refund.id, {
          externalReference: externalRef.trim() || undefined,
          processorNotes:    notes.trim()        || undefined,
        });
        toast.success('Reembolso marcado como procesado. Se notificó al paciente.');
      } else {
        await refundsApi.reject(refund.id, { processorNotes: notes.trim() });
        toast.success('Solicitud rechazada. Se notificó al paciente con el motivo.');
      }
      onDone();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Error al procesar.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode === 'process' ? 'Marcar como procesado' : 'Rechazar solicitud';
  const description = mode === 'process'
    ? 'Confirmá que ya ejecutaste el reverso en PayPhone Business. El paciente recibirá una notificación + email.'
    : 'El motivo se envía al paciente por notificación y email. Sé específico para que pueda entender la decisión.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-lg w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h2>
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {mode === 'process' && (
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                Referencia PayPhone (opcional)
              </label>
              <input
                value={externalRef}
                onChange={(e) => setExternalRef(e.target.value)}
                placeholder="ej: REV-2026-00123"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <p className="text-xs text-slate-500 mt-1">ID del reverso que generaste en el panel PayPhone, para auditoría cruzada.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                Notas internas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="ej: Reverso confirmado vía panel PayPhone, ticket 1234."
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>
        )}

        {mode === 'reject' && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
              Motivo del rechazo <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="ej: La consulta ya fue atendida según el médico. El paciente confirmó asistencia."
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <p className={`text-xs mt-1 ${minNotesForReject ? 'text-emerald-600' : 'text-slate-500'}`}>
              {notes.trim().length}/500 caracteres (mínimo 5).
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === 'process'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {mode === 'process' ? 'Confirmar procesado' : 'Rechazar solicitud'}
          </button>
        </div>
      </div>
    </div>
  );
}
