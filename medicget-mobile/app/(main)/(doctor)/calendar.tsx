/**
 * Doctor — Horarios disponibles. Espejo del DoctorCalendarPage web.
 *
 * El médico activa/desactiva días de la semana y define rangos
 * `startTime`/`endTime`. Cada save hace upsert por día activo
 * (`doctorsApi.upsertAvailability`). Los slots se generan en el backend
 * automáticamente cuando un paciente consulta horarios.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Save,
} from 'lucide-react-native';

import { Screen } from '@/components/ui/Screen';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { doctorsApi, type AvailabilityDto } from '@/lib/api';

const DAYS: { key: AvailabilityDto['dayOfWeek']; label: string }[] = [
  { key: 'MONDAY', label: 'Lunes' },
  { key: 'TUESDAY', label: 'Martes' },
  { key: 'WEDNESDAY', label: 'Miércoles' },
  { key: 'THURSDAY', label: 'Jueves' },
  { key: 'FRIDAY', label: 'Viernes' },
  { key: 'SATURDAY', label: 'Sábado' },
  { key: 'SUNDAY', label: 'Domingo' },
];

interface DayState {
  active: boolean;
  startTime: string;
  endTime: string;
}

const DEFAULT_DAY: DayState = {
  active: false,
  startTime: '09:00',
  endTime: '17:00',
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function DoctorCalendar() {
  const { user } = useAuth();
  const doctorId = user?.dto.doctor?.id ?? null;

  const initialState: Record<string, DayState> = useMemo(
    () =>
      DAYS.reduce((acc, d) => {
        acc[d.key] = { ...DEFAULT_DAY };
        return acc;
      }, {} as Record<string, DayState>),
    [],
  );

  const [days, setDays] = useState<Record<string, DayState>>(initialState);
  const [tplStart, setTplStart] = useState(DEFAULT_DAY.startTime);
  const [tplEnd, setTplEnd] = useState(DEFAULT_DAY.endTime);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { state, refetch } = useApi(
    () => doctorsApi.getAvailability(doctorId!),
    [doctorId],
  );

  useEffect(() => {
    if (state.status !== 'ready') return;
    const next: Record<string, DayState> = { ...initialState };
    state.data.forEach((a) => {
      next[a.dayOfWeek] = {
        active: a.isActive,
        startTime: a.startTime,
        endTime: a.endTime,
      };
    });
    setDays(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status === 'ready' ? state.data : null]);

  if (!doctorId) {
    return (
      <Screen>
        <Alert variant="error">
          No encontramos tu perfil de médico. Volvé a iniciar sesión o
          completá tu registro.
        </Alert>
      </Screen>
    );
  }

  if (state.status === 'loading') {
    return (
      <Screen>
        <View className="py-16 items-center">
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      </Screen>
    );
  }

  if (state.status === 'error') {
    return (
      <Screen>
        <Alert variant="error">
          <Text className="text-rose-700 dark:text-rose-300 text-sm">
            {state.error.message}
          </Text>
          <Pressable onPress={refetch} className="mt-2">
            <Text className="text-teal-600 text-xs font-semibold">
              Reintentar
            </Text>
          </Pressable>
        </Alert>
      </Screen>
    );
  }

  const updateDay = (key: string, patch: Partial<DayState>) => {
    setDays((prev) => ({ ...prev, [key]: { ...prev[key]!, ...patch } }));
    setSaveSuccess(false);
  };

  const tplValid =
    TIME_RE.test(tplStart) && TIME_RE.test(tplEnd) && tplStart < tplEnd;
  const activeCountForTpl = DAYS.filter(({ key }) => days[key]?.active).length;

  const applyTemplate = () => {
    if (!tplValid) return;
    setDays((prev) => {
      const next = { ...prev };
      for (const { key } of DAYS) {
        const d = next[key];
        if (!d?.active) continue;
        next[key] = { ...d, startTime: tplStart, endTime: tplEnd };
      }
      return next;
    });
    setSaveSuccess(false);
  };

  const allDaysValid = DAYS.every(({ key }) => {
    const d = days[key];
    if (!d?.active) return true;
    return TIME_RE.test(d.startTime) && TIME_RE.test(d.endTime) && d.startTime < d.endTime;
  });

  const handleSave = async () => {
    if (!allDaysValid || !doctorId) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      for (const { key } of DAYS) {
        const d = days[key];
        if (!d?.active) continue;
        await doctorsApi.upsertAvailability(doctorId, {
          dayOfWeek: key,
          startTime: d.startTime,
          endTime: d.endTime,
          isActive: true,
        });
      }
      setSaveSuccess(true);
      refetch();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ??
        'No se pudo guardar tu disponibilidad';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const activeDayCount = DAYS.filter(({ key }) => days[key]?.active).length;

  return (
    <Screen>
      <PageHeader
        title="Mis horarios"
        subtitle="Configura los días y horas en que aceptas consultas"
      />

      <Alert variant="info">
        <Text className="text-sm text-blue-700 dark:text-blue-300">
          Activá los días de la semana y elegí el rango horario. El sistema
          genera los espacios automáticamente cuando un paciente busca tus
          horarios.
        </Text>
      </Alert>

      <View className="mt-4">
        <SectionCard
          title="Plantilla rápida"
          subtitle="Aplicá un rango a todos los días marcados">
          <View className="flex-row items-center gap-2">
            <TimeInput
              value={tplStart}
              onChange={(v) => {
                setTplStart(v);
                setSaveSuccess(false);
              }}
            />
            <Text className="text-sm text-slate-400">a</Text>
            <TimeInput
              value={tplEnd}
              onChange={(v) => {
                setTplEnd(v);
                setSaveSuccess(false);
              }}
            />
          </View>
          {!tplValid ? (
            <View className="flex-row items-center gap-1 mt-2">
              <AlertCircle size={11} color="#e11d48" />
              <Text className="text-[11px] text-rose-600">
                Formato HH:MM y el inicio debe ser anterior al fin.
              </Text>
            </View>
          ) : null}
          <Pressable
            onPress={applyTemplate}
            disabled={!tplValid || activeCountForTpl === 0}
            className={`mt-3 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-900 ${
              !tplValid || activeCountForTpl === 0 ? 'opacity-50' : ''
            }`}>
            <Copy size={13} color="#0d9488" />
            <Text className="text-teal-700 text-xs font-semibold">
              Aplicar a{' '}
              {activeCountForTpl === 0
                ? 'días marcados'
                : `${activeCountForTpl} día${activeCountForTpl === 1 ? '' : 's'}`}
            </Text>
          </Pressable>
        </SectionCard>
      </View>

      <View className="mt-4">
        <SectionCard
          title="Horario semanal"
          subtitle={`${activeDayCount} ${
            activeDayCount === 1 ? 'día activo' : 'días activos'
          }`}
          noPadding>
          {DAYS.map(({ key, label }) => {
            const d = days[key]!;
            const invalid =
              d.active &&
              (!TIME_RE.test(d.startTime) ||
                !TIME_RE.test(d.endTime) ||
                d.startTime >= d.endTime);
            return (
              <View
                key={key}
                className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2 flex-1">
                    <Checkbox
                      checked={d.active}
                      onChange={(next) => updateDay(key, { active: next })}
                    />
                    <Text
                      className={`font-medium ${
                        d.active
                          ? 'text-slate-800 dark:text-white'
                          : 'text-slate-400'
                      }`}>
                      {label}
                    </Text>
                  </View>
                  {d.active ? (
                    <View className="flex-row items-center gap-2">
                      <TimeInput
                        value={d.startTime}
                        onChange={(v) => updateDay(key, { startTime: v })}
                      />
                      <Text className="text-xs text-slate-400">a</Text>
                      <TimeInput
                        value={d.endTime}
                        onChange={(v) => updateDay(key, { endTime: v })}
                      />
                    </View>
                  ) : null}
                </View>
                {invalid ? (
                  <View className="flex-row items-center gap-1 mt-2 ml-7">
                    <AlertCircle size={11} color="#e11d48" />
                    <Text className="text-[11px] text-rose-600">
                      Formato HH:MM y el inicio debe ser anterior al fin.
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </SectionCard>
      </View>

      {saveError ? (
        <View className="mt-3">
          <Alert variant="error">{saveError}</Alert>
        </View>
      ) : null}
      {saveSuccess ? (
        <View className="mt-3">
          <Alert variant="success">
            <View className="flex-row items-center gap-2">
              <CheckCircle2 size={14} color="#10b981" />
              <Text className="text-emerald-700 dark:text-emerald-300 text-sm flex-1">
                Disponibilidad guardada. Los pacientes ya ven tus horarios.
              </Text>
            </View>
          </Alert>
        </View>
      ) : null}

      <View className="mt-4">
        <Button
          onPress={handleSave}
          disabled={!allDaysValid || saving}
          loading={saving}
          variant="success"
          fullWidth>
          <View className="flex-row items-center gap-2">
            <Save size={16} color="#fff" />
            <Text className="text-white text-base font-semibold">
              Guardar cambios
            </Text>
          </View>
        </Button>
      </View>
    </Screen>
  );
}

function TimeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder="HH:MM"
      placeholderTextColor="#94a3b8"
      maxLength={5}
      keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-sm text-slate-800 dark:text-white w-16 text-center"
    />
  );
}
