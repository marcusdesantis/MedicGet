import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Calendar as CalendarIcon, Clock, MapPin, Star, Stethoscope,
  CheckCircle2, AlertCircle, Loader2, Video, Building2, MessageSquare,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { CardContainer } from '@/components/ui/CardContainer';
import { Avatar } from '@/components/ui/Avatar';
import { SectionCard } from '@/components/ui/SectionCard';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import {
  doctorsApi, appointmentsApi,
  type DoctorDto, type SlotDto, type AppointmentModality,
} from '@/lib/api';
import {
  countryToTimezone, isSlotPastInTz, tzShortLabel,
} from '@/lib/timezone';

/**
 * Formats a Date as YYYY-MM-DD in local time. Used for the slot API which
 * expects a date string in that exact format and ignores timezone.
 */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * ¿El slot ya pasó en la TZ del médico? El backend guarda los slots como
 * wall-clock del médico (no UTC). Si comparamos contra `new Date()` con
 * la TZ del navegador del paciente, un paciente desde Italia ve sus 09:00
 * locales como ya-pasadas cuando en Ecuador son las 02:00. Resolvemos
 * usando la TZ derivada del país del médico (fallback America/Guayaquil).
 */
function isSlotPast(
  dayKey:    string,
  slotTime:  string,
  tz:        string,
  bufferMin: number = 0,
): boolean {
  return isSlotPastInTz(dayKey, slotTime, tz, bufferMin);
}

/**
 * Builds the upcoming-7-days strip used as the day picker. Today first, then
 * the next 6 days. Each entry has a visible label ("Lun 06") and the
 * machine-friendly key the API expects.
 */
function buildDayStrip(): { label: string; sublabel: string; key: string; isToday: boolean }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: { label: string; sublabel: string; key: string; isToday: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      label:    d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', ''),
      sublabel: d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
      key:      dayKey(d),
      isToday:  i === 0,
    });
  }
  return days;
}

function fullName(d?: DoctorDto): string {
  const p = d?.user?.profile;
  return `Dr. ${[p?.firstName, p?.lastName].filter(Boolean).join(' ')}`.trim();
}

function initials(d?: DoctorDto): string {
  const p = d?.user?.profile;
  return ((p?.firstName?.[0] ?? '') + (p?.lastName?.[0] ?? '')).toUpperCase() || 'DR';
}

/**
 * Patient — doctor detail + booking page.
 *
 * Layout:
 *   • Left column   → doctor profile (avatar, specialty, bio, price, clinic)
 *   • Right column  → booking widget: 7-day strip → slots for selected day
 *                     → confirm modal → appointment created (status PENDING)
 *
 * Important constraint:
 *   The Appointment model requires `clinicId`. If the doctor doesn't have a
 *   clinic associated yet (a doctor that just registered without selecting
 *   one), we disable the booking widget with a clear message.
 */
