/**
 * Patient — Detalle de cita. Espejo del AppointmentDetailPage web filtrado
 * a las acciones que el paciente puede realizar:
 *
 *   • Banner de "doble validación" cuando el médico marcó la cita atendida
 *     y falta la confirmación del paciente.
 *   • Banner "EN CURSO" con timer.
 *   • Acciones modality-specific (Unirme video, Abrir chat, Cómo llegar).
 *   • PRESENCIAL: marcar "He llegado" / undo.
 *   • Cancelar cita (si PENDING/UPCOMING).
 *   • Ficha de atención médica (read-only) cuando la cita está COMPLETED.
 *   • Timeline.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert as RNAlert,
  Linking,
  Pressable,
  Text,
  View,
} from 'react-native';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar as CalendarIcon,
  CheckCircle,
  Clock,
  CreditCard,
  ExternalLink,
  MapPin,
  MessageSquare,
  Navigation2,
  Phone,
  RotateCcw,
  Stethoscope,
  Video,
  X,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { SectionCard } from '@/components/ui/SectionCard';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useApi } from '@/hooks/useApi';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { appointmentStatusMap } from '@/lib/statusConfig';
import { fmtMedDate, profileInitials } from '@/lib/format';
import {
  appointmentsApi,
  paymentApi,
  type AppointmentDto,
  type AppointmentModality,
  type MedicalRecordDto,
} from '@/lib/api';

const MODALITY_LABEL: Record<AppointmentModality, string> = {
  ONLINE: 'Videollamada',
  PRESENCIAL: 'En consultorio',
  CHAT: 'Chat en vivo',
};

function modalityIcon(m: AppointmentModality, size = 13, color = '#475569') {
  if (m === 'ONLINE') return <Video size={size} color={color} />;
  if (m === 'PRESENCIAL') return <MapPin size={size} color={color} />;
  return <MessageSquare size={size} color={color} />;
}

export default function PatientAppointmentDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const { state, refetch } = useApi(
    () => appointmentsApi.getById(id!),
    [id],
  );
  // Cuando el usuario vuelve del WebView de PayPhone (sin importar si
  // el pago se confirmó automáticamente o no), refrescamos para
  // detectar si la cita ya está en UPCOMING/PAID.
  useRefetchOnFocus(refetch);

  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const doCheckin = async (
    event: 'arrived' | 'patient_received' | 'no_show' | 'undo',
  ) => {
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
          ?.response?.data?.error?.message ??
        'No se pudo confirmar la atención';
      setActionError(msg);
    } finally {
      setActing(false);
    }
  };

  const handleCancel = () => {
    RNAlert.alert(
      'Cancelar cita',
      '¿Seguro que deseas cancelar esta cita?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            setActing(true);
            setActionError(null);
            try {
              await appointmentsApi.update(id, { status: 'CANCELLED' });
              refetch();
            } catch (err: unknown) {
              const msg =
                (err as { response?: { data?: { error?: { message?: string } } } })
                  ?.response?.data?.error?.message ??
                'No se pudo cancelar la cita';
              setActionError(msg);
            } finally {
              setActing(false);
            }
          },
        },
      ],
    );
  };

  if (state.status === 'loading') {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </Screen>
    );
  }

  if (state.status === 'error') {
    return (
      <Screen>
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center gap-1.5 mb-3">
          <ArrowLeft size={14} color="#475569" />
          <Text className="text-sm text-slate-500">Volver</Text>
        </Pressable>
        <Alert variant="error">
          <Text className="text-rose-700 dark:text-rose-300 text-sm">
            {state.error.message}
          </Text>
          <Pressable onPress={refetch} className="mt-2">
            <Text className="text-blue-600 text-xs font-semibold">
              Reintentar
            </Text>
          </Pressable>
        </Alert>
      </Screen>
    );
  }

  const a = state.data;
  const profile = a.doctor?.user?.profile;
  const peerName = `Dr. ${[profile?.firstName, profile?.lastName].filter(Boolean).join(' ')}`.trim();

  const addrPieces = a.clinic
    ? [a.clinic.address, a.clinic.city, a.clinic.province, a.clinic.country]
    : [profile?.address, profile?.city, profile?.province, profile?.country];
  const cleanAddress = addrPieces.filter(Boolean).join(', ');
  const directionsUrl = cleanAddress
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(cleanAddress)}`
    : null;

  const cancellable = a.status === 'PENDING' || a.status === 'UPCOMING';
  const closed =
    a.status === 'COMPLETED' ||
    a.status === 'CANCELLED' ||
    a.status === 'NO_SHOW';

  return (
    <Screen>
      <View className="flex-row items-center gap-2 mb-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={6}
          className="w-9 h-9 rounded-lg items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
          <ArrowLeft size={16} color="#475569" />
        </Pressable>
        <Text className="text-xl font-bold text-slate-800 dark:text-white">
          Detalle de la cita
        </Text>
      </View>

      {actionError ? (
        <View className="mb-3">
          <Alert variant="error">{actionError}</Alert>
        </View>
      ) : null}

      {a.doctorCompletedAt && !a.patientConfirmedAt && a.status !== 'COMPLETED' ? (
        <FinalizationPanel
          appointment={a}
          acting={acting}
          onConfirm={confirmCompletion}
        />
      ) : null}

      {a.status === 'ONGOING' && !a.doctorCompletedAt ? (
        <OngoingBanner appointment={a} />
      ) : null}

      <View className="gap-4 mt-2">
        {/* Hero card */}
        <SectionCard>
          <View className="flex-row items-start gap-3">
            <Avatar
              initials={profileInitials(profile, 'DR')}
              imageUrl={profile?.avatarUrl ?? null}
              size="lg"
              shape="rounded"
              variant="blue"
            />
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-2 flex-wrap">
                <Text className="text-lg font-bold text-slate-800 dark:text-white">
                  {peerName}
                </Text>
                <StatusBadge
                  status={a.status.toLowerCase()}
                  statusMap={appointmentStatusMap}
                  size="sm"
                />
              </View>
              <View className="flex-row items-center gap-1 mt-0.5">
                <Stethoscope size={12} color="#2563eb" />
                <Text className="text-sm text-blue-600 font-medium">
                  {a.doctor?.specialty}
                </Text>
              </View>
              <View className="flex-row flex-wrap items-center gap-3 mt-2">
                <View className="flex-row items-center gap-1">
                  <CalendarIcon size={11} color="#94a3b8" />
                  <Text className="text-xs text-slate-500">
                    {fmtMedDate(a.date)}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Clock size={11} color="#94a3b8" />
                  <Text className="text-xs text-slate-500">{a.time}</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  {modalityIcon(a.modality, 11, '#94a3b8')}
                  <Text className="text-xs text-slate-500">
                    {MODALITY_LABEL[a.modality]}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex-row items-center justify-between">
            <Text className="text-xs text-slate-400 uppercase tracking-wider">
              Precio
            </Text>
            <Text className="text-xl font-bold text-slate-800 dark:text-white">
              ${a.price.toFixed(2)}
            </Text>
          </View>

          {a.notes ? (
            <View className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Text className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                Notas
              </Text>
              <Text className="text-sm text-slate-700 dark:text-slate-300">
                {a.notes}
              </Text>
            </View>
          ) : null}
        </SectionCard>

        {/* Payment status */}
        {a.status === 'PENDING' &&
        (!a.payment || a.payment.status === 'PENDING') ? (
          <PaymentCard appointment={a} onConfirmed={refetch} />
        ) : null}

        {a.payment && a.payment.status === 'PAID' ? (
          <View className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3 flex-row items-center gap-2">
            <CheckCircle size={16} color="#10b981" />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Pago confirmado
              </Text>
              <Text className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                ${a.payment.amount.toFixed(2)} ·{' '}
                {a.payment.paidAt
                  ? new Date(a.payment.paidAt).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                    })
                  : ''}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Online video link */}
        {a.modality === 'ONLINE' && a.meetingUrl ? (
          <SectionCard>
            <View className="flex-row items-center gap-2 mb-2">
              <Video size={16} color="#2563eb" />
              <Text className="font-semibold text-slate-800 dark:text-white">
                Videollamada
              </Text>
            </View>
            <Text className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              Abrí el enlace 5 minutos antes de la hora.
            </Text>
            <Button
              onPress={() => a.meetingUrl && Linking.openURL(a.meetingUrl)}
              fullWidth>
              <View className="flex-row items-center gap-2">
                <Video size={15} color="#fff" />
                <Text className="text-white text-base font-semibold">
                  Unirme a la videollamada
                </Text>
              </View>
            </Button>
          </SectionCard>
        ) : null}

        {/* Chat link */}
        {a.modality === 'CHAT' ? (
          <SectionCard>
            <View className="flex-row items-center gap-2 mb-2">
              <MessageSquare size={16} color="#10b981" />
              <Text className="font-semibold text-slate-800 dark:text-white">
                Chat en vivo
              </Text>
            </View>
            <Text className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              Abrí la sala privada para escribirte con {peerName}.
            </Text>
            <Pressable
              onPress={() =>
                router.push(
                  `/(main)/(patient)/appointment/${a.id}/chat` as never,
                )
              }
              className="flex-row items-center justify-center gap-2 bg-emerald-600 active:bg-emerald-700 py-3 rounded-2xl">
              <MessageSquare size={15} color="#fff" />
              <Text className="text-white text-base font-semibold">
                Abrir chat
              </Text>
            </Pressable>
          </SectionCard>
        ) : null}

        {/* Presencial */}
        {a.modality === 'PRESENCIAL' ? (
          <PresencialCard
            appointment={a}
            acting={acting}
            onCheckin={doCheckin}
            cleanAddress={cleanAddress || undefined}
            directionsUrl={directionsUrl}
            doctorPhone={profile?.phone}
            clinicPhone={a.clinic?.phone}
            closed={closed}
          />
        ) : null}

        {/* Medical record (read-only after COMPLETED) */}
        {a.status === 'COMPLETED' ? <MedicalRecordCard appointmentId={a.id} /> : null}

        {/* Cancel */}
        {cancellable ? (
          <Pressable
            onPress={handleCancel}
            disabled={acting}
            className="flex-row items-center justify-center gap-2 py-3 rounded-2xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 active:bg-rose-50">
            {acting ? (
              <ActivityIndicator size="small" color="#e11d48" />
            ) : (
              <X size={14} color="#e11d48" />
            )}
            <Text className="text-rose-600 text-sm font-semibold">
              Cancelar cita
            </Text>
          </Pressable>
        ) : null}

        {/* Timeline */}
        <SectionCard title="Línea de tiempo">
          <Timeline appointment={a} />
        </SectionCard>
      </View>
    </Screen>
  );
}

