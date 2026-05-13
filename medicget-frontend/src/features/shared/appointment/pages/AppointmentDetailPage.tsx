/**
 * AppointmentDetailPage — full-screen detail + check-in console for a
 * single appointment. Drives the PRESENCIAL flow but works as a generic
 * "what's the status of this consult?" page for the other modalities too.
 *
 *  - Modality-specific Header + CTA: ONLINE shows "Unirme a la consulta",
 *    CHAT shows "Abrir chat", PRESENCIAL shows the address + map.
 *  - PRESENCIAL check-in:
 *      • Patient → "Estoy en camino" / "He llegado" (sets `patientArrivedAt`)
 *      • Doctor  → "Recibí al paciente" (flips status to ONGOING) /
 *                  "Marcar inasistencia" (NO_SHOW) / "Atender" (COMPLETED)
 *  - Both parties see the timeline (created → patient arrived → doctor
 *    received → completed).
 *  - Driving directions deep-link to Google Maps with the clinic address
 *    encoded as the destination. Saves us from having to geocode in-app.
 *
 *  This page is mounted twice in the router so each role sees its own
 *  back link, but the body is shared.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Clock, MapPin, Building2, Loader2, Video, MessageSquare,
  CheckCircle, UserCheck, UserX, Navigation2, Phone, Stethoscope, ExternalLink,
  AlertCircle, RotateCcw,
} from 'lucide-react';
import { Avatar }       from '@/components/ui/Avatar';
import { StatusBadge }  from '@/components/ui/StatusBadge';
import { Alert }        from '@/components/ui/Alert';
import { SectionCard }  from '@/components/ui/SectionCard';
import { useApi }       from '@/hooks/useApi';
import { useAuth }      from '@/context/AuthContext';
import { appointmentStatusMap } from '@/lib/statusConfig';
import { appointmentsApi, type AppointmentDto, type MedicalRecordDto, type MedicalRecordInput } from '@/lib/api';
import { chatPathForRole } from '@/features/shared/chat/pages/AppointmentChatPage';
import { ChatImageGallery } from '@/features/shared/chat/components/ChatImageGallery';

interface AppointmentDetailPageProps {
  /** Where the back arrow returns to. */
  backTo: string;
}

