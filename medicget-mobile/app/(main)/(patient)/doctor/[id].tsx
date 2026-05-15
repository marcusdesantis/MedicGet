/**
 * Patient — Doctor Detail + Booking. Mirror del PatientDoctorDetailPage
 * web. Renderiza:
 *   • Perfil del médico (avatar, especialidad, precio, idiomas, bio)
 *   • Selector de modalidad (ONLINE / PRESENCIAL / CHAT — sólo las
 *     habilitadas por el médico)
 *   • Strip de los próximos 7 días + slots filtrados por TZ del médico
 *   • Confirmación de reserva (notas opcionales, status PENDING) y
 *     pantalla de éxito con CTA "Pagar ahora".
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert as RNAlert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Building2,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquare,
  Star,
  Stethoscope,
  Video,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { Avatar } from '@/components/ui/Avatar';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import {
  appointmentsApi,
  doctorsApi,
  type AppointmentModality,
  type DoctorDto,
  type SlotDto,
} from '@/lib/api';
import {
  countryToTimezone,
  isSlotPastInTz,
  tzShortLabel,
} from '@/lib/timezone';
import { dayKey, profileInitials } from '@/lib/format';

const MODALITY_LABEL: Record<AppointmentModality, string> = {
  ONLINE: 'Videollamada',
  PRESENCIAL: 'Presencial',
  CHAT: 'Chat en vivo',
};

function buildDayStrip(): {
  label: string;
  sublabel: string;
  key: string;
  isToday: boolean;
}[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      label: d
        .toLocaleDateString('es-ES', { weekday: 'short' })
        .replace('.', ''),
      sublabel: d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
      }),
      key: dayKey(d),
      isToday: i === 0,
    });
  }
  return days;
}

function fullName(d?: DoctorDto): string {
  const p = d?.user?.profile;
  return `Dr. ${[p?.firstName, p?.lastName].filter(Boolean).join(' ')}`.trim();
}

export default function DoctorDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useAuth();

  const days = useMemo(() => buildDayStrip(), []);
  const [selectedDay, setSelectedDay] = useState(days[0]!.key);

  const doctorState = useApi(() => doctorsApi.getById(id!), [id]);
  const slotsState = useApi(
    () => doctorsApi.getSlots(id!, selectedDay),
    [id, selectedDay],
  );

  const [bookingSlot, setBookingSlot] = useState<SlotDto | null>(null);
  const [modality, setModality] = useState<AppointmentModality>('ONLINE');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  // Cuando el backend devuelve CONFLICT por una cita previa del MISMO
  // paciente (PENDING sin pagar), guardamos su id para ofrecer
  // acciones inline ("Pagar la pendiente" / "Cancelar y volver a
  // intentar"). El backend manda `details.existingAppointmentId`
  // junto con `details.ownedByCaller=true`.
  const [conflict, setConflict] = useState<{
    appointmentId: string;
    status: string;
  } | null>(null);
  const [cancellingConflict, setCancellingConflict] = useState(false);

  useEffect(() => {
    setBookingSlot(null);
  }, [selectedDay]);

  // Snap modality al primero aceptado cuando carga el perfil.
  useEffect(() => {
    if (doctorState.state.status !== 'ready') return;
    const accepted: AppointmentModality[] =
      doctorState.state.data.modalities && doctorState.state.data.modalities.length > 0
        ? doctorState.state.data.modalities
        : ['ONLINE'];
    const first = accepted[0];
    if (first && !accepted.includes(modality)) {
      setModality(first);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    doctorState.state.status === 'ready' ? doctorState.state.data.id : null,
  ]);

  if (doctorState.state.status === 'loading') {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </Screen>
    );
  }

  if (doctorState.state.status === 'error') {
    return (
      <Screen>
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center gap-1.5 mb-4">
          <ArrowLeft size={14} color="#475569" />
          <Text className="text-sm text-slate-500">Volver</Text>
        </Pressable>
        <Alert variant="error">
          <Text className="text-rose-700 dark:text-rose-300 text-sm">
            {doctorState.state.error.message}
          </Text>
        </Alert>
      </Screen>
    );
  }

  const doc = doctorState.state.data;
  const profile = doc.user?.profile;
  const hasClinic = !!doc.clinic?.id;
  const doctorTz = countryToTimezone(profile?.country);
  const doctorTzLabel = tzShortLabel(doctorTz);
  const hasPhysicalAddress = !!doc.clinic?.id || !!profile?.address;
  const patientId = user?.dto.patient?.id;

  const handleBook = () => {
    RNAlert.alert(
      'Confirmar reserva',
      `¿Reservar el ${selectedDay} a las ${bookingSlot?.time} con ${fullName(doc)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Reservar', onPress: confirmBooking },
      ],
    );
  };

  const confirmBooking = async () => {
    if (!bookingSlot || !patientId) return;
    setSubmitting(true);
    setSubmitError(null);
    setConflict(null);
    try {
      const res = await appointmentsApi.create({
        patientId,
        doctorId: doc.id,
        ...(doc.clinic?.id ? { clinicId: doc.clinic.id } : {}),
        date: selectedDay,
        time: bookingSlot.time,
        modality,
        price: doc.pricePerConsult,
        notes: notes.trim() || undefined,
      });
      setConfirmedId(res.data.id);
    } catch (err: unknown) {
      const errBody = (err as {
        response?: {
          data?: {
            error?: {
              code?: string;
              message?: string;
              details?: {
                existingAppointmentId?: string;
                existingStatus?: string;
                ownedByCaller?: boolean;
              };
            };
          };
        };
      })?.response?.data?.error;
      const msg = errBody?.message ?? 'No se pudo crear la cita';
      // CONFLICT con cita propia del paciente → ofrecemos acciones
      // inline (pagar / cancelar y reintentar).
      if (
        errBody?.code === 'CONFLICT' &&
        errBody?.details?.ownedByCaller &&
        errBody?.details?.existingAppointmentId
      ) {
        setConflict({
          appointmentId: errBody.details.existingAppointmentId,
          status: errBody.details.existingStatus ?? 'PENDING',
        });
      }
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Cancela la cita previa del paciente (la que está bloqueando el
   * slot) y limpia el estado para que reintente la reserva.
   */
  const cancelConflict = async () => {
    if (!conflict) return;
    setCancellingConflict(true);
    try {
      await appointmentsApi.update(conflict.appointmentId, {
        status: 'CANCELLED',
      });
      setConflict(null);
      setSubmitError(null);
      // Refrescamos los slots del día para reflejar el slot liberado.
      slotsState.refetch();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ??
        'No se pudo cancelar la cita anterior';
      setSubmitError(msg);
    } finally {
      setCancellingConflict(false);
    }
  };

  return (
    <Screen>
      <Pressable
        onPress={() => router.back()}
        className="flex-row items-center gap-1.5 mb-3">
        <ArrowLeft size={14} color="#475569" />
        <Text className="text-sm text-slate-500">Volver a la búsqueda</Text>
      </Pressable>

      <PageHeader title={fullName(doc)} subtitle={doc.specialty} />

      <View className="gap-4">
        {/* Profile card */}
        <SectionCard>
          <View className="items-center mb-3">
            <Avatar
              initials={profileInitials(profile, 'DR')}
              imageUrl={profile?.avatarUrl ?? null}
              size="xl"
              shape="rounded"
              variant="blue"
            />
            <Text className="mt-3 font-semibold text-slate-800 dark:text-white text-center">
              {fullName(doc)}
            </Text>
            <Text className="text-sm text-blue-600 font-medium">
              {doc.specialty}
            </Text>
            {doc.rating > 0 ? (
              <Text className="mt-1 text-xs text-amber-500">
                ★ {doc.rating.toFixed(1)} ({doc.reviewCount} reseñas)
              </Text>
            ) : null}
          </View>

          <Field
            icon={<Stethoscope size={14} color="#94a3b8" />}
            label="Experiencia"
            value={`${doc.experience} años`}
          />
          <Field
            icon={<Clock size={14} color="#94a3b8" />}
            label="Duración consulta"
            value={`${doc.consultDuration} min`}
          />
          <Field
            icon={<MapPin size={14} color="#94a3b8" />}
            label="Centro asociado"
            value={doc.clinic?.name ?? 'Profesional independiente'}
          />
          {doc.languages && doc.languages.length > 0 ? (
            <Field
              icon={<Star size={14} color="#94a3b8" />}
              label="Idiomas"
              value={doc.languages.join(', ')}
            />
          ) : null}

          <View className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 items-center">
            <Text className="text-xs text-slate-400">Precio por consulta</Text>
            <Text className="text-3xl font-bold text-slate-800 dark:text-white mt-0.5">
              {doc.pricePerConsult > 0
                ? `$${doc.pricePerConsult.toFixed(2)}`
                : 'Consultar'}
            </Text>
          </View>

          {doc.bio ? (
            <View className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Text className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Sobre el especialista
              </Text>
              <Text className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                {doc.bio}
              </Text>
            </View>
          ) : null}
        </SectionCard>

        {!hasClinic ? (
          <Alert variant="info">
            <Text className="text-blue-700 dark:text-blue-300 text-sm font-semibold">
              Este médico es profesional independiente.
            </Text>
            <Text className="text-blue-700 dark:text-blue-300 text-xs mt-1 opacity-80">
              Atiende en modalidad online por defecto. Para presencial,
              contactalo directamente al confirmar la reserva.
            </Text>
          </Alert>
        ) : null}

        <SectionCard
          title="¿Cómo querés atenderte?"
          subtitle="Elegí la modalidad antes de seleccionar el horario">
          <View className="gap-2">
            <ModalityOption
              value="ONLINE"
              selected={modality}
              onSelect={setModality}
              icon={<Video size={18} color="#2563eb" />}
              label="Videollamada"
              description={
                doc.modalities?.includes('ONLINE')
                  ? 'Atención remota desde tu casa'
                  : 'No disponible para este médico'
              }
              disabled={!doc.modalities?.includes('ONLINE')}
            />
            <ModalityOption
              value="PRESENCIAL"
              selected={modality}
              onSelect={setModality}
              icon={<Building2 size={18} color="#2563eb" />}
              label="Presencial"
              description={
                !doc.modalities?.includes('PRESENCIAL')
                  ? 'No disponible para este médico'
                  : hasPhysicalAddress
                    ? doc.clinic?.name ?? 'En el consultorio'
                    : 'Sin consultorio configurado'
              }
              disabled={
                !doc.modalities?.includes('PRESENCIAL') || !hasPhysicalAddress
              }
            />
            <ModalityOption
              value="CHAT"
              selected={modality}
              onSelect={setModality}
              icon={<MessageSquare size={18} color="#2563eb" />}
              label="Chat"
              description={
                doc.modalities?.includes('CHAT')
                  ? 'Mensajería en vivo'
                  : 'No disponible para este médico'
              }
              disabled={!doc.modalities?.includes('CHAT')}
            />
          </View>
        </SectionCard>

        <SectionCard
          title="Selecciona un día"
          subtitle="Próximos 7 días">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {days.map((d) => {
                const selected = selectedDay === d.key;
                return (
                  <Pressable
                    key={d.key}
                    onPress={() => setSelectedDay(d.key)}
                    className={`items-center justify-center py-3 px-3 rounded-xl border min-w-[64px] ${
                      selected
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                    }`}>
                    <Text
                      className={`text-[10px] font-semibold uppercase ${
                        selected
                          ? 'text-white'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}>
                      {d.label}
                    </Text>
                    <Text
                      className={`text-[11px] mt-0.5 ${
                        selected
                          ? 'text-white/90'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}>
                      {d.sublabel}
                    </Text>
                    {d.isToday ? (
                      <Text
                        className={`text-[9px] mt-0.5 ${
                          selected ? 'text-white/80' : 'text-slate-400'
                        }`}>
                        hoy
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </SectionCard>

        <SectionCard
          title="Horarios disponibles"
          subtitle={`Horas en ${doctorTzLabel} (zona horaria del médico)`}>
          <SlotsGrid
            state={slotsState.state}
            selectedDay={selectedDay}
            isFirstDay={selectedDay === days[0]!.key}
            doctorTz={doctorTz}
            bookingSlot={bookingSlot}
            onSelectSlot={setBookingSlot}
          />
        </SectionCard>

        {bookingSlot && !confirmedId ? (
          <SectionCard
            title="Confirmar reserva"
            subtitle="Revisa los datos antes de continuar">
            <Row label="Médico" value={fullName(doc)} />
            <Row label="Especialidad" value={doc.specialty} />
            <Row label="Modalidad" value={MODALITY_LABEL[modality]} />
            <Row
              label="Centro"
              value={doc.clinic?.name ?? 'Profesional independiente'}
            />
            <Row
              label="Fecha y hora"
              value={`${days.find((d) => d.key === selectedDay)?.sublabel} · ${bookingSlot.time}`}
            />
            <Row label="Duración" value={`${doc.consultDuration} min`} />
            <Row
              label="Precio"
              value={
                doc.pricePerConsult > 0
                  ? `$${doc.pricePerConsult.toFixed(2)}`
                  : 'Gratuito'
              }
              bold
            />

            <View className="mt-3">
              <Text className="text-xs font-medium text-slate-500 mb-1">
                Notas (opcional)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                placeholder="Motivo de la consulta..."
                placeholderTextColor="#94a3b8"
                className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100 min-h-[80px]"
                textAlignVertical="top"
              />
            </View>

            {submitError ? (
              <View className="mt-3">
                <Alert variant="error">{submitError}</Alert>
              </View>
            ) : null}

            {conflict ? (
              <View className="mt-3 rounded-2xl border-2 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
                <Text className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  Ya tenés una reserva en este horario
                </Text>
                <Text className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Tu reserva anterior quedó pendiente. Podés terminar el
                  pago o cancelarla y reservar de nuevo.
                </Text>
                <View className="flex-row gap-2 mt-3">
                  <Pressable
                    onPress={() =>
                      router.push(
                        `/(main)/(patient)/payment/checkout/${conflict.appointmentId}` as never,
                      )
                    }
                    className="flex-1 bg-amber-600 active:bg-amber-700 py-2 rounded-lg items-center">
                    <Text className="text-white text-sm font-semibold">
                      Pagar la pendiente
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={cancelConflict}
                    disabled={cancellingConflict}
                    className="flex-1 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 py-2 rounded-lg items-center">
                    <Text className="text-rose-600 text-sm font-semibold">
                      {cancellingConflict ? 'Cancelando…' : 'Cancelar y reintentar'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <View className="mt-4 gap-2">
              <Button
                onPress={handleBook}
                disabled={submitting || !patientId || !!conflict}
                loading={submitting}
                fullWidth>
                Confirmar reserva
              </Button>
              <Button
                variant="ghost"
                onPress={() => setBookingSlot(null)}
                disabled={submitting}
                fullWidth>
                Cancelar
              </Button>
            </View>

            {!patientId ? (
              <Text className="mt-3 text-xs text-rose-600 text-center">
                No se detectó tu perfil de paciente. Vuelve a iniciar sesión.
              </Text>
            ) : null}
          </SectionCard>
        ) : null}

        {confirmedId ? (
          <SectionCard
            title="¡Reserva creada!"
            subtitle="Tenés 15 minutos para completar el pago">
            <View className="flex-row items-start gap-3">
              <CheckCircle2 size={22} color="#10b981" />
              <View className="flex-1">
                <Text className="text-sm text-slate-700 dark:text-slate-300">
                  Tu cita con {fullName(doc)} se reservó para el{' '}
                  <Text className="font-bold">
                    {days.find((d) => d.key === selectedDay)?.sublabel} a las{' '}
                    {bookingSlot?.time}
                  </Text>
                  .
                </Text>
                <Text className="mt-2 text-xs text-slate-500">
                  Estado:{' '}
                  <Text className="font-semibold text-amber-600">
                    PENDIENTE DE PAGO
                  </Text>
                  . Si no pagás en 15 minutos, el horario se libera
                  automáticamente.
                </Text>

                <View className="mt-4 gap-2">
                  <Button
                    onPress={() => router.replace('/(main)/(patient)/appointments')}
                    fullWidth>
                    Ver mis citas
                  </Button>
                </View>
              </View>
            </View>
          </SectionCard>
        ) : null}
      </View>
    </Screen>
  );
}

function SlotsGrid({
  state,
  selectedDay,
  isFirstDay,
  doctorTz,
  bookingSlot,
  onSelectSlot,
}: {
  state: ReturnType<typeof useApi<SlotDto[]>>['state'];
  selectedDay: string;
  isFirstDay: boolean;
  doctorTz: string;
  bookingSlot: SlotDto | null;
  onSelectSlot: (s: SlotDto) => void;
}) {
  if (state.status === 'loading') {
    return (
      <View className="py-6 items-center">
        <ActivityIndicator size="small" color="#2563eb" />
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <Text className="text-sm text-rose-600 text-center py-4">
        {state.error.message}
      </Text>
    );
  }

  const allSlots = state.data.filter((s) => !s.isBooked);
  const free = allSlots.filter(
    (s) => !isSlotPastInTz(selectedDay, s.time, doctorTz, 15),
  );
  const allWentBy = isFirstDay && allSlots.length > 0 && free.length === 0;
  const passedCount = allSlots.length - free.length;

  if (free.length === 0) {
    return (
      <EmptyState
        title={
          allWentBy
            ? 'Hoy ya no hay horarios disponibles'
            : 'Sin horarios para este día'
        }
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
    <View>
      {isFirstDay && passedCount > 0 ? (
        <Text className="text-xs text-slate-400 mb-3">
          Se ocultaron {passedCount} horario{passedCount === 1 ? '' : 's'} que
          ya pasaron hoy.
        </Text>
      ) : null}
      <View className="flex-row flex-wrap gap-2">
        {free.map((s) => {
          const isSelected = bookingSlot?.id === s.id;
          return (
            <Pressable
              key={s.id}
              onPress={() => onSelectSlot(s)}
              className={`py-2.5 px-3 rounded-lg border min-w-[68px] items-center ${
                isSelected
                  ? 'bg-blue-600 border-blue-600'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
              }`}>
              <Text
                className={`text-sm font-medium ${
                  isSelected
                    ? 'text-white'
                    : 'text-slate-700 dark:text-slate-200'
                }`}>
                {s.time}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-start gap-2 mt-2">
      <View className="mt-0.5">{icon}</View>
      <View className="flex-1">
        <Text className="text-[10px] uppercase tracking-wider text-slate-400">
          {label}
        </Text>
        <Text className="text-sm text-slate-700 dark:text-slate-300">
          {value}
        </Text>
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
      <Text className="text-sm text-slate-500 dark:text-slate-400">
        {label}
      </Text>
      <Text
        className={`text-sm ${
          bold
            ? 'font-bold text-slate-900 dark:text-white'
            : 'text-slate-800 dark:text-slate-200'
        }`}>
        {value}
      </Text>
    </View>
  );
}

function ModalityOption({
  value,
  selected,
  onSelect,
  icon,
  label,
  description,
  disabled,
}: {
  value: AppointmentModality;
  selected: AppointmentModality;
  onSelect: (m: AppointmentModality) => void;
  icon: React.ReactNode;
  label: string;
  description: string;
  disabled?: boolean;
}) {
  const isSelected = selected === value;
  return (
    <Pressable
      onPress={() => (disabled ? null : onSelect(value))}
      disabled={disabled}
      className={`flex-row items-start gap-3 p-3 rounded-xl border-2 ${
        disabled
          ? 'border-slate-200 dark:border-slate-800 opacity-50'
          : isSelected
            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
            : 'border-slate-200 dark:border-slate-700'
      }`}>
      <View
        className={`w-9 h-9 rounded-lg items-center justify-center ${
          isSelected ? 'bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'
        }`}>
        {icon}
      </View>
      <View className="flex-1">
        <Text
          className={`text-sm font-semibold ${
            isSelected
              ? 'text-blue-700 dark:text-blue-300'
              : 'text-slate-800 dark:text-slate-200'
          }`}>
          {label}
        </Text>
        <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {description}
        </Text>
      </View>
    </Pressable>
  );
}
