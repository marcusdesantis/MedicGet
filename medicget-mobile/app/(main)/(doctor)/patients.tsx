/**
 * Doctor — Historial de pacientes. Espejo del PatientHistoryPage web.
 *
 * Lista paginada de pacientes atendidos (agregada en cliente desde el
 * stream de citas, igual que la web). Tap en un paciente abre detalle
 * con datos clínicos, próxima cita y línea de visitas.
 */

import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronRight,
  FileText,
  Heart,
  Pill,
  Users,
  X,
} from 'lucide-react-native';

import { Screen } from '@/components/ui/Screen';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { SectionCard } from '@/components/ui/SectionCard';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { useApi } from '@/hooks/useApi';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { appointmentStatusMap } from '@/lib/statusConfig';
import { combineDateTime, fmtMedDate } from '@/lib/format';
import {
  appointmentsApi,
  patientsApi,
  type AppointmentDto,
  type PatientDto,
} from '@/lib/api';

interface PatientSummary {
  patientId: string;
  fullName: string;
  email?: string;
  initials: string;
  avatarUrl?: string | null;
  visits: number;
  completed: number;
  lastVisit: Date | null;
  nextVisit: Date | null;
  appointments: AppointmentDto[];
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function summariseByPatient(list: AppointmentDto[]): PatientSummary[] {
  const map = new Map<string, PatientSummary>();
  const now = Date.now();

  for (const appt of list) {
    const id = appt.patient?.id;
    if (!id) continue;
    const profile = appt.patient.user?.profile;
    const name =
      [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') ||
      'Paciente';
    const initials =
      ((profile?.firstName?.[0] ?? '') + (profile?.lastName?.[0] ?? '')).toUpperCase() ||
      'PT';
    const apptDate = combineDateTime(appt.date, appt.time);

    const summary = map.get(id) ?? {
      patientId: id,
      fullName: name,
      email: (appt.patient as { user?: { email?: string } }).user?.email,
      initials,
      avatarUrl: profile?.avatarUrl ?? null,
      visits: 0,
      completed: 0,
      lastVisit: null,
      nextVisit: null,
      appointments: [],
    };

    summary.visits += 1;
    if (appt.status === 'COMPLETED') summary.completed += 1;
    if (
      apptDate.getTime() <= now &&
      (!summary.lastVisit || apptDate > summary.lastVisit)
    ) {
      summary.lastVisit = apptDate;
    }
    if (
      apptDate.getTime() > now &&
      appt.status !== 'CANCELLED' &&
      (!summary.nextVisit || apptDate < summary.nextVisit)
    ) {
      summary.nextVisit = apptDate;
    }
    summary.appointments.push(appt);
    map.set(id, summary);
  }

  return Array.from(map.values()).sort((a, b) => {
    const aTime = Math.max(
      a.lastVisit?.getTime() ?? 0,
      a.nextVisit?.getTime() ?? 0,
    );
    const bTime = Math.max(
      b.lastVisit?.getTime() ?? 0,
      b.nextVisit?.getTime() ?? 0,
    );
    return bTime - aTime;
  });
}

export default function DoctorPatients() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PatientSummary | null>(null);

  const { state, refetch } = useApi(
    () => appointmentsApi.list({ pageSize: 200 }),
    [],
  );
  useRefetchOnFocus(refetch);

  const patients = useMemo(
    () =>
      state.status === 'ready' ? summariseByPatient(state.data.data) : [],
    [state],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return patients;
    const q = normalize(search.trim());
    return patients.filter(
      (p) =>
        normalize(p.fullName).includes(q) ||
        (p.email && normalize(p.email).includes(q)),
    );
  }, [patients, search]);

