/**
 * Superadmin · Verificación de licencias médicas.
 *
 * Lista de médicos por estado:
 *   • PENDING_REVIEW (default) — médicos que subieron documento y esperan.
 *   • VERIFIED                 — ya aprobados.
 *   • REJECTED                 — rechazados; pueden subir un doc corregido.
 *   • NOT_SUBMITTED            — registrados pero todavía sin subir nada.
 *
 * Al abrir el detalle (botón "Ver documento") se descarga el documento
 * vía `doctorsApi.getLicense(id)` — no viene en el list por peso.
 * Aceptamos JPG / PNG / WebP (preview con <img>) y PDF (preview con
 * <iframe>).
 *
 * Acciones:
 *   • Aprobar — el médico pasa a VERIFIED y aparece en búsqueda pública
 *     + puede recibir bookings.
 *   • Rechazar — motivo obligatorio que se envía al médico por email +
 *     notif para que pueda corregir y reenviar.
 */

import { useEffect, useState } from 'react';
import { toast }    from 'sonner';
import {
  Loader2, ShieldCheck, ShieldAlert, ShieldX, ShieldQuestion,
  FileText, Eye, X, CheckCircle2, XCircle, Inbox,
} from 'lucide-react';
import { PageHeader }    from '@/components/ui/PageHeader';
import { SectionCard }   from '@/components/ui/SectionCard';
import { PolicyPanel }   from '@/components/ui/PolicyPanel';
import { Alert }         from '@/components/ui/Alert';
import { Avatar }        from '@/components/ui/Avatar';
import { EmptyState }    from '@/components/ui/EmptyState';
import { useApi }        from '@/hooks/useApi';
import {
  verificationsApi,
  doctorsApi,
  type VerificationDoctorDto,
  type VerificationStatus,
  type PaginatedData,
} from '@/lib/api';

const STATUS_TABS: Array<{ value: VerificationStatus | 'ALL'; label: string; activeClass: string; icon: typeof ShieldQuestion }> = [
  { value: 'PENDING_REVIEW', label: 'Pendientes',  activeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',   icon: ShieldQuestion },
  { value: 'VERIFIED',       label: 'Verificados', activeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', icon: ShieldCheck },
  { value: 'REJECTED',       label: 'Rechazados',  activeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',         icon: ShieldX },
  { value: 'NOT_SUBMITTED',  label: 'Sin enviar',  activeClass: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',       icon: ShieldAlert },
];

export function AdminVerificationsPage() {
  const [tab, setTab] = useState<VerificationStatus | 'ALL'>('PENDING_REVIEW');
  const [selected, setSelected] = useState<VerificationDoctorDto | null>(null);

  const { state, refetch } = useApi<PaginatedData<VerificationDoctorDto>>(
    () => verificationsApi.list({ status: tab, pageSize: 50 }),
    [tab],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verificación de licencias"
        subtitle="Revisá el documento de cada médico y aprobalo o rechazalo. Solo los médicos con licencia verificada aparecen en la búsqueda y reciben bookings."
      />

      <PolicyPanel
        title="Guía de aprobación — qué revisar antes de aprobar"
        icon={ShieldCheck}
        tone="blue"
        defaultOpen={false}
        steps={[
          <>Abrí <strong>"Ver documento"</strong> y confirmá que la imagen/PDF sea legible y corresponda a un título o credencial de colegiatura real.</>,
          <>Verificá que el <strong>nombre del documento coincida</strong> con el nombre del médico en su perfil.</>,
          <>Chequeá que el <strong>número de licencia</strong> y la <strong>autoridad emisora</strong> declarados sean coherentes con el documento.</>,
          <>Si todo está en orden → <strong>Aprobar</strong>. El médico pasa a aparecer en búsqueda y puede recibir citas de inmediato.</>,
          <>Si hay algún problema (foto borrosa, datos que no coinciden, documento inválido) → <strong>Rechazar con un motivo claro</strong>. El médico lo recibe por email y puede reenviar uno corregido.</>,
        ]}
      >
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Recordá: aprobar una licencia habilita al médico a recibir pacientes reales. Ante la duda, rechazá pidiendo más información — es reversible y el médico puede volver a enviar.
        </p>
      </PolicyPanel>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                tab === t.value
                  ? t.activeClass + ' shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {state.status === 'loading' && (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="animate-spin mr-2" size={18} /> Cargando médicos…
        </div>
      )}

      {state.status === 'error' && (
        <Alert variant="error">{state.error.message}</Alert>
      )}

      {state.status === 'ready' && state.data.data.length === 0 && (
        <EmptyState
          icon={Inbox}
          title="Sin resultados"
          description={
            tab === 'PENDING_REVIEW'
              ? 'No hay licencias pendientes de revisión.'
              : 'No hay médicos en esta categoría.'
          }
        />
      )}

      {state.status === 'ready' && state.data.data.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.data.data.map((d) => (
            <DoctorCard
              key={d.id}
              doctor={d}
              onOpen={() => setSelected(d)}
            />
          ))}
        </div>
      )}

      {selected && (
        <DocumentModal
          doctor={selected}
          onClose={() => setSelected(null)}
          onDone={() => { setSelected(null); refetch(); }}
        />
      )}
    </div>
  );
}

