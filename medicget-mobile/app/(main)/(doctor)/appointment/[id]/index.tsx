/**
 * Doctor — Detalle de cita. Espejo del AppointmentDetailPage web filtrado
 * al rol médico.
 *
 *   • Hero (paciente, especialidad, fecha/hora, precio, notas).
 *   • Acciones modality-specific:
 *       - ONLINE  → "Unirme a la videollamada"
 *       - CHAT    → "Abrir chat"
 *       - PRESENCIAL → "Recibí al paciente" / "Inasistencia"
 *   • Confirmar/Atender/Cancelar (status updates).
 *   • Ficha de atención médica — editable (POST upsert).
 *   • Timeline.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert as RNAlert,
  Linking,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Building2,
  Calendar as CalendarIcon,
  Check,
  CheckCircle,
  Clock,
  ExternalLink,
  MapPin,
  MessageSquare,
  Save,
  Stethoscope,
  UserCheck,
  UserX,
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
import { appointmentStatusMap } from '@/lib/statusConfig';
import { fmtMedDate, profileInitials } from '@/lib/format';
import {
  appointmentsApi,
  type AppointmentDto,
  type AppointmentModality,
  type MedicalRecordDto,
  type MedicalRecordInput,
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

export default function DoctorAppointmentDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const { state, refetch } = useApi(
    () => appointmentsApi.getById(id!),
    [id],
  );

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
          ?.response?.data?.error?.message ??
        'No se pudo registrar la acción';
      setActionError(msg);
    } finally {
      setActing(false);
    }
  };

  const updateStatus = async (
    newStatus: 'UPCOMING' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW',
  ) => {
    if (!id) return;
    setActing(true);
    setActionError(null);
    try {
      await appointmentsApi.update(id, { status: newStatus });
      refetch();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ??
        'No se pudo actualizar la cita';
      setActionError(msg);
    } finally {
      setActing(false);
    }
  };

  const confirm = (title: string, msg: string, onConfirm: () => void, destructive = false) => {
    RNAlert.alert(title, msg, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sí',
        style: destructive ? 'destructive' : 'default',
        onPress: onConfirm,
      },
    ]);
  };

  if (state.status === 'loading') {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#0d9488" />
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
        <Alert variant="error">{state.error.message}</Alert>
      </Screen>
    );
  }

  const a = state.data;
  const profile = a.patient?.user?.profile;
  const patientName =
    `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() ||
    'Paciente';

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

      {a.status === 'ONGOING' && !a.doctorCompletedAt ? (
        <OngoingBanner appointment={a} />
      ) : null}

      <View className="gap-4">
        <SectionCard>
          <View className="flex-row items-start gap-3">
            <Avatar
              initials={profileInitials(profile, 'PT')}
              imageUrl={profile?.avatarUrl ?? null}
              size="lg"
              shape="rounded"
              variant="indigo"
            />
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-2 flex-wrap">
                <Text className="text-lg font-bold text-slate-800 dark:text-white">
                  {patientName}
                </Text>
                <StatusBadge
                  status={a.status.toLowerCase()}
                  statusMap={appointmentStatusMap}
                  size="sm"
                />
              </View>
              <View className="flex-row items-center gap-1 mt-0.5">
                <Stethoscope size={12} color="#0d9488" />
                <Text className="text-sm text-teal-600 font-medium">
                  Paciente
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
                Motivo de consulta del paciente
              </Text>
              <Text className="text-sm text-slate-700 dark:text-slate-300">
                {a.notes}
              </Text>
            </View>
          ) : null}
        </SectionCard>

        {/* Modality-specific quick actions */}
        {a.modality === 'ONLINE' && a.meetingUrl ? (
          <SectionCard>
            <View className="flex-row items-center gap-2 mb-2">
              <Video size={16} color="#2563eb" />
              <Text className="font-semibold text-slate-800 dark:text-white">
                Videollamada
              </Text>
            </View>
            <Button
              onPress={() => a.meetingUrl && Linking.openURL(a.meetingUrl)}
              fullWidth>
              <View className="flex-row items-center gap-2">
                <Video size={15} color="#fff" />
                <Text className="text-white text-base font-semibold">
                  Unirme a la consulta
                </Text>
              </View>
            </Button>
          </SectionCard>
        ) : null}

        {a.modality === 'CHAT' ? (
          <SectionCard>
            <View className="flex-row items-center gap-2 mb-2">
              <MessageSquare size={16} color="#10b981" />
              <Text className="font-semibold text-slate-800 dark:text-white">
                Chat en vivo
              </Text>
            </View>
            <Pressable
              onPress={() =>
                router.push(
                  `/(main)/(doctor)/appointment/${a.id}/chat` as never,
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

        {a.modality === 'PRESENCIAL' ? (
          <PresencialActions
            appointment={a}
            acting={acting}
            onCheckin={doCheckin}
            closed={closed}
          />
        ) : null}

        {/* Status actions */}
        {!closed ? (
          <SectionCard title="Acciones">
            <View className="gap-2">
              {a.status === 'PENDING' ? (
                <>
                  <Button
                    variant="success"
                    onPress={() =>
                      confirm(
                        'Confirmar cita',
                        `¿Confirmás la cita con ${patientName}?`,
                        () => updateStatus('UPCOMING'),
                      )
                    }
                    disabled={acting}
                    loading={acting}
                    fullWidth>
                    <View className="flex-row items-center gap-2">
                      <Check size={15} color="#fff" />
                      <Text className="text-white text-base font-semibold">
                        Confirmar cita
                      </Text>
                    </View>
                  </Button>
                  <Pressable
                    onPress={() =>
                      confirm(
                        'Rechazar cita',
                        'El paciente será notificado.',
                        () => updateStatus('CANCELLED'),
                        true,
                      )
                    }
                    disabled={acting}
                    className="flex-row items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-2xl py-3 active:bg-rose-50">
                    <X size={15} color="#e11d48" />
                    <Text className="text-rose-600 font-semibold">
                      Rechazar
                    </Text>
                  </Pressable>
                </>
              ) : null}
              {a.status === 'UPCOMING' || a.status === 'ONGOING' ? (
                <Button
                  variant="success"
                  onPress={() =>
                    confirm(
                      'Marcar como atendida',
                      'El paciente debe confirmar desde su lado para cerrar la cita.',
                      () => updateStatus('COMPLETED'),
                    )
                  }
                  disabled={acting}
                  loading={acting}
                  fullWidth>
                  <View className="flex-row items-center gap-2">
                    <CheckCircle size={15} color="#fff" />
                    <Text className="text-white text-base font-semibold">
                      Marcar consulta como atendida
                    </Text>
                  </View>
                </Button>
              ) : null}
            </View>
          </SectionCard>
        ) : null}

        <MedicalRecordEditor appointmentId={a.id} initialReason={a.notes ?? ''} />

        <SectionCard title="Línea de tiempo">
          <Timeline appointment={a} />
        </SectionCard>
      </View>
    </Screen>
  );
}

function PresencialActions({
  appointment,
  acting,
  onCheckin,
  closed,
}: {
  appointment: AppointmentDto;
  acting: boolean;
  onCheckin: (e: 'arrived' | 'patient_received' | 'no_show' | 'undo') => void;
  closed: boolean;
}) {
  const arrived = !!appointment.patientArrivedAt;
  const received = !!appointment.doctorCheckedInAt;

  return (
    <SectionCard>
      <View className="flex-row items-center gap-2 mb-2">
        <MapPin size={16} color="#e11d48" />
        <Text className="font-semibold text-slate-800 dark:text-white">
          Consulta presencial
        </Text>
      </View>

      <View className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50 flex-row items-start gap-2">
        <Building2 size={16} color="#64748b" />
        <View className="flex-1">
          <Text className="font-semibold text-slate-800 dark:text-white">
            {appointment.clinic?.name ?? 'Tu consultorio'}
          </Text>
          {appointment.clinic?.address ? (
            <Text className="text-sm text-slate-500">
              {appointment.clinic.address}
            </Text>
          ) : null}
        </View>
      </View>

      {arrived && !received ? (
        <View className="mt-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-3 flex-row items-center gap-2">
          <UserCheck size={16} color="#d97706" />
          <Text className="text-sm text-amber-700 dark:text-amber-300 flex-1">
            El paciente marcó su llegada · está en sala de espera.
          </Text>
        </View>
      ) : null}

      {!closed ? (
        <View className="mt-3 gap-2">
          {!received ? (
            <Button
              onPress={() => onCheckin('patient_received')}
              disabled={acting}
              loading={acting}
              fullWidth>
              <View className="flex-row items-center gap-2">
                <UserCheck size={15} color="#fff" />
                <Text className="text-white text-base font-semibold">
                  Recibí al paciente · iniciar consulta
                </Text>
              </View>
            </Button>
          ) : null}
          {appointment.status !== 'ONGOING' && appointment.status !== 'COMPLETED' ? (
            <Pressable
              onPress={() => onCheckin('no_show')}
              disabled={acting}
              className="flex-row items-center justify-center gap-2 bg-rose-50 dark:bg-rose-900/20 rounded-2xl py-3 active:bg-rose-100">
              <UserX size={15} color="#e11d48" />
              <Text className="text-rose-600 font-semibold">
                Marcar inasistencia
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </SectionCard>
  );
}

function MedicalRecordEditor({
  appointmentId,
  initialReason,
}: {
  appointmentId: string;
  initialReason: string;
}) {
  const [form, setForm] = useState<MedicalRecordInput>({
    reason: initialReason,
    symptoms: '',
    existingConditions: '',
    diagnosis: '',
    treatment: '',
    notes: '',
  });
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await appointmentsApi.getMedicalRecord(appointmentId);
        if (cancelled) return;
        const r: MedicalRecordDto = res.data;
        setForm({
          reason: r.reason,
          symptoms: r.symptoms ?? '',
          existingConditions: r.existingConditions ?? '',
          diagnosis: r.diagnosis ?? '',
          treatment: r.treatment ?? '',
          notes: r.notes ?? '',
        });
      } catch {
        /* 404 esperable cuando aún no se creó */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  const save = async () => {
    if (!form.reason.trim()) {
      setError('El motivo de la consulta es obligatorio.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await appointmentsApi.upsertMedicalRecord(appointmentId, {
        reason: form.reason.trim(),
        symptoms: form.symptoms?.trim() || undefined,
        existingConditions: form.existingConditions?.trim() || undefined,
        diagnosis: form.diagnosis?.trim() || undefined,
        treatment: form.treatment?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      });
      setSuccess(true);
      setEditing(false);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo guardar la atención';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <SectionCard title="Ficha de atención">
        <View className="py-3 items-center">
          <ActivityIndicator size="small" color="#0d9488" />
        </View>
      </SectionCard>
    );
  }

  const disabled = !editing && !!form.reason;

  return (
    <SectionCard
      title="Ficha de atención"
      subtitle={
        disabled
          ? 'Tocá Editar para modificar la ficha'
          : 'Completá los datos de la atención'
      }
      action={
        disabled ? (
          <Pressable onPress={() => setEditing(true)}>
            <Text className="text-xs font-semibold text-teal-600">Editar</Text>
          </Pressable>
        ) : null
      }>
      <View className="gap-3">
        <RecordField
          label="Motivo de la consulta *"
          value={form.reason}
          onChange={(v) => setForm({ ...form, reason: v })}
          disabled={disabled}
          rows={2}
          placeholder="¿Qué trae al paciente hoy?"
        />
        <RecordField
          label="Síntomas relatados"
          value={form.symptoms ?? ''}
          onChange={(v) => setForm({ ...form, symptoms: v })}
          disabled={disabled}
          rows={3}
          placeholder="Cefalea, fiebre, tos seca..."
        />
        <RecordField
          label="Antecedentes existentes"
          value={form.existingConditions ?? ''}
          onChange={(v) => setForm({ ...form, existingConditions: v })}
          disabled={disabled}
          rows={2}
        />
        <RecordField
          label="Diagnóstico / impresión clínica"
          value={form.diagnosis ?? ''}
          onChange={(v) => setForm({ ...form, diagnosis: v })}
          disabled={disabled}
          rows={2}
        />
        <RecordField
          label="Indicaciones / tratamiento"
          value={form.treatment ?? ''}
          onChange={(v) => setForm({ ...form, treatment: v })}
          disabled={disabled}
          rows={3}
        />
        <RecordField
          label="Notas privadas"
          value={form.notes ?? ''}
          onChange={(v) => setForm({ ...form, notes: v })}
          disabled={disabled}
          rows={2}
          placeholder="No se muestran al paciente."
        />
      </View>

      {error ? (
        <View className="mt-3">
          <Alert variant="error">{error}</Alert>
        </View>
      ) : null}
      {success ? (
        <View className="mt-3 flex-row items-center gap-2">
          <CheckCircle size={14} color="#10b981" />
          <Text className="text-sm text-emerald-600">Ficha guardada.</Text>
        </View>
      ) : null}

      {!disabled ? (
        <View className="mt-4 gap-2">
          <Button onPress={save} disabled={saving} loading={saving} variant="success" fullWidth>
            <View className="flex-row items-center gap-2">
              <Save size={15} color="#fff" />
              <Text className="text-white text-base font-semibold">
                Guardar ficha
              </Text>
            </View>
          </Button>
          {form.reason ? (
            <Pressable
              onPress={() => setEditing(false)}
              disabled={saving}
              className="py-3 items-center">
              <Text className="text-sm font-medium text-slate-500">
                Cancelar
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </SectionCard>
  );
}

function RecordField({
  label,
  value,
  onChange,
  disabled,
  rows = 2,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <View>
      <Text className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline
        numberOfLines={rows}
        editable={!disabled}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        textAlignVertical="top"
        className={`border rounded-xl px-3 py-2 text-sm ${
          disabled
            ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'
        }`}
        style={{ minHeight: rows * 24 + 16 }}
      />
    </View>
  );
}

function OngoingBanner({ appointment }: { appointment: AppointmentDto }) {
  const startedAt = useMemo(() => {
    if (appointment.doctorCheckedInAt) {
      return new Date(appointment.doctorCheckedInAt).getTime();
    }
    return Date.parse(
      `${appointment.date.slice(0, 10)}T${appointment.time}:00`,
    );
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
      label: 'Paciente llegó al consultorio',
      done: !!a.patientArrivedAt,
      tone: 'blue',
    },
    {
      at: a.doctorCheckedInAt,
      label: 'Recibiste al paciente',
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