function PresencialCard({
  appointment,
  acting,
  onCheckin,
  cleanAddress,
  directionsUrl,
  doctorPhone,
  clinicPhone,
  closed,
}: {
  appointment: AppointmentDto;
  acting: boolean;
  onCheckin: (e: 'arrived' | 'patient_received' | 'no_show' | 'undo') => void;
  cleanAddress?: string;
  directionsUrl: string | null;
  doctorPhone?: string;
  clinicPhone?: string;
  closed: boolean;
}) {
  const arrived = !!appointment.patientArrivedAt;

  return (
    <SectionCard>
      <View className="flex-row items-center gap-2 mb-2">
        <MapPin size={16} color="#e11d48" />
        <Text className="font-semibold text-slate-800 dark:text-white">
          Consulta en consultorio
        </Text>
      </View>

      <View className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <View className="p-3 bg-slate-50 dark:bg-slate-800/50 flex-row items-start gap-2">
          <Building2 size={16} color="#64748b" />
          <View className="flex-1">
            <Text className="font-semibold text-slate-800 dark:text-white">
              {appointment.clinic?.name ?? 'Consultorio del médico'}
            </Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {cleanAddress ??
                'La dirección será confirmada por el consultorio.'}
            </Text>
          </View>
        </View>
        {directionsUrl ? (
          <Pressable
            onPress={() => Linking.openURL(directionsUrl)}
            className="flex-row items-center justify-center gap-1.5 py-3 bg-blue-50 dark:bg-blue-950/40 active:bg-blue-100">
            <Navigation2 size={14} color="#2563eb" />
            <Text className="text-blue-600 text-sm font-semibold">
              Cómo llegar
            </Text>
            <ExternalLink size={11} color="#2563eb" />
          </Pressable>
        ) : null}
      </View>

      {(doctorPhone || clinicPhone) ? (
        <View className="mt-3 border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-900">
          <View className="flex-row items-center gap-1.5 mb-2">
            <Phone size={11} color="#64748b" />
            <Text className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Contacto
            </Text>
          </View>
          {doctorPhone ? (
            <Pressable
              onPress={() =>
                Linking.openURL(`tel:${doctorPhone.replace(/\s+/g, '')}`)
              }
              className="flex-row items-center justify-between py-2 active:bg-slate-50">
              <View>
                <Text className="text-[10px] text-slate-400">Médico</Text>
                <Text className="text-sm text-slate-700 dark:text-slate-200">
                  {doctorPhone}
                </Text>
              </View>
              <Phone size={14} color="#2563eb" />
            </Pressable>
          ) : null}
          {clinicPhone && clinicPhone !== doctorPhone ? (
            <Pressable
              onPress={() =>
                Linking.openURL(`tel:${clinicPhone.replace(/\s+/g, '')}`)
              }
              className="flex-row items-center justify-between py-2 active:bg-slate-50">
              <View>
                <Text className="text-[10px] text-slate-400">Consultorio</Text>
                <Text className="text-sm text-slate-700 dark:text-slate-200">
                  {clinicPhone}
                </Text>
              </View>
              <Phone size={14} color="#2563eb" />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {!closed ? (
        <View className="mt-4">
          {arrived ? (
            <View className="flex-row items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3 py-3">
              <View className="flex-row items-center gap-2 flex-1">
                <CheckCircle size={16} color="#10b981" />
                <Text className="text-sm text-emerald-700 dark:text-emerald-300 flex-1">
                  Marcaste tu llegada. El médico fue notificado.
                </Text>
              </View>
              <Pressable
                onPress={() => onCheckin('undo')}
                disabled={acting}
                className="flex-row items-center gap-1">
                <RotateCcw size={11} color="#047857" />
                <Text className="text-xs font-semibold text-emerald-700">
                  Deshacer
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => onCheckin('arrived')}
              disabled={acting}
              className="flex-row items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 active:bg-emerald-700">
              {acting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <CheckCircle size={15} color="#fff" />
              )}
              <Text className="text-white text-base font-semibold">
                He llegado al consultorio
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View className="mt-4 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex-row items-center gap-2">
          <AlertCircle size={13} color="#64748b" />
          <Text className="text-xs text-slate-500">
            La cita ya finalizó · acciones deshabilitadas.
          </Text>
        </View>
      )}
    </SectionCard>
  );
}

function MedicalRecordCard({ appointmentId }: { appointmentId: string }) {
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<MedicalRecordDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await appointmentsApi.getMedicalRecord(appointmentId);
        if (!cancelled) setRecord(res.data);
      } catch (err: unknown) {
        if (!cancelled) {
          const status = (err as { response?: { status?: number } })?.response
            ?.status;
          if (status !== 404) {
            const msg =
              (err as { response?: { data?: { error?: { message?: string } } } })
                ?.response?.data?.error?.message ??
              'No se pudo cargar la ficha';
            setError(msg);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  if (loading) {
    return (
      <SectionCard title="Ficha de atención">
        <View className="py-3 items-center">
          <ActivityIndicator size="small" color="#2563eb" />
        </View>
      </SectionCard>
    );
  }

  if (error) {
    return (
      <SectionCard title="Ficha de atención">
        <Alert variant="error">{error}</Alert>
      </SectionCard>
    );
  }

  if (!record) {
    return (
      <SectionCard
        title="Ficha de atención"
        subtitle="El médico aún no completó la ficha de esta consulta.">
        <View />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Ficha de atención"
      subtitle="Resumen de la consulta">
      <RecordField label="Motivo de la consulta" value={record.reason} />
      {record.symptoms ? (
        <RecordField label="Síntomas" value={record.symptoms} />
      ) : null}
      {record.existingConditions ? (
        <RecordField
          label="Antecedentes"
          value={record.existingConditions}
        />
      ) : null}
      {record.diagnosis ? (
        <RecordField label="Diagnóstico" value={record.diagnosis} />
      ) : null}
      {record.treatment ? (
        <RecordField label="Tratamiento" value={record.treatment} />
      ) : null}
    </SectionCard>
  );
}

function RecordField({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-3">
      <Text className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </Text>
      <Text className="text-sm text-slate-700 dark:text-slate-200">
        {value}
      </Text>
    </View>
  );
}

function FinalizationPanel({
  appointment,
  acting,
  onConfirm,
}: {
  appointment: AppointmentDto;
  acting: boolean;
  onConfirm: () => void;
}) {
  const markedAt = appointment.doctorCompletedAt
    ? new Date(appointment.doctorCompletedAt).getTime()
    : Date.now();
  const deadline = markedAt + 24 * 60 * 60 * 1000;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const remainingMs = Math.max(0, deadline - now);
  const remainingH = Math.floor(remainingMs / 3_600_000);

  return (
    <View className="rounded-2xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/40 p-4 mb-3">
      <View className="flex-row items-start gap-2">
        <CheckCircle size={20} color="#d97706" />
        <View className="flex-1">
          <Text className="text-base font-bold text-amber-800 dark:text-amber-200">
            El médico marcó la consulta como atendida
          </Text>
          <Text className="text-sm text-amber-700 dark:text-amber-200 mt-1">
            Confirmá desde tu lado que la atención se realizó. Tenés ~
            {remainingH}h para responder antes del cierre automático.
          </Text>
          <Pressable
            onPress={onConfirm}
            disabled={acting}
            className="flex-row items-center justify-center gap-2 mt-3 bg-amber-600 active:bg-amber-700 py-3 rounded-xl">
            {acting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <CheckCircle size={15} color="#fff" />
            )}
            <Text className="text-white font-semibold">
              Confirmar atención
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function OngoingBanner({ appointment }: { appointment: AppointmentDto }) {
  const startedAt = useMemo(() => {
    if (appointment.doctorCheckedInAt) {
      return new Date(appointment.doctorCheckedInAt).getTime();
    }
    return Date.parse(`${appointment.date.slice(0, 10)}T${appointment.time}:00`);
  }, [appointment.doctorCheckedInAt, appointment.date, appointment.time]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsedMs = Math.max(0, now - startedAt);
  const hh = Math.floor(elapsedMs / 3_600_000);
  const mm = Math.floor((elapsedMs % 3_600_000) / 60_000);
  const ss = Math.floor((elapsedMs % 60_000) / 1000);
  const timer = `${hh > 0 ? String(hh).padStart(2, '0') + ':' : ''}${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;

  return (
    <View className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 p-4 mb-3">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
            CONSULTA EN CURSO
          </Text>
          <Text className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
            La cita está activa en este momento.
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-[10px] uppercase tracking-wider text-emerald-700/70 font-semibold">
            Tiempo
          </Text>
          <Text className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {timer}
          </Text>
        </View>
      </View>
    </View>
  );
}

function Timeline({ appointment: a }: { appointment: AppointmentDto }) {
  const items: {
    at?: string | null;
    label: string;
    done: boolean;
    tone: 'gray' | 'green' | 'blue' | 'red';
  }[] = [
    { at: a.createdAt, label: 'Cita reservada', done: true, tone: 'gray' },
    {
      at: a.patientArrivedAt,
      label: 'Llegaste al consultorio',
      done: !!a.patientArrivedAt,
      tone: 'blue',
    },
    {
      at: a.doctorCheckedInAt,
      label: 'Médico recibió al paciente',
      done: !!a.doctorCheckedInAt,
      tone: 'blue',
    },
    {
      label:
        a.status === 'COMPLETED'
          ? 'Consulta atendida'
          : a.status === 'CANCELLED'
            ? 'Cita cancelada'
            : a.status === 'NO_SHOW'
              ? 'Inasistencia'
              : 'Consulta en curso',
      done: ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status),
      tone:
        a.status === 'CANCELLED' || a.status === 'NO_SHOW'
          ? 'red'
          : a.status === 'COMPLETED'
            ? 'green'
            : 'gray',
    },
  ];

  const dotColor = (done: boolean, tone: typeof items[number]['tone']) => {
    if (!done) return '#cbd5e1';
    if (tone === 'green') return '#10b981';
    if (tone === 'blue') return '#3b82f6';
    if (tone === 'red') return '#ef4444';
    return '#94a3b8';
  };

  return (
    <View className="pl-3 border-l-2 border-slate-200 dark:border-slate-700 ml-1">
      {items.map((it, idx) => (
        <View key={idx} className="flex-row items-start gap-3 mb-3">
          <View
            className="w-3 h-3 rounded-full -ml-[19px] mt-1"
            style={{ backgroundColor: dotColor(it.done, it.tone) }}
          />
          <View className="flex-1 -ml-[10px]">
            <Text
              className={`text-sm ${
                it.done
                  ? 'text-slate-800 dark:text-white font-medium'
                  : 'text-slate-400'
              }`}>
              {it.label}
            </Text>
            {it.at ? (
              <Text className="text-[10px] text-slate-400 mt-0.5">
                {new Date(it.at).toLocaleString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function PaymentCard({
  appointment,
  onConfirmed,
}: {
  appointment: AppointmentDto;
  onConfirmed: () => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const expiresAt = appointment.payment?.expiresAt
    ? new Date(appointment.payment.expiresAt).getTime()
    : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const minutesLeft = expiresAt
    ? Math.max(0, Math.floor((expiresAt - now) / 60_000))
    : null;

  const openCheckout = () => {
    router.push(
      `/(main)/(patient)/payment/checkout/${appointment.id}` as never,
    );
  };

  /**
   * "Ya pagué" — confirma manualmente. Útil cuando:
   *   - Estás en modo dev (sin credenciales PayPhone) y querés
   *     simular el pago end-to-end.
   *   - El redirect post-pago del WebView falló (PayPhone confirmó
   *     pero la app no recibió la señal), y querés cerrar la cita.
   *
   * Pasamos `fakeOk: true` para que el backend apruebe sin re-pegarle
   * a PayPhone — sólo útil para casos de recuperación o desarrollo.
   * En producción real con credenciales válidas, este flujo
   * idealmente no se necesita.
   */
  const handleManualConfirm = () => {
    RNAlert.alert(
      'Confirmar pago',
      '¿Ya completaste el pago en PayPhone? Si tocaste "Pagar" y el banco aprobó la transacción pero la cita sigue como pendiente, esta acción la confirma manualmente.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, ya pagué',
          onPress: async () => {
            setConfirming(true);
            setConfirmError(null);
            try {
              await paymentApi.confirm(appointment.id, { fakeOk: true });
              onConfirmed();
            } catch (err: unknown) {
              const msg =
                (err as { response?: { data?: { error?: { message?: string } } } })
                  ?.response?.data?.error?.message ??
                'No se pudo confirmar el pago';
              setConfirmError(msg);
            } finally {
              setConfirming(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-800 p-4">
      <View className="flex-row items-center gap-2 mb-1">
        <CreditCard size={18} color="#d97706" />
        <Text className="text-base font-bold text-amber-800 dark:text-amber-200">
          Pago pendiente
        </Text>
      </View>
      <Text className="text-sm text-amber-700 dark:text-amber-300">
        Tu reserva está pendiente de pago. Si no se completa
        {minutesLeft !== null ? ` en ${minutesLeft} min` : ' a tiempo'}, el
        horario se libera automáticamente.
      </Text>

      <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
        <Text className="text-xs text-amber-700 dark:text-amber-300 uppercase tracking-wider font-semibold">
          Total
        </Text>
        <Text className="text-2xl font-bold text-amber-800 dark:text-amber-200">
          ${appointment.price.toFixed(2)}
        </Text>
      </View>

      {confirmError ? (
        <View className="mt-3">
          <Alert variant="error">{confirmError}</Alert>
        </View>
      ) : null}

      <Pressable
        onPress={openCheckout}
        disabled={confirming}
        className="flex-row items-center justify-center gap-2 mt-3 bg-amber-600 active:bg-amber-700 py-3 rounded-xl">
        <CreditCard size={15} color="#fff" />
        <Text className="text-white font-semibold">Pagar ahora</Text>
      </Pressable>

      <Pressable
        onPress={handleManualConfirm}
        disabled={confirming}
        className="flex-row items-center justify-center gap-2 mt-2 py-2.5 rounded-xl border border-amber-300 dark:border-amber-800">
        {confirming ? (
          <ActivityIndicator size="small" color="#d97706" />
        ) : (
          <CheckCircle size={14} color="#d97706" />
        )}
        <Text className="text-amber-700 dark:text-amber-300 text-sm font-semibold">
          Ya pagué — confirmar
        </Text>
      </Pressable>

      <Text className="text-[10px] text-amber-700/70 dark:text-amber-300/70 text-center mt-2">
        Si el banco confirmó la transacción pero la cita sigue pendiente,
        tocá "Ya pagué" para confirmarla.
      </Text>
    </View>
  );
}