/* ─── Card ─────────────────────────────────────────────────────────────── */

function initialsOf(first?: string | null, last?: string | null): string {
  return `${(first ?? '').charAt(0)}${(last ?? '').charAt(0)}`.trim() || '?';
}

function DoctorCard({
  doctor, onOpen,
}: {
  doctor:  VerificationDoctorDto;
  onOpen:  () => void;
}) {
  const fullName = `${doctor.user.profile.firstName ?? ''} ${doctor.user.profile.lastName ?? ''}`.trim() || 'Médico';
  const hasDoc   = doctor.licenseDocumentUrl === '__present__';
  const uploaded = doctor.licenseDocumentUploadedAt
    ? new Date(doctor.licenseDocumentUploadedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  const statusBadge = (() => {
    switch (doctor.licenseVerificationStatus) {
      case 'VERIFIED':       return { color: 'bg-emerald-100 text-emerald-700', label: 'Verificado' };
      case 'PENDING_REVIEW': return { color: 'bg-amber-100 text-amber-700',     label: 'Pendiente' };
      case 'REJECTED':       return { color: 'bg-rose-100 text-rose-700',       label: 'Rechazado' };
      default:               return { color: 'bg-slate-200 text-slate-700',     label: 'Sin enviar' };
    }
  })();

  return (
    <SectionCard className="p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Avatar
          imageUrl={doctor.user.profile.avatarUrl}
          initials={initialsOf(doctor.user.profile.firstName, doctor.user.profile.lastName)}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">Dr. {fullName}</p>
          <p className="text-xs text-slate-500 truncate">{doctor.specialty}</p>
          <p className="text-xs text-slate-400 truncate mt-0.5">{doctor.user.email}</p>
        </div>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500">Estado</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold ${statusBadge.color}`}>
            {statusBadge.label}
          </span>
        </div>
        {doctor.licenseNumber && (
          <div className="flex justify-between">
            <span className="text-slate-500">N° licencia</span>
            <span className="font-mono text-slate-700 dark:text-slate-200">{doctor.licenseNumber}</span>
          </div>
        )}
        {doctor.licenseAuthority && (
          <div className="flex justify-between">
            <span className="text-slate-500">Autoridad</span>
            <span className="text-slate-700 dark:text-slate-200 truncate ml-2">{doctor.licenseAuthority}</span>
          </div>
        )}
        {uploaded && (
          <div className="flex justify-between">
            <span className="text-slate-500">Subido el</span>
            <span className="text-slate-700 dark:text-slate-200">{uploaded}</span>
          </div>
        )}
      </div>

      {doctor.licenseRejectionReason && doctor.licenseVerificationStatus === 'REJECTED' && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-2 text-xs">
          <p className="font-semibold text-rose-700 dark:text-rose-300 mb-0.5">Motivo del rechazo</p>
          <p className="text-rose-700 dark:text-rose-200">{doctor.licenseRejectionReason}</p>
        </div>
      )}

      <button
        onClick={onOpen}
        disabled={!hasDoc}
        className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {hasDoc ? <><Eye size={14} /> Ver documento</> : <><FileText size={14} /> Sin documento</>}
      </button>
    </SectionCard>
  );
}

/* ─── Modal con preview del documento + acciones ─────────────────────── */