export function PatientDoctorDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const days     = useMemo(() => buildDayStrip(), []);
  const [selectedDay, setSelectedDay] = useState(days[0].key);

  const doctorState = useApi<DoctorDto>(() => doctorsApi.getById(id!), [id]);
  const slotsState  = useApi<SlotDto[]>(
    () => doctorsApi.getSlots(id!, selectedDay),
    [id, selectedDay],
  );

  // Booking modal state
  const [bookingSlot, setBookingSlot] = useState<SlotDto | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [notes,        setNotes]      = useState('');
  // Cuando el backend devuelve CONFLICT por una cita previa del MISMO
  // paciente (PENDING sin pagar), guardamos su id para ofrecer
  // acciones inline. El backend manda `details.existingAppointmentId`
  // junto con `details.ownedByCaller=true`.
  const [conflict, setConflict] = useState<{ appointmentId: string; status: string } | null>(null);
  const [cancellingConflict, setCancellingConflict] = useState(false);
  /**
   * Modalidad de la cita. Default ONLINE pero ajustamos al primer valor
   * aceptado por el doctor en cuanto carga el perfil — así nunca queda
   * elegida una modalidad que el doctor no acepta.
   */
  const [modality, setModality] = useState<AppointmentModality>('ONLINE');

  // Reset slot selection when day changes.
  useEffect(() => { setBookingSlot(null); }, [selectedDay]);

  // When the doctor profile loads, snap the modality to the first one they
  // actually accept. Avoids the patient confirming a modality the doctor
  // never opted in to (the backend would reject it anyway).
  useEffect(() => {
    if (doctorState.state.status !== 'ready') return;
    const accepted = doctorState.state.data.modalities ?? ['ONLINE'];
    if (accepted.length > 0 && !accepted.includes(modality)) {
      setModality(accepted[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorState.state.status === 'ready' ? doctorState.state.data.id : null]);

  if (doctorState.state.status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-slate-500 py-20 justify-center">
        <Loader2 className="animate-spin" size={20} /> Cargando perfil del médico…
      </div>
    );
  }
  if (doctorState.state.status === 'error') {
    return (
      <div className="max-w-xl mx-auto mt-12 text-center">
        <Alert variant="error">
          {doctorState.state.error.message}
        </Alert>
        <Link to="/patient/search" className="mt-4 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
          <ArrowLeft size={14} /> Volver a la búsqueda
        </Link>
      </div>
    );
  }

  const doc = doctorState.state.data;
  const profile = doc.user?.profile;
  const hasClinic = !!doc.clinic?.id;
  // TZ del médico para mostrar y filtrar horarios. Fallback Ecuador.
  const doctorTz   = countryToTimezone(profile?.country);
  const doctorTzLabel = tzShortLabel(doctorTz);
  // Doctor independiente = sin clínica. Igual puede recibir reservas (la
  // migración `appointment_optional_clinic` lo permite). Solo cambia que
  // PRESENCIAL no tiene un consultorio formal, así que dependemos del
  // address del Profile del doctor para mostrarlo como opción.
  const hasPhysicalAddress = !!doc.clinic?.id || !!profile?.address;
  const patientId = user?.dto.patient?.id;

  const handleBook = async () => {
    if (!bookingSlot || !patientId) return;
    setSubmitting(true);
    setSubmitError(null);
    setConflict(null);
    try {
      const res = await appointmentsApi.create({
        patientId,
        doctorId:  doc.id,
        // clinicId solo si existe — el backend acepta omitirlo y resuelve
        // por su cuenta (usa la clínica del doctor o queda null si es
        // independiente).
        ...(doc.clinic?.id ? { clinicId: doc.clinic.id } : {}),
        date:      selectedDay,
        time:      bookingSlot.time,
        modality,
        price:     doc.pricePerConsult,
        notes:     notes.trim() || undefined,
      });
      setConfirmedId(res.data.id);
    } catch (err: unknown) {
      const errBody = (err as {
        response?: {
          data?: {
            error?: {
              code?:    string;
              message?: string;
              details?: {
                existingAppointmentId?: string;
                existingStatus?:        string;
                ownedByCaller?:         boolean;
              };
            };
          };
        };
      })?.response?.data?.error;
      const msg = errBody?.message ?? 'No se pudo crear la cita';
      // CONFLICT con cita propia del paciente → acciones inline.
      if (
        errBody?.code === 'CONFLICT' &&
        errBody?.details?.ownedByCaller &&
        errBody?.details?.existingAppointmentId
      ) {
        setConflict({
          appointmentId: errBody.details.existingAppointmentId,
          status:        errBody.details.existingStatus ?? 'PENDING',
        });
      }
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Cancela la cita conflictiva del paciente y limpia el banner.
  const cancelConflict = async () => {
    if (!conflict) return;
    setCancellingConflict(true);
    try {
      await appointmentsApi.update(conflict.appointmentId, { status: 'CANCELLED' });
      setConflict(null);
      setSubmitError(null);
      slotsState.refetch();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'No se pudo cancelar la cita anterior';
      setSubmitError(msg);
    } finally {
      setCancellingConflict(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/patient/search" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
        <ArrowLeft size={14} /> Volver a la búsqueda
      </Link>

      <PageHeader title={fullName(doc)} subtitle={doc.specialty} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — profile */}
        <CardContainer className="lg:col-span-1 self-start">
          <div className="flex flex-col items-center text-center">
            <Avatar initials={initials(doc)} size="lg" shape="rounded" variant="blue" />
            <h2 className="mt-3 font-semibold text-slate-800 dark:text-white">{fullName(doc)}</h2>
            <p className="text-sm text-blue-600 font-medium">{doc.specialty}</p>
            {doc.rating > 0 && (
              <p className="mt-1 text-xs text-amber-500">★ {doc.rating.toFixed(1)} ({doc.reviewCount} reseñas)</p>
            )}
          </div>

          <div className="mt-5 space-y-3 text-sm text-slate-600 dark:text-slate-400">
            <Field icon={<Stethoscope size={14} />} label="Experiencia" value={`${doc.experience} años`} />
            <Field icon={<Clock size={14} />}      label="Duración consulta" value={`${doc.consultDuration} min`} />
            <Field
              icon={<MapPin size={14} />}
              label="Centro asociado"
              value={doc.clinic?.name ?? 'Profesional independiente'}
            />
            {doc.languages && doc.languages.length > 0 && (
              <Field icon={<Star size={14} />} label="Idiomas" value={doc.languages.join(', ')} />
            )}
          </div>

          <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-400">Precio por consulta</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white mt-0.5">
              {doc.pricePerConsult > 0 ? `$${doc.pricePerConsult.toFixed(2)}` : 'Consultar'}
            </p>
          </div>

          {doc.bio && (
            <>
              <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sobre el especialista</p>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {doc.bio}
                </p>
              </div>
            </>
          )}
          {profile?.phone && (
            <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
              📞 {profile.phone}
            </div>
          )}
        </CardContainer>

        {/* RIGHT — booking */}
        <div className="lg:col-span-2 space-y-6">
          {!hasClinic && (
            <Alert variant="info">
              <strong>Este médico es profesional independiente.</strong>
              <span className="block text-xs mt-1 opacity-80">
                Atiende en modalidad online por defecto. Si necesitás consulta
                presencial, contactalo directamente al confirmar la reserva.
              </span>
            </Alert>
          )}

          <SectionCard
            title="¿Cómo querés atenderte?"
            subtitle="Elegí la modalidad antes de seleccionar el horario"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ModalityOption
                value="ONLINE"
                selected={modality}
                onSelect={setModality}
                icon={<Video size={18} />}
                label="Videollamada"
                description={doc.modalities?.includes('ONLINE') ? 'Atención remota desde tu casa' : 'No disponible para este médico'}
                disabled={!doc.modalities?.includes('ONLINE')}
              />
              <ModalityOption
                value="PRESENCIAL"
                selected={modality}
                onSelect={setModality}
                icon={<Building2 size={18} />}
                label="Presencial"
                description={
                  !doc.modalities?.includes('PRESENCIAL')
                    ? 'No disponible para este médico'
                    : hasPhysicalAddress
                      ? (doc.clinic?.name ?? 'En el consultorio')
                      : 'Sin consultorio configurado'
                }
                disabled={!doc.modalities?.includes('PRESENCIAL') || !hasPhysicalAddress}
              />
              <ModalityOption
                value="CHAT"
                selected={modality}
                onSelect={setModality}
                icon={<MessageSquare size={18} />}
                label="Chat"
                description={doc.modalities?.includes('CHAT') ? 'Mensajería en vivo' : 'No disponible para este médico'}
                disabled={!doc.modalities?.includes('CHAT')}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Selecciona un día"
            subtitle="Próximos 7 días"
          >
            <div className="grid grid-cols-7 gap-2">
              {days.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setSelectedDay(d.key)}
                  className={`flex flex-col items-center justify-center py-3 rounded-xl border text-xs transition ${
                    selectedDay === d.key
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span className="font-semibold uppercase">{d.label}</span>
                  <span className="text-[11px] mt-0.5 opacity-80">{d.sublabel}</span>
                  {d.isToday && <span className="text-[10px] mt-0.5 opacity-70">hoy</span>}
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Horarios disponibles"
            subtitle={`Horas en ${doctorTzLabel} (zona horaria del médico)`}
          >
            {slotsState.state.status === 'loading' && (
              <div className="flex items-center justify-center py-8 text-slate-400">
                <Loader2 className="animate-spin" size={18} />
              </div>
            )}
            {slotsState.state.status === 'error' && (
              <p className="text-sm text-rose-600">{slotsState.state.error.message}</p>
            )}
            {slotsState.state.status === 'ready' && (() => {
              // Filter rules:
              //   • Hide booked slots
              //   • Hide slots already in the past (only relevant when the
              //     selected day is today). 15-min buffer so the patient has
              //     time to confirm/pay without the slot expiring.
              const allSlots = slotsState.state.data.filter((s) => !s.isBooked);
              const free     = allSlots.filter((s) => !isSlotPast(selectedDay, s.time, doctorTz, 15));

              const isToday      = selectedDay === days[0].key;
              const allWentBy    = isToday && allSlots.length > 0 && free.length === 0;
              const passedCount  = allSlots.length - free.length;

              if (free.length === 0) {
                return (
                  <EmptyState
                    title={allWentBy ? 'Hoy ya no hay horarios disponibles' : 'Sin horarios para este día'}
                    description={
                      allWentBy
                        ? 'Todos los espacios de hoy ya pasaron. Probá con otro día.'
                        : 'Probá con otro día de la semana o contactá al consultorio.'
                    }
                    icon={CalendarIcon}
                  />
                );
              }
              return (
                <>
                  {isToday && passedCount > 0 && (
                    <p className="text-xs text-slate-400 mb-3">
                      Se ocultaron {passedCount} horario{passedCount === 1 ? '' : 's'} que ya pasaron hoy.
                    </p>
                  )}
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {free.map((s) => {
                      const isSelected = bookingSlot?.id === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setBookingSlot(s)}
                          className={`py-2.5 rounded-lg border text-sm font-medium transition ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {s.time}
                        </button>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </SectionCard>

          {bookingSlot && !confirmedId && (
            <SectionCard title="Confirmar reserva" subtitle="Revisa los datos antes de continuar">
              <div className="space-y-2 text-sm">
                <Row label="Médico"        value={fullName(doc)} />
                <Row label="Especialidad"  value={doc.specialty} />
                <Row label="Modalidad"     value={MODALITY_LABEL[modality]} />
                <Row label="Centro"        value={doc.clinic?.name ?? 'Profesional independiente'} />
                <Row label="Fecha y hora"  value={`${days.find((d) => d.key === selectedDay)?.sublabel} · ${bookingSlot.time}`} />
                <Row label="Duración"      value={`${doc.consultDuration} min`} />
                <Row label="Precio"        value={doc.pricePerConsult > 0 ? `$${doc.pricePerConsult.toFixed(2)}` : 'Gratuito'} bold />
              </div>

              <div className="mt-4">
                <label className="block text-xs font-medium text-slate-500 mb-1">Notas (opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Cuéntale al médico el motivo de la consulta..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {submitError && (
                <div className="mt-3">
                  <Alert variant="error">{submitError}</Alert>
                </div>
              )}

              {conflict && (
                <div className="mt-3 rounded-xl border-2 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                    Ya tenés una reserva en este horario
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Tu reserva anterior quedó pendiente. Podés terminar el pago o cancelarla y reservar de nuevo.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 mt-3">
                    <Link
                      to={`/payment/checkout/${conflict.appointmentId}`}
                      className="flex-1 inline-flex items-center justify-center bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
                    >
                      Pagar la pendiente
                    </Link>
                    <button
                      type="button"
                      onClick={cancelConflict}
                      disabled={cancellingConflict}
                      className="flex-1 inline-flex items-center justify-center bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-rose-600 text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      {cancellingConflict ? 'Cancelando…' : 'Cancelar y reintentar'}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleBook}
                  disabled={submitting || !patientId || !!conflict}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Reservando...' : 'Confirmar reserva'}
                </Button>
                <Button
                  onClick={() => setBookingSlot(null)}
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl text-slate-500 hover:text-slate-700 font-medium text-sm transition disabled:opacity-50"
                >
                  Cancelar
                </Button>
              </div>

              {!patientId && (
                <p className="mt-3 text-xs text-rose-600">
                  No se detectó tu perfil de paciente. <button type="button" className="underline" onClick={() => navigate('/login')}>Inicia sesión</button> de nuevo.
                </p>
              )}
            </SectionCard>
          )}

          {confirmedId && (
            <SectionCard
              title="¡Reserva creada!"
              subtitle="Tenés 15 minutos para completar el pago"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="text-emerald-500 mt-0.5" size={22} />
                <div className="flex-1">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Tu cita con {fullName(doc)} se reservó para el{' '}
                    <strong>{days.find((d) => d.key === selectedDay)?.sublabel} a las {bookingSlot?.time}</strong>.
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Estado: <span className="font-semibold text-amber-600">PENDIENTE DE PAGO</span>.
                    Si no pagás en 15 minutos, el horario se libera automáticamente.
                  </p>

                  <div className="mt-4 flex flex-col sm:flex-row gap-3">
                    <Link
                      to={`/payment/checkout/${confirmedId}`}
                      className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-sm"
                    >
                      Pagar ahora · ${doc.pricePerConsult.toFixed(2)}
                    </Link>
                    <Link
                      to="/patient/appointments"
                      className="inline-flex items-center justify-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 px-4 py-2"
                    >
                      Pagar más tarde
                    </Link>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {!user?.dto.patient && (
            <Alert variant="warning" action={
              <Link to="/login" className="text-sm font-medium underline whitespace-nowrap">Iniciar sesión</Link>
            }>
              <AlertCircle size={14} className="inline mr-1.5" />
              Necesitas iniciar sesión como paciente para reservar.
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-slate-400 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-slate-700 dark:text-slate-300 truncate">{value}</p>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={bold ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'}>
        {value}
      </span>
    </div>
  );
}

const MODALITY_LABEL: Record<AppointmentModality, string> = {
  ONLINE:     'Videollamada',
  PRESENCIAL: 'Presencial',
  CHAT:       'Chat en vivo',
};

interface ModalityOptionProps {
  value:       AppointmentModality;
  selected:    AppointmentModality;
  onSelect:    (m: AppointmentModality) => void;
  icon:        React.ReactNode;
  label:       string;
  description: string;
  /** When true, this modality is offered regardless of doctor setup. */
  always?:     boolean;
  disabled?:   boolean;
}

function ModalityOption({ value, selected, onSelect, icon, label, description, disabled }: ModalityOptionProps) {
  const isSelected = selected === value;
  return (
    <button
      type="button"
      onClick={() => !disabled && onSelect(value)}
      disabled={disabled}
      className={`text-left p-4 rounded-xl border-2 transition ${
        disabled
          ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800'
          : isSelected
            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30 shadow-sm'
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
        }`}>
          {icon}
        </span>
        <span className={`text-sm font-semibold ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
          {label}
        </span>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{description}</p>
    </button>
  );
}