  return (
    <Screen>
      <PageHeader
        title="Pacientes"
        subtitle="Pacientes que has atendido"
      />

      <View className="mb-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar paciente..."
        />
      </View>

      {state.status === 'loading' && (
        <View className="py-16 items-center">
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      )}

      {state.status === 'error' && (
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
      )}

      {state.status === 'ready' && (
        <SectionCard
          title={`Pacientes (${patients.length})`}
          noPadding>
          {filtered.length === 0 ? (
            <EmptyState
              title={
                patients.length === 0
                  ? 'Aún no atendiste a ningún paciente'
                  : 'Sin coincidencias'
              }
              description={
                patients.length === 0
                  ? 'Cuando completes una consulta, el paciente aparecerá acá.'
                  : 'Probá con otro término de búsqueda.'
              }
              icon={Users}
            />
          ) : (
            <View>
              {filtered.map((p) => (
                <Pressable
                  key={p.patientId}
                  onPress={() => setSelected(p)}
                  className="flex-row items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 active:bg-slate-50 dark:active:bg-slate-800/50">
                  <Avatar
                    initials={p.initials}
                    imageUrl={p.avatarUrl ?? null}
                    size="md"
                    variant="indigo"
                  />
                  <View className="flex-1 min-w-0">
                    <Text
                      numberOfLines={1}
                      className="text-sm font-semibold text-slate-800 dark:text-white">
                      {p.fullName}
                    </Text>
                    {p.email ? (
                      <Text
                        numberOfLines={1}
                        className="text-xs text-slate-400">
                        {p.email}
                      </Text>
                    ) : null}
                    <Text className="text-[11px] text-slate-500 mt-0.5">
                      {p.visits} visita{p.visits === 1 ? '' : 's'} · Última:{' '}
                      {p.lastVisit ? fmtMedDate(p.lastVisit.toISOString()) : '—'}
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#cbd5e1" />
                </Pressable>
              ))}
            </View>
          )}
        </SectionCard>
      )}

      {selected ? (
        <PatientDetailModal
          patient={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </Screen>
  );
}

function PatientDetailModal({
  patient,
  onClose,
}: {
  patient: PatientSummary;
  onClose: () => void;
}) {
  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet">
      <View className="flex-1 bg-slate-50 dark:bg-slate-950">
        <View className="flex-row items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <Text className="text-base font-semibold text-slate-800 dark:text-white">
            Detalle del paciente
          </Text>
          <Pressable onPress={onClose} hitSlop={6}>
            <X size={20} color="#475569" />
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-4 py-4">
          <View className="flex-row items-center gap-3">
            <Avatar
              initials={patient.initials}
              imageUrl={patient.avatarUrl ?? null}
              size="lg"
              shape="rounded"
              variant="indigo"
            />
            <View className="flex-1 min-w-0">
              <Text className="font-bold text-slate-800 dark:text-white">
                {patient.fullName}
              </Text>
              {patient.email ? (
                <Text className="text-xs text-slate-400">{patient.email}</Text>
              ) : null}
            </View>
          </View>

          <View className="flex-row gap-3 mt-4">
            <Stat label="Visitas" value={patient.visits} />
            <Stat label="Completadas" value={patient.completed} />
          </View>

          {patient.nextVisit ? (
            <View className="mt-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 px-3 py-2 flex-row items-center gap-2">
              <CalendarIcon size={12} color="#2563eb" />
              <Text className="text-xs text-blue-700 dark:text-blue-300">
                Próxima cita:{' '}
                <Text className="font-bold">
                  {fmtMedDate(patient.nextVisit.toISOString())}
                </Text>
              </Text>
            </View>
          ) : null}

          <ClinicalInfo patientId={patient.patientId} />

          <View className="mt-5">
            <Text className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Historial de citas
            </Text>
            {patient.appointments
              .slice()
              .sort(
                (a, b) =>
                  combineDateTime(b.date, b.time).getTime() -
                  combineDateTime(a.date, a.time).getTime(),
              )
              .map((appt) => (
                <View
                  key={appt.id}
                  className="flex-row items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 mb-2">
                  <FileText size={14} color="#0d9488" />
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <Text className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {fmtMedDate(appt.date)} · {appt.time}
                      </Text>
                      <StatusBadge
                        status={appt.status.toLowerCase()}
                        statusMap={appointmentStatusMap}
                        size="sm"
                      />
                    </View>
                    {appt.notes ? (
                      <Text className="text-xs text-slate-500 mt-1">
                        {appt.notes}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <View className="flex-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-3 items-center">
      <Text className="text-xl font-bold text-slate-800 dark:text-white">
        {value}
      </Text>
      <Text className="text-xs text-slate-400 mt-0.5">{label}</Text>
    </View>
  );
}

function ClinicalInfo({ patientId }: { patientId: string }) {
  const { state } = useApi<PatientDto>(
    () => patientsApi.getById(patientId),
    [patientId],
  );

  if (state.status === 'loading') {
    return (
      <View className="mt-4 py-3 items-center">
        <ActivityIndicator size="small" color="#94a3b8" />
      </View>
    );
  }
  if (state.status === 'error') return null;

  const p = state.data;
  const hasAny =
    p.allergies.length > 0 ||
    p.conditions.length > 0 ||
    p.medications.length > 0 ||
    p.bloodType;

  if (!hasAny) {
    return (
      <Text className="mt-4 text-xs text-slate-400 italic">
        El paciente todavía no completó su información clínica.
      </Text>
    );
  }

  const lists: {
    label: string;
    icon: React.ReactNode;
    items: string[];
    chipBg: string;
    chipText: string;
  }[] = [
    {
      label: 'Alergias',
      icon: <AlertCircle size={11} color="#e11d48" />,
      items: p.allergies,
      chipBg: 'bg-rose-100 dark:bg-rose-900/40',
      chipText: 'text-rose-700 dark:text-rose-300',
    },
    {
      label: 'Condiciones',
      icon: <Heart size={11} color="#d97706" />,
      items: p.conditions,
      chipBg: 'bg-amber-100 dark:bg-amber-900/40',
      chipText: 'text-amber-700 dark:text-amber-300',
    },
    {
      label: 'Medicamentos',
      icon: <Pill size={11} color="#2563eb" />,
      items: p.medications,
      chipBg: 'bg-blue-100 dark:bg-blue-900/40',
      chipText: 'text-blue-700 dark:text-blue-300',
    },
  ];

  return (
    <View className="mt-4 gap-3">
      {p.bloodType ? (
        <View className="flex-row items-center gap-2">
          <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Tipo de sangre:
          </Text>
          <View className="px-2 py-1 rounded-md bg-rose-600">
            <Text className="text-xs font-bold text-white">{p.bloodType}</Text>
          </View>
        </View>
      ) : null}
      {lists.map((l) =>
        l.items.length > 0 ? (
          <View key={l.label}>
            <View className="flex-row items-center gap-1 mb-1.5">
              {l.icon}
              <Text className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {l.label}
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-1.5">
              {l.items.map((item) => (
                <View
                  key={item}
                  className={`px-2 py-0.5 rounded-md ${l.chipBg}`}>
                  <Text className={`text-xs font-medium ${l.chipText}`}>
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null,
      )}
    </View>
  );
}