function DocumentModal({
  doctor, onClose, onDone,
}: {
  doctor:  VerificationDoctorDto;
  onClose: () => void;
  onDone:  () => void;
}) {
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [docMime, setDocMime] = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [errorDoc, setErrorDoc] = useState<string | null>(null);

  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingDoc(true);
    setErrorDoc(null);
    doctorsApi
      .getLicense(doctor.id)
      .then((res) => {
        if (cancelled) return;
        setDocUrl(res.data.url);
        setDocMime(res.data.mime);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo descargar el documento.';
        setErrorDoc(msg);
      })
      .finally(() => { if (!cancelled) setLoadingDoc(false); });
    return () => { cancelled = true; };
  }, [doctor.id]);

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await verificationsApi.approve(doctor.id);
      toast.success('Licencia aprobada. El médico ya aparece en búsqueda.');
      onDone();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Error al aprobar.';
      toast.error(msg);
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (rejectReason.trim().length < 5) return;
    setSubmitting(true);
    try {
      await verificationsApi.reject(doctor.id, { reason: rejectReason.trim() });
      toast.success('Licencia rechazada. Se notificó al médico con el motivo.');
      onDone();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Error al rechazar.';
      toast.error(msg);
      setSubmitting(false);
    }
  };

  const isPdf = docMime === 'application/pdf';
  const fullName = `${doctor.user.profile.firstName ?? ''} ${doctor.user.profile.lastName ?? ''}`.trim() || 'Médico';
  const canAct = doctor.licenseVerificationStatus === 'PENDING_REVIEW';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Dr. {fullName}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {doctor.specialty}
              {doctor.licenseNumber && <> · N° <span className="font-mono">{doctor.licenseNumber}</span></>}
              {doctor.licenseAuthority && <> · {doctor.licenseAuthority}</>}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 bg-slate-50 dark:bg-slate-950">
          {loadingDoc && (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="animate-spin mr-2" size={18} /> Cargando documento…
            </div>
          )}
          {errorDoc && <Alert variant="error">{errorDoc}</Alert>}
          {!loadingDoc && !errorDoc && docUrl && (
            isPdf ? (
              <iframe src={docUrl} title="Licencia" className="w-full h-[60vh] rounded-lg bg-white shadow-sm" />
            ) : (
              <img src={docUrl} alt="Licencia" className="w-full max-h-[60vh] object-contain rounded-lg bg-white shadow-sm" />
            )
          )}
        </div>

        {rejectMode && (
          <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-rose-50 dark:bg-rose-900/10">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wide">
              Motivo del rechazo <span className="text-rose-600">*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="ej: La foto está borrosa, no se distingue el nombre. Subí otra con mejor iluminación."
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <p className={`text-xs mt-1 ${rejectReason.trim().length >= 5 ? 'text-emerald-600' : 'text-slate-500'}`}>
              {rejectReason.trim().length}/500 (mínimo 5).
            </p>
          </div>
        )}

        <div className="flex justify-end items-center gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
          {!canAct ? (
            <p className="text-xs text-slate-500 mr-auto">
              Este médico ya está {doctor.licenseVerificationStatus === 'VERIFIED' ? 'verificado' : doctor.licenseVerificationStatus === 'REJECTED' ? 'rechazado' : 'sin enviar'}.
              {doctor.licenseVerificationStatus !== 'PENDING_REVIEW' && ' Esperá a que suba un nuevo documento.'}
            </p>
          ) : rejectMode ? (
            <>
              <button
                onClick={() => { setRejectMode(false); setRejectReason(''); }}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={rejectReason.trim().length < 5 || submitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg inline-flex items-center gap-2 transition disabled:opacity-50"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                <XCircle size={14} /> Confirmar rechazo
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                Cerrar
              </button>
              <button
                onClick={() => setRejectMode(true)}
                disabled={submitting}
                className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-rose-700 dark:text-rose-300 text-sm font-medium rounded-lg border border-rose-200 dark:border-rose-700 transition inline-flex items-center gap-2"
              >
                <XCircle size={14} /> Rechazar
              </button>
              <button
                onClick={handleApprove}
                disabled={submitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg inline-flex items-center gap-2 transition disabled:opacity-50"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Aprobar licencia
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