export function AppointmentDetailPage({ backTo }: AppointmentDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { state, refetch } = useApi<AppointmentDto>(
    () => appointmentsApi.getById(id!),
    [id],
  );

  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const callCheckin = async (event: 'arrived' | 'patient_received' | 'no_show' | 'undo') => {
    if (!id) return;
    setActing(true);
    setActionError(null);
    try {
      await appointmentsApi.checkin(id, event);
      refetch();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo registrar la acción';
      setActionError(msg);
    } finally {
      setActing(false);
    }
  };

  const updateStatus = async (status: 'COMPLETED' | 'CANCELLED' | 'UPCOMING') => {
    if (!id) return;
    setActing(true);
    setActionError(null);
    try {
      await appointmentsApi.update(id, { status });
      refetch();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo actualizar la cita';
      setActionError(msg);
    } finally {
      setActing(false);
    }
  };

  // Doble validación — paciente confirma la atención. Ver appointmentsService.
  const confirmCompletion = async () => {
    if (!id) return;
    setActing(true);
    setActionError(null);
    try {
      await appointmentsApi.confirmCompletion(id);
      refetch();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo confirmar la atención';
      setActionError(msg);
    } finally {
      setActing(false);
    }
  };

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
      }>
        {state.error.message}
      </Alert>
    );
  }

  const a = state.data;
  const isPatient = user?.role === 'patient';
  const isDoctor  = user?.role === 'doctor';

  const peerProfile = isPatient ? a.doctor.user.profile : a.patient.user.profile;
  const peerInitials = ((peerProfile?.firstName?.[0] ?? '') + (peerProfile?.lastName?.[0] ?? '')).toUpperCase() || '··';
  const peerName = isPatient
    ? `Dr. ${peerProfile?.firstName ?? ''} ${peerProfile?.lastName ?? ''}`.trim()
    : `${peerProfile?.firstName ?? ''} ${peerProfile?.lastName ?? ''}`.trim() || 'Paciente';
  const peerSubtitle = isPatient
    ? a.doctor.specialty
    : 'Paciente';

  const fullDate = new Date(a.date).toLocaleDateString('es-ES', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  // Dirección a mostrar al paciente en PRESENCIAL:
  //   1) Si hay clínica → tomar address/city/province/country DE LA CLÍNICA.
  //   2) Si no hay clínica (médico independiente) → caer al profile del médico.
  // Antes solo se mostraba `clinic.name + peerProfile.address` (los datos
  // de la clínica como dirección no aparecían), lo cual confundía al
  // paciente porque parecía que el consultorio "no tenía dirección".
  const addrPieces = a.clinic
    ? [a.clinic.address, a.clinic.city, a.clinic.province, a.clinic.country]
    : [peerProfile?.address, peerProfile?.city, peerProfile?.province, peerProfile?.country];
  const cleanAddress = addrPieces.filter(Boolean).join(', ');
  const clinicAddress = a.clinic
    ? [a.clinic.name, cleanAddress].filter(Boolean).join(' · ')
    : cleanAddress || undefined;

  // Teléfonos visibles para el paciente en PRESENCIAL — del médico y, si
  // aplica, también de la clínica. Ambos son opcionales en el schema.
  const doctorPhone = isPatient ? peerProfile?.phone : undefined;
  const clinicPhone = isPatient ? a.clinic?.phone   : undefined;

  const directionsUrl =
    cleanAddress
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(cleanAddress)}`
      : null;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* ── Header / breadcrumb ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(backTo)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
          title="Volver"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Detalle de la cita</h1>
      </div>

      {actionError && <Alert variant="error">{actionError}</Alert>}

      {/* ── Doble validación de finalización ──
          Cuando el médico marcó la cita como atendida pero el paciente
          todavía no confirmó, mostramos un bloque grande. Visible para
          ambos roles, pero el botón "Confirmar atención" solo aparece al
          paciente. Si no confirma en 24h, el sweeper la cierra automático. */}
      {a.doctorCompletedAt && !a.patientConfirmedAt && a.status !== 'COMPLETED' && (
        <FinalizationPanel
          appointment={a}
          isPatient={isPatient}
          acting={acting}
          onConfirm={confirmCompletion}
        />
      )}

      {/* ── EN CURSO banner ──
          Cuando status === ONGOING mostramos un banner grande y un
          cronómetro contando desde que el médico recibió al paciente
          (PRESENCIAL) o desde la hora programada (ONLINE/CHAT). Eso le da
          al médico una referencia visible de cuánto lleva la consulta y
          al paciente confirmación visual de que la sesión está activa. */}
      {a.status === 'ONGOING' && !a.doctorCompletedAt && (
        <OngoingBanner appointment={a} showTimerForRole={isDoctor || isPatient} />
      )}

      {/* ── Hero card ── */}
      <SectionCard>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar
            initials={peerInitials}
            size="lg"
            shape="rounded"
            variant={isPatient ? 'blue' : 'indigo'}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">{peerName}</h2>
              <StatusBadge status={a.status.toLowerCase()} statusMap={appointmentStatusMap} size="sm" />
            </div>
            {peerSubtitle && (
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1.5 mt-0.5">
                <Stethoscope size={13} /> {peerSubtitle}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-sm text-slate-500 dark:text-slate-400 flex-wrap">
              <span className="flex items-center gap-1.5"><Calendar size={13} /> <span className="capitalize">{fullDate}</span></span>
              <span className="flex items-center gap-1.5"><Clock size={13} /> {a.time}</span>
              <span className="flex items-center gap-1.5">
                <ModalityIcon modality={a.modality} />
                {modalityLabel(a.modality)}
              </span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Precio</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">${a.price.toFixed(2)}</p>
          </div>
        </div>

        {a.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Notas</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{a.notes}</p>
          </div>
        )}
      </SectionCard>

      {/* ── Modality-specific actions ── */}
      {a.modality === 'ONLINE' && a.meetingUrl && (
        <SectionCard>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <Video size={16} className="text-blue-600" /> Videollamada
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Abrí el enlace 5 minutos antes de la hora de la cita.
              </p>
              <p className="text-xs text-slate-400 break-all mt-1">{a.meetingUrl}</p>
            </div>
            <a
              href={a.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-sm"
            >
              <Video size={15} /> Unirme
            </a>
          </div>
        </SectionCard>
      )}

      {a.modality === 'CHAT' && (
        <>
          <SectionCard>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                  <MessageSquare size={16} className="text-emerald-600" /> Chat en vivo
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Abrí la sala privada para escribirte con {peerName}.
                </p>
              </div>
              <Link
                to={chatPathForRole(user?.role ?? 'patient', a.id)}
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-sm"
              >
                <MessageSquare size={15} /> Abrir chat
              </Link>
            </div>
          </SectionCard>

          {/* Galería de imágenes compartidas en el chat — sólo se muestra
              si efectivamente hay imágenes (componente self-hides). */}
          <ChatImageGallery appointmentId={a.id} />
        </>
      )}

      {a.modality === 'PRESENCIAL' && (
        <PresencialPanel
          appointment={a}
          isPatient={isPatient}
          isDoctor={isDoctor}
          acting={acting}
          onCheckin={callCheckin}
          onUpdateStatus={updateStatus}
          clinicAddress={clinicAddress || undefined}
          directionsUrl={directionsUrl}
          peerName={peerName}
          doctorPhone={doctorPhone}
          clinicPhone={clinicPhone}
        />
      )}

      {/* ── Formulario de atención médica (sólo médico) ── */}
      {isDoctor && (
        <MedicalRecordSection appointment={a} />
      )}
      {/* Paciente puede ver el resumen post-consulta como solo-lectura. */}
      {isPatient && a.status === 'COMPLETED' && (
        <MedicalRecordSection appointment={a} readOnly />
      )}

      {/* ── Timeline ── */}
      <SectionCard>
        <h3 className="font-semibold text-slate-800 dark:text-white mb-3">Línea de tiempo</h3>
        <Timeline appointment={a} />
      </SectionCard>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────── */
/*  Medical Record — formulario de atención                              */
/* ───────────────────────────────────────────────────────────────────── */

/**
 * Formulario de atención médica. El médico ingresa motivo, síntomas,
 * enfermedades existentes, diagnóstico y tratamiento. Auto-fetch del
 * registro existente al montar.
 *
 * - Médico → edición + guardar.
 * - Paciente / clínica en modo `readOnly` → solo lectura.
 */
function MedicalRecordSection({
  appointment,
  readOnly = false,
}: {
  appointment: AppointmentDto;
  readOnly?:   boolean;
}) {
  const [form, setForm] = useState<MedicalRecordInput>({
    reason:             appointment.notes ?? '',
    symptoms:           '',
    existingConditions: '',
    diagnosis:          '',
    treatment:          '',
    notes:              '',
  });
  const [loaded, setLoaded]   = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [editing, setEditing] = useState(false);

  // Fetch del registro existente. 404 es esperable cuando aún no se creó.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await appointmentsApi.getMedicalRecord(appointment.id);
        if (cancelled) return;
        const r: MedicalRecordDto = res.data;
        setForm({
          reason:             r.reason,
          symptoms:           r.symptoms             ?? '',
          existingConditions: r.existingConditions   ?? '',
          diagnosis:          r.diagnosis            ?? '',
          treatment:          r.treatment            ?? '',
          notes:              r.notes                ?? '',
        });
      } catch {
        /* sin registro todavía — form queda vacío */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [appointment.id]);

  const save = async () => {
    if (!form.reason.trim()) {
      setError('El motivo de la consulta es obligatorio.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await appointmentsApi.upsertMedicalRecord(appointment.id, {
        reason:             form.reason.trim(),
        symptoms:           form.symptoms?.trim() || undefined,
        existingConditions: form.existingConditions?.trim() || undefined,
        diagnosis:          form.diagnosis?.trim() || undefined,
        treatment:          form.treatment?.trim() || undefined,
        notes:              form.notes?.trim() || undefined,
      });
      setSuccess(true);
      setEditing(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'No se pudo guardar la atención';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <SectionCard>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 size={14} className="animate-spin" /> Cargando ficha de atención…
        </div>
      </SectionCard>
    );
  }

  const disabled = readOnly || (!editing && !!form.reason);

  return (
    <SectionCard
      title="Ficha de atención"
      subtitle={readOnly ? 'Resumen de la consulta' : 'Completá los datos de la atención'}
    >
      <div className="space-y-3">
        <Field2
          label="Motivo de la consulta *"
          value={form.reason}
          onChange={(v) => setForm({ ...form, reason: v })}
          disabled={disabled}
          rows={2}
          placeholder="¿Qué trae al paciente hoy?"
        />
        <Field2
          label="Síntomas relatados"
          value={form.symptoms ?? ''}
          onChange={(v) => setForm({ ...form, symptoms: v })}
          disabled={disabled}
          rows={3}
          placeholder="Cefalea, fiebre, tos seca, etc."
        />
        <Field2
          label="Enfermedades / antecedentes existentes"
          value={form.existingConditions ?? ''}
          onChange={(v) => setForm({ ...form, existingConditions: v })}
          disabled={disabled}
          rows={2}
          placeholder="Hipertensión, diabetes tipo 2, asma…"
        />
        <Field2
          label="Diagnóstico / impresión clínica"
          value={form.diagnosis ?? ''}
          onChange={(v) => setForm({ ...form, diagnosis: v })}
          disabled={disabled}
          rows={2}
        />
        <Field2
          label="Indicaciones / tratamiento"
          value={form.treatment ?? ''}
          onChange={(v) => setForm({ ...form, treatment: v })}
          disabled={disabled}
          rows={3}
          placeholder="Medicación, controles, derivaciones…"
        />
        {!readOnly && (
          <Field2
            label="Notas privadas del médico"
            value={form.notes ?? ''}
            onChange={(v) => setForm({ ...form, notes: v })}
            disabled={disabled}
            rows={2}
            placeholder="No se muestran al paciente."
          />
        )}
      </div>

      {error && <Alert variant="error" className="mt-3">{error}</Alert>}
      {success && (
        <p className="mt-3 text-sm text-emerald-600 flex items-center gap-1.5">
          <CheckCircle size={14} /> Ficha guardada.
        </p>
      )}

      {!readOnly && (
        <div className="mt-4 flex justify-end gap-2">
          {disabled ? (
            <button
              onClick={() => { setEditing(true); setSuccess(false); }}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 px-4 py-2"
            >
              Editar ficha
            </button>
          ) : (
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Guardar ficha
            </button>
          )}
        </div>
      )}
    </SectionCard>
  );
}

function Field2({
  label, value, onChange, disabled, rows = 2, placeholder,
}: {
  label:       string;
  value:       string;
  onChange:    (v: string) => void;
  disabled?:   boolean;
  rows?:       number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-800/60 disabled:cursor-not-allowed resize-none"
      />
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────── */
/*  PRESENCIAL panel — address, map, check-in actions                  */
/* ───────────────────────────────────────────────────────────────────── */

interface PresencialPanelProps {
  appointment:    AppointmentDto;
  isPatient:      boolean;
  isDoctor:       boolean;
  acting:         boolean;
  onCheckin:      (e: 'arrived' | 'patient_received' | 'no_show' | 'undo') => void;
  onUpdateStatus: (s: 'COMPLETED' | 'CANCELLED' | 'UPCOMING') => void;
  clinicAddress?: string;
  directionsUrl:  string | null;
  peerName:       string;
  /** Teléfono del médico — visible solo al paciente. */
  doctorPhone?:   string;
  /** Teléfono de la clínica — visible solo al paciente. */
  clinicPhone?:   string;
}

function PresencialPanel({
  appointment, isPatient, isDoctor, acting, onCheckin, onUpdateStatus,
  clinicAddress, directionsUrl, peerName, doctorPhone, clinicPhone,
}: PresencialPanelProps) {
  const a = appointment;
  const arrived  = !!a.patientArrivedAt;
  const received = !!a.doctorCheckedInAt;
  const closed   = a.status === 'COMPLETED' || a.status === 'CANCELLED' || a.status === 'NO_SHOW';

  return (
    <SectionCard>
      <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
        <MapPin size={16} className="text-rose-600" /> Consulta en consultorio
      </h3>

      {/* Address block */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-start gap-3">
            <Building2 size={18} className="text-slate-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 dark:text-white">
                {a.clinic?.name ?? 'Consultorio del médico'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {clinicAddress ?? 'La dirección será confirmada por el consultorio.'}
              </p>
            </div>
            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition flex-shrink-0"
                title="Cómo llegar"
              >
                <Navigation2 size={13} /> Cómo llegar <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>

        {/* "Map" placeholder — we don't geocode yet, so we show the
            address in a stylised block with the directions CTA. When we
            wire up Mapbox/Leaflet+geocoding we'll swap this for a real
            map. */}
        <div className="h-40 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 flex items-center justify-center text-slate-400 text-sm">
          <div className="text-center">
            <MapPin size={28} className="mx-auto text-blue-400 mb-1" />
            <p className="text-xs">Tocá <strong>Cómo llegar</strong> para abrir Google Maps</p>
          </div>
        </div>
      </div>

      {/* Teléfonos de contacto — solo visibles al paciente. El backend
          devuelve a.clinic.phone y peerProfile.phone (médico). Mostramos
          ambos cuando existan, con tel: links para móvil. */}
      {isPatient && (doctorPhone || clinicPhone) && (
        <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Phone size={12} /> Contacto del consultorio
          </p>
          <div className="space-y-1.5">
            {doctorPhone && (
              <a
                href={`tel:${doctorPhone.replace(/\s+/g, '')}`}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <span className="text-sm text-slate-700 dark:text-slate-200">
                  <span className="text-xs text-slate-400 mr-2">Médico</span>
                  {doctorPhone}
                </span>
                <Phone size={14} className="text-blue-600 flex-shrink-0" />
              </a>
            )}
            {clinicPhone && clinicPhone !== doctorPhone && (
              <a
                href={`tel:${clinicPhone.replace(/\s+/g, '')}`}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <span className="text-sm text-slate-700 dark:text-slate-200">
                  <span className="text-xs text-slate-400 mr-2">Consultorio</span>
                  {clinicPhone}
                </span>
                <Phone size={14} className="text-blue-600 flex-shrink-0" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Prep instructions */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <PrepCard icon={Clock} title="Llegá 10 min antes" body="Para registrarte y completar cualquier ficha pendiente." />
        <PrepCard icon={Phone} title="Llevá tu DNI"        body="Y carnet de obra social si corresponde." />
        <PrepCard icon={UserCheck} title="Marcá tu llegada" body="Avisanos cuando estés en sala de espera." />
      </div>

      {/* Action panel */}
      {!closed && (
        <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-800">
          {isPatient && (
            <PatientActions arrived={arrived} acting={acting} onCheckin={onCheckin} />
          )}
          {isDoctor && (
            <DoctorActions
              arrived={arrived}
              received={received}
              status={a.status}
              acting={acting}
              onCheckin={onCheckin}
              onUpdateStatus={onUpdateStatus}
              peerName={peerName}
            />
          )}
        </div>
      )}

      {closed && (
        <div className="mt-5 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-sm text-slate-500 flex items-center gap-2">
          <AlertCircle size={14} /> La cita ya finalizó · acciones deshabilitadas.
        </div>
      )}
    </SectionCard>
  );
}

function PatientActions({
  arrived, acting, onCheckin,
}: {
  arrived: boolean;
  acting:  boolean;
  onCheckin: (e: 'arrived' | 'patient_received' | 'no_show' | 'undo') => void;
}) {
  if (arrived) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
        <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle size={16} /> Marcaste tu llegada. El médico ya fue notificado.
        </p>
        <button
          onClick={() => onCheckin('undo')}
          disabled={acting}
          className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 hover:underline disabled:opacity-50"
        >
          <RotateCcw size={12} /> Deshacer
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <button
        onClick={() => onCheckin('arrived')}
        disabled={acting}
        className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-3 rounded-xl transition shadow-sm disabled:opacity-50"
      >
        {acting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
        He llegado al consultorio
      </button>
    </div>
  );
}

function DoctorActions({
  arrived, received, status, acting, onCheckin, onUpdateStatus, peerName,
}: {
  arrived:  boolean;
  received: boolean;
  status:   string;
  acting:   boolean;
  onCheckin: (e: 'arrived' | 'patient_received' | 'no_show' | 'undo') => void;
  onUpdateStatus: (s: 'COMPLETED' | 'CANCELLED' | 'UPCOMING') => void;
  peerName: string;
}) {
  return (
    <div className="space-y-3">
      {arrived && !received && (
        <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <UserCheck size={16} /> {peerName} marcó su llegada · está en sala de espera.
        </div>
      )}

      {!received && (
        <button
          onClick={() => onCheckin('patient_received')}
          disabled={acting}
          className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl transition shadow-sm disabled:opacity-50"
        >
          {acting ? <Loader2 size={15} className="animate-spin" /> : <UserCheck size={15} />}
          Recibí al paciente · iniciar consulta
        </button>
      )}

      {received && status === 'ONGOING' && (
        <button
          onClick={() => onUpdateStatus('COMPLETED')}
          disabled={acting}
          className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-3 rounded-xl transition shadow-sm disabled:opacity-50"
        >
          {acting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
          Marcar consulta como atendida
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        {status !== 'ONGOING' && status !== 'COMPLETED' && (
          <button
            onClick={() => onCheckin('no_show')}
            disabled={acting}
            className="inline-flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-medium px-4 py-2.5 rounded-xl transition disabled:opacity-50"
          >
            <UserX size={14} /> Inasistencia
          </button>
        )}
        {status === 'PENDING' && (
          <button
            onClick={() => onUpdateStatus('UPCOMING')}
            disabled={acting}
            className="inline-flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium px-4 py-2.5 rounded-xl transition disabled:opacity-50"
          >
            <CheckCircle size={14} /> Confirmar cita
          </button>
        )}
      </div>
    </div>
  );
}

function PrepCard({ icon: Icon, title, body }: { icon: typeof Clock; title: string; body: string }) {
  return (
    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <Icon size={16} className="text-blue-600 mb-1.5" />
      <p className="font-semibold text-sm text-slate-800 dark:text-white">{title}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{body}</p>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────── */
/*  Timeline                                                            */
/* ───────────────────────────────────────────────────────────────────── */

function Timeline({ appointment: a }: { appointment: AppointmentDto }) {
  const items: Array<{ at: string | null | undefined; label: string; done: boolean; tone: 'gray' | 'green' | 'blue' | 'red' }> = [
    { at: a.createdAt,          label: 'Cita reservada',                 done: true,                                        tone: 'gray' },
    { at: a.patientArrivedAt,   label: 'Paciente llegó al consultorio',  done: !!a.patientArrivedAt,                        tone: 'blue' },
    { at: a.doctorCheckedInAt,  label: 'Médico recibió al paciente',     done: !!a.doctorCheckedInAt,                       tone: 'blue' },
    {
      at: undefined,
      label: a.status === 'COMPLETED' ? 'Consulta atendida'
           : a.status === 'CANCELLED' ? 'Cita cancelada'
           : a.status === 'NO_SHOW'   ? 'Inasistencia'
           : 'Consulta en curso',
      done: ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status),
      tone: a.status === 'CANCELLED' || a.status === 'NO_SHOW' ? 'red'
          : a.status === 'COMPLETED' ? 'green' : 'gray',
    },
  ];

  return (
    <ol className="space-y-3 relative pl-6 before:content-[''] before:absolute before:left-2 before:top-1 before:bottom-1 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
      {items.map((it, idx) => {
        const dotClass =
          !it.done ? 'bg-slate-300 dark:bg-slate-700' :
          it.tone === 'green' ? 'bg-emerald-500' :
          it.tone === 'blue'  ? 'bg-blue-500'    :
          it.tone === 'red'   ? 'bg-rose-500'    :
                                'bg-slate-400';
        return (
          <li key={idx} className="relative">
            <span className={`absolute -left-[18px] top-1.5 w-3 h-3 rounded-full ${dotClass} ring-4 ring-white dark:ring-slate-900`} />
            <div className="flex items-baseline justify-between gap-3">
              <p className={`text-sm ${it.done ? 'text-slate-800 dark:text-white font-medium' : 'text-slate-400'}`}>
                {it.label}
              </p>
              {it.at && (
                <span className="text-xs text-slate-400 flex-shrink-0">
                  {new Date(it.at).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ───────────────────────────────────────────────────────────────────── */
/*  Bits                                                                */
/* ───────────────────────────────────────────────────────────────────── */

/* ───────────────────────────────────────────────────────────────────── */
/*  Finalization panel — doble validación                                */
/* ───────────────────────────────────────────────────────────────────── */

/**
 * Banner de doble validación. Solo se monta cuando el médico ya marcó
 * `doctorCompletedAt` y el paciente todavía no confirmó. Al paciente le
 * mostramos un CTA grande "Confirmar atención"; al médico le mostramos
 * un estado "esperando confirmación del paciente" + el reloj de cuánto
 * falta para el auto-cierre (24h desde doctorCompletedAt).
 */
function FinalizationPanel({
  appointment,
  isPatient,
  acting,
  onConfirm,
}: {
  appointment: AppointmentDto;
  isPatient:   boolean;
  acting:      boolean;
  onConfirm:   () => void;
}) {
  const markedAt = appointment.doctorCompletedAt
    ? new Date(appointment.doctorCompletedAt).getTime()
    : Date.now();
  const deadline = markedAt + 24 * 60 * 60 * 1000;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const remainingMs = Math.max(0, deadline - now);
  const remainingH  = Math.floor(remainingMs / 3_600_000);
  const remainingM  = Math.floor((remainingMs % 3_600_000) / 60_000);

  return (
    <div className="rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40 p-6 shadow-lg shadow-amber-400/10">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="flex items-start gap-3">
          <CheckCircle size={24} className="text-amber-600 flex-shrink-0 mt-1" />
          <div>
            <p className="text-lg font-bold text-amber-800 dark:text-amber-200">
              {isPatient
                ? 'El médico marcó la consulta como atendida'
                : 'Esperando confirmación del paciente'}
            </p>
            <p className="text-sm text-amber-700/90 dark:text-amber-200/90 mt-1">
              {isPatient
                ? 'Confirmá desde tu lado que la atención se realizó. Si no respondés en las próximas horas, se dará por finalizada automáticamente.'
                : `Le enviamos una notificación al paciente. Si no responde en ~${remainingH}h ${remainingM}m, la cita se cierra de oficio.`}
            </p>
          </div>
        </div>
        {isPatient && (
          <button
            onClick={onConfirm}
            disabled={acting}
            className="inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-5 py-3 rounded-xl transition shadow-sm shadow-amber-600/30 disabled:opacity-50 flex-shrink-0"
          >
            {acting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
            Confirmar atención
          </button>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────── */
/*  Ongoing banner + cronómetro                                          */
/* ───────────────────────────────────────────────────────────────────── */

/**
 * Banner grande "EN CURSO" con un cronómetro vivo. La hora de inicio se
 * resuelve, en prioridad:
 *   1. `doctorCheckedInAt` (PRESENCIAL — paciente ya fue recibido)
 *   2. la hora programada de la cita (`date + time` interpretado como
 *      wall-clock Ecuador, alineado con el resto del backend)
 *
 * Ticks cada segundo via setInterval; el componente se desmonta cuando
 * la cita deja de estar ONGOING, así que no hay leak.
 */
function OngoingBanner({
  appointment,
  showTimerForRole,
}: {
  appointment:      AppointmentDto;
  showTimerForRole: boolean;
}) {
  const startedAt = useMemo(() => {
    if (appointment.doctorCheckedInAt) {
      return new Date(appointment.doctorCheckedInAt).getTime();
    }
    const dateOnly = new Date(appointment.date).toISOString().slice(0, 10);
    return Date.parse(`${dateOnly}T${appointment.time}:00-05:00`);
  }, [appointment.doctorCheckedInAt, appointment.date, appointment.time]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const elapsedMs = Math.max(0, now - startedAt);
  const hh = Math.floor(elapsedMs / 3_600_000);
  const mm = Math.floor((elapsedMs % 3_600_000) / 60_000);
  const ss = Math.floor((elapsedMs % 60_000) / 1000);
  const timer = `${hh > 0 ? String(hh).padStart(2, '0') + ':' : ''}${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;

  return (
    <div className="rounded-2xl border-2 border-emerald-500 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 p-6 shadow-lg shadow-emerald-500/10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
          </span>
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold text-emerald-700 dark:text-emerald-300 tracking-tight leading-none">
              CONSULTA EN CURSO
            </p>
            <p className="text-sm text-emerald-700/80 dark:text-emerald-300/80 mt-1">
              La cita está activa en este momento.
            </p>
          </div>
        </div>
        {showTimerForRole && (
          <div className="flex flex-col items-end">
            <p className="text-[10px] uppercase tracking-widest text-emerald-700/70 dark:text-emerald-300/70 font-semibold">
              Tiempo de consulta
            </p>
            <p className="font-mono text-3xl sm:text-4xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
              {timer}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ModalityIcon({ modality }: { modality: 'ONLINE' | 'PRESENCIAL' | 'CHAT' }) {
  if (modality === 'ONLINE')     return <Video size={13} />;
  if (modality === 'PRESENCIAL') return <MapPin size={13} />;
  return <MessageSquare size={13} />;
}

function modalityLabel(m: 'ONLINE' | 'PRESENCIAL' | 'CHAT') {
  return m === 'ONLINE' ? 'Videollamada' : m === 'PRESENCIAL' ? 'En consultorio' : 'Chat en vivo';
}

/* ───────────────────────────────────────────────────────────────────── */
/*  Role-specific exports                                                */
/* ───────────────────────────────────────────────────────────────────── */

export function PatientAppointmentDetailPage() {
  return <AppointmentDetailPage backTo="/patient/appointments" />;
}

export function DoctorAppointmentDetailPage() {
  return <AppointmentDetailPage backTo="/doctor/appointments" />;
}

export function detailPathForRole(role: 'patient' | 'doctor' | 'clinic', appointmentId: string): string {
  if (role === 'doctor')  return `/doctor/appointments/${appointmentId}`;
  return `/patient/appointments/${appointmentId}`;
}
