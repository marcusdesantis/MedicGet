/**
 * Patient — Mi Historial Médico. Espejo del MedicalHistoryPage web.
 *
 * Secciones:
 *   1. Datos clínicos básicos (fecha de nacimiento, tipo de sangre,
 *      cuenta de consultas) — editable.
 *   2. Listas clínicas (alergias / condiciones / medicamentos) — chips
 *      editables con add/remove inline.
 *   3. Historial de consultas — citas COMPLETED ordenadas desc.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AlertCircle,
  Cake,
  Calendar as CalendarIcon,
  CheckCircle2,
  Droplet,
  Edit3,
  FileText,
  Heart,
  Loader2,
  Pill,
  Plus,
  Save,
  X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useApi } from '@/hooks/useApi';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { useAuth } from '@/context/AuthContext';
import { appointmentStatusMap } from '@/lib/statusConfig';
import {
  appointmentsApi,
  patientsApi,
  type AppointmentDto,
  type PatientDto,
} from '@/lib/api';
import { calcAge, combineDateTime, fmtLongDate, profileInitials } from '@/lib/format';

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as const;

export default function MedicalHistory() {
  const router = useRouter();
  const { user } = useAuth();
  const patientId = user?.dto.patient?.id ?? null;

  const patientState = useApi(
    () => patientsApi.getById(patientId!),
    [patientId],
  );
  const apptsState = useApi(
    () => appointmentsApi.list({ status: 'COMPLETED', pageSize: 100 }),
    [],
  );
  useRefetchOnFocus(patientState.refetch);
  useRefetchOnFocus(apptsState.refetch);

  if (!patientId) {
    return (
      <Screen>
        <PageHeader title="Historial médico" />
        <Alert variant="error">
          No se encontró tu perfil de paciente. Vuelve a iniciar sesión.
        </Alert>
      </Screen>
    );
  }

  if (patientState.state.status === 'loading') {
    return (
      <Screen>
        <PageHeader title="Historial médico" />
        <View className="py-20 items-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </Screen>
    );
  }

  if (patientState.state.status === 'error') {
    return (
      <Screen>
        <PageHeader title="Historial médico" />
        <Alert variant="error">
          <Text className="text-rose-700 dark:text-rose-300 text-sm">
            {patientState.state.error.message}
          </Text>
          <Pressable onPress={patientState.refetch} className="mt-2">
            <Text className="text-blue-600 text-xs font-semibold">
              Reintentar
            </Text>
          </Pressable>
        </Alert>
      </Screen>
    );
  }

  const patient = patientState.state.data;
  const consultsCount =
    apptsState.state.status === 'ready' ? apptsState.state.data.meta.total : 0;

  return (
    <Screen>
      <PageHeader
        title="Historial médico"
        subtitle="Tus datos clínicos y registro de consultas"
      />

      <View className="gap-4">
        <DemographicsCard
          patient={patient}
          consultsCount={consultsCount}
          onSaved={patientState.refetch}
        />

        <ClinicalList
          patientId={patient.id}
          field="allergies"
          label="Alergias"
          icon={<AlertCircle size={16} color="#e11d48" />}
          values={patient.allergies}
          placeholder="Ej. Penicilina"
          accent="rose"
          onSaved={patientState.refetch}
        />
        <ClinicalList
          patientId={patient.id}
          field="conditions"
          label="Condiciones"
          icon={<Heart size={16} color="#d97706" />}
          values={patient.conditions}
          placeholder="Ej. Hipertensión"
          accent="amber"
          onSaved={patientState.refetch}
        />
        <ClinicalList
          patientId={patient.id}
          field="medications"
          label="Medicamentos activos"
          icon={<Pill size={16} color="#2563eb" />}
          values={patient.medications}
          placeholder="Ej. Enalapril 10mg"
          accent="blue"
          onSaved={patientState.refetch}
        />

        <SectionCard
          title="Historial de consultas"
          subtitle="Citas que ya fueron atendidas"
          noPadding>
          {apptsState.state.status === 'loading' ? (
            <View className="py-10 items-center">
              <ActivityIndicator size="small" color="#2563eb" />
            </View>
          ) : apptsState.state.status === 'error' ? (
            <View className="p-4">
              <Alert variant="error">{apptsState.state.error.message}</Alert>
            </View>
          ) : apptsState.state.data.data.length === 0 ? (
            <EmptyState
              title="Aún no tenés consultas registradas"
              description="Cuando completes tu primera consulta, las notas aparecerán acá."
              icon={FileText}
              action={
                <Pressable
                  onPress={() => router.push('/(main)/(patient)/search')}>
                  <Text className="text-sm text-blue-600 font-semibold">
                    Buscar médicos →
                  </Text>
                </Pressable>
              }
            />
          ) : (
            <View>
              {apptsState.state.data.data
                .slice()
                .sort(
                  (a, b) =>
                    combineDateTime(b.date, b.time).getTime() -
                    combineDateTime(a.date, a.time).getTime(),
                )
                .map((appt) => (
                  <ConsultationItem key={appt.id} appt={appt} />
                ))}
            </View>
          )}
        </SectionCard>
      </View>
    </Screen>
  );
}

function DemographicsCard({
  patient,
  consultsCount,
  onSaved,
}: {
  patient: PatientDto;
  consultsCount: number;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [dob, setDob] = useState('');
  const [blood, setBlood] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasData = !!patient.dateOfBirth || !!patient.bloodType;
  const ageYears = calcAge(patient.dateOfBirth);

  useEffect(() => {
    setDob(patient.dateOfBirth ? patient.dateOfBirth.slice(0, 10) : '');
    setBlood(patient.bloodType ?? '');
  }, [patient.dateOfBirth, patient.bloodType]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await patientsApi.update(patient.id, {
        dateOfBirth: dob || undefined,
        bloodType: blood || undefined,
      } as Partial<PatientDto>);
      setEditing(false);
      onSaved();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo guardar';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDob(patient.dateOfBirth ? patient.dateOfBirth.slice(0, 10) : '');
    setBlood(patient.bloodType ?? '');
    setError(null);
    setEditing(false);
  };

  return (
    <SectionCard>
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-sm font-semibold text-slate-800 dark:text-white">
            Datos clínicos básicos
          </Text>
          <Text className="text-xs text-slate-400 mt-0.5">
            {hasData
              ? 'Esta información ayuda al médico a tener contexto antes de tu consulta.'
              : 'Completá tu fecha de nacimiento y tipo de sangre.'}
          </Text>
        </View>
        {!editing ? (
          <Pressable
            onPress={() => setEditing(true)}
            className="flex-row items-center gap-1">
            <Edit3 size={11} color="#2563eb" />
            <Text className="text-xs font-medium text-blue-600">
              {hasData ? 'Editar' : 'Completar'}
            </Text>
          </Pressable>
        ) : (
          <View className="flex-row gap-2">
            <Pressable
              onPress={save}
              disabled={saving}
              className="flex-row items-center gap-1 px-2 py-1 rounded">
              {saving ? (
                <ActivityIndicator size="small" color="#10b981" />
              ) : (
                <Save size={11} color="#10b981" />
              )}
              <Text className="text-xs font-semibold text-emerald-600">
                Guardar
              </Text>
            </Pressable>
            <Pressable
              onPress={cancel}
              disabled={saving}
              className="px-2 py-1 rounded">
              <Text className="text-xs font-medium text-slate-500">
                Cancelar
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {error ? (
        <View className="mt-3">
          <Alert variant="error">{error}</Alert>
        </View>
      ) : null}

      <View className="flex-row gap-4 mt-4">
        <View className="flex-1">
          <View className="flex-row items-center gap-1 mb-1">
            <Cake size={11} color="#94a3b8" />
            <Text className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Nacimiento
            </Text>
          </View>
          {editing ? (
            <TextInput
              value={dob}
              onChangeText={setDob}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white"
            />
          ) : (
            <View>
              <Text className="text-sm font-bold text-slate-800 dark:text-white">
                {patient.dateOfBirth
                  ? new Date(patient.dateOfBirth).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })
                  : '—'}
              </Text>
              {ageYears !== null ? (
                <Text className="text-xs text-slate-400">{ageYears} años</Text>
              ) : null}
            </View>
          )}
        </View>

        <View className="flex-1">
          <View className="flex-row items-center gap-1 mb-1">
            <Droplet size={11} color="#94a3b8" />
            <Text className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Tipo de sangre
            </Text>
          </View>
          {editing ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-1">
                <Pressable
                  onPress={() => setBlood('')}
                  className={`px-2.5 py-1.5 rounded-lg border ${
                    !blood
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}>
                  <Text className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    —
                  </Text>
                </Pressable>
                {BLOOD_TYPES.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setBlood(t)}
                    className={`px-2.5 py-1.5 rounded-lg border ${
                      blood === t
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}>
                    <Text
                      className={`text-[11px] font-medium ${
                        blood === t
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}>
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          ) : (
            <Text className="text-sm font-bold text-slate-800 dark:text-white">
              {patient.bloodType ?? '—'}
            </Text>
          )}
        </View>
      </View>

      <View className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex-row items-center gap-2">
        <FileText size={13} color="#94a3b8" />
        <Text className="text-xs text-slate-500">
          {consultsCount}{' '}
          {consultsCount === 1 ? 'consulta completada' : 'consultas completadas'}
        </Text>
      </View>
    </SectionCard>
  );
}

const ACCENT_BG: Record<string, string> = {
  rose: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800',
  amber:
    'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
};

const ACCENT_TEXT: Record<string, string> = {
  rose: 'text-rose-700 dark:text-rose-300',
  amber: 'text-amber-700 dark:text-amber-300',
  blue: 'text-blue-700 dark:text-blue-300',
};

const ACCENT_CHIP: Record<string, string> = {
  rose: 'bg-rose-100 dark:bg-rose-900/40',
  amber: 'bg-amber-100 dark:bg-amber-900/40',
  blue: 'bg-blue-100 dark:bg-blue-900/40',
};

interface ClinicalListProps {
  patientId: string;
  field: 'allergies' | 'conditions' | 'medications';
  label: string;
  icon: React.ReactNode;
  accent: 'rose' | 'amber' | 'blue';
  values: string[];
  placeholder: string;
  onSaved: () => void;
}

function ClinicalList({
  patientId,
  field,
  label,
  icon,
  accent,
  values,
  placeholder,
  onSaved,
}: ClinicalListProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(values);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.join('|'), editing]);

  const addItem = () => {
    const v = input.trim();
    if (!v || draft.includes(v)) {
      setInput('');
      return;
    }
    setDraft([...draft, v]);
    setInput('');
  };

  const removeItem = (item: string) =>
    setDraft(draft.filter((x) => x !== item));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await patientsApi.update(patientId, {
        [field]: draft,
      } as Partial<PatientDto>);
      setSavedFlash(true);
      onSaved();
      setEditing(false);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo guardar';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft(values);
    setInput('');
    setError(null);
    setEditing(false);
  };

  const items = editing ? draft : values;

  return (
    <View
      className={`border rounded-2xl p-4 ${ACCENT_BG[accent]}`}>
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          {icon}
          <Text className={`font-semibold text-sm ${ACCENT_TEXT[accent]}`}>
            {label}
          </Text>
        </View>
        {!editing ? (
          <Pressable
            onPress={() => setEditing(true)}
            className="flex-row items-center gap-1">
            <Edit3 size={11} color="#2563eb" />
            <Text className="text-xs font-medium text-blue-600">Editar</Text>
          </Pressable>
        ) : (
          <View className="flex-row gap-2">
            <Pressable
              onPress={save}
              disabled={saving}
              className="flex-row items-center gap-1">
              {saving ? (
                <ActivityIndicator size="small" color="#10b981" />
              ) : (
                <Save size={11} color="#10b981" />
              )}
              <Text className="text-xs font-semibold text-emerald-600">
                Guardar
              </Text>
            </Pressable>
            <Pressable onPress={cancel} disabled={saving}>
              <Text className="text-xs font-medium text-slate-500">
                Cancelar
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {savedFlash ? (
        <View className="flex-row items-center gap-1 mb-2">
          <CheckCircle2 size={11} color="#10b981" />
          <Text className="text-xs font-medium text-emerald-600">Guardado</Text>
        </View>
      ) : null}
      {error ? (
        <Text className="text-xs text-rose-600 mb-2">{error}</Text>
      ) : null}

      <View className="flex-row flex-wrap gap-2">
        {items.length === 0 ? (
          <Text className="text-xs text-slate-400 italic">
            {editing ? 'Aún no agregaste nada.' : 'Sin registros.'}
          </Text>
        ) : null}
        {items.map((item) => (
          <View
            key={item}
            className={`flex-row items-center gap-1 px-2.5 py-1 rounded-lg ${ACCENT_CHIP[accent]}`}>
            <Text
              className={`text-xs font-medium ${ACCENT_TEXT[accent]}`}>
              {item}
            </Text>
            {editing ? (
              <Pressable onPress={() => removeItem(item)} hitSlop={4}>
                <X size={10} color="#475569" />
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      {editing ? (
        <View className="flex-row gap-2 mt-3">
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={addItem}
            placeholder={placeholder}
            placeholderTextColor="#94a3b8"
            className="flex-1 px-3 py-2 rounded-lg border border-white/50 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white"
          />
          <Pressable
            onPress={addItem}
            disabled={!input.trim()}
            className={`w-10 h-10 rounded-lg items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 ${
              !input.trim() ? 'opacity-50' : ''
            }`}>
            <Plus size={14} color="#2563eb" />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function ConsultationItem({ appt }: { appt: AppointmentDto }) {
  const profile = appt.doctor?.user?.profile;
  const initials = profileInitials(profile, 'DR');
  const docName = `Dr. ${[profile?.firstName, profile?.lastName].filter(Boolean).join(' ')}`.trim();
  const date = combineDateTime(appt.date, appt.time);

  return (
    <View className="flex-row items-start gap-3 px-4 py-4 border-b border-slate-100 dark:border-slate-800">
      <Avatar initials={initials} size="md" variant="indigo" />
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-2 flex-wrap">
          <Text
            numberOfLines={1}
            className="font-semibold text-slate-800 dark:text-white flex-shrink">
            {docName}
          </Text>
          <StatusBadge
            status={appt.status.toLowerCase()}
            statusMap={appointmentStatusMap}
            size="sm"
          />
        </View>
        <Text className="text-xs text-blue-600 font-medium mt-0.5">
          {appt.doctor?.specialty ?? '—'}
        </Text>
        <View className="flex-row items-center gap-1 mt-0.5">
          <CalendarIcon size={10} color="#94a3b8" />
          <Text className="text-[11px] text-slate-400">
            {fmtLongDate(appt.date)} · {appt.time}
            {appt.clinic ? ` · ${appt.clinic.name}` : ''}
          </Text>
        </View>
        {appt.notes ? (
          <View className="mt-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2">
            <Text className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
              Notas del médico
            </Text>
            <Text className="text-sm text-slate-700 dark:text-slate-300">
              {appt.notes}
            </Text>
          </View>
        ) : (
          <Text className="mt-2 text-[11px] text-slate-400 italic">
            El médico no dejó notas para esta consulta.
          </Text>
        )}
      </View>
    </View>
  );
}
