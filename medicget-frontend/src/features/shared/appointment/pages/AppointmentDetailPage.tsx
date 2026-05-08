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

import { useState } from 'react';
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
import { appointmentsApi, type AppointmentDto } from '@/lib/api';
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

  const clinicAddress =
    a.clinic && [a.clinic.name, peerProfile?.address, peerProfile?.city, peerProfile?.country]
      .filter(Boolean).join(', ');
  const directionsUrl =
    a.clinic
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${a.clinic.name} ${peerProfile?.address ?? ''}`)}`
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
        />
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
}

function PresencialPanel({
  appointment, isPatient, isDoctor, acting, onCheckin, onUpdateStatus,
  clinicAddress, directionsUrl, peerName,
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
