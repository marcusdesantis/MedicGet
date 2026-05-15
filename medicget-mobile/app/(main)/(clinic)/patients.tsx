/**
 * Clinic — Pacientes. Espejo del ClinicPatientsPage web.
 *
 * Lista los pacientes atendidos en la clínica con búsqueda server-side
 * (debounced). Cada row muestra contacto, edad, tipo de sangre y alergias.
 */

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import { AlertCircle, Mail, Phone, Users } from 'lucide-react-native';

import { Screen } from '@/components/ui/Screen';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { SectionCard } from '@/components/ui/SectionCard';
import { Avatar } from '@/components/ui/Avatar';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { patientsApi, type PatientDto } from '@/lib/api';
import { calcAge, profileInitials } from '@/lib/format';

function fullName(p?: { firstName?: string; lastName?: string }): string {
  return [p?.firstName, p?.lastName].filter(Boolean).join(' ') || '—';
}

export default function ClinicPatients() {
  const { user } = useAuth();
  const clinicId = user?.dto.clinic?.id ?? null;

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { state, refetch } = useApi(
    () =>
      patientsApi.list({
        clinicId: clinicId!,
        search: debounced || undefined,
        pageSize: 100,
      }),
    [clinicId, debounced],
  );

  if (!clinicId) {
    return (
      <Screen>
        <Alert variant="error">No se pudo identificar tu clínica.</Alert>
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader
        title="Pacientes"
        subtitle="Pacientes atendidos en tu clínica"
      />

      {state.status === 'ready' ? (
        <View className="flex-row gap-3 mb-3">
          <SummaryCard
            label="Total"
            value={state.data.meta.total}
            highlight={false}
          />
          <SummaryCard
            label="Página"
            value={`${state.data.meta.page} / ${state.data.meta.totalPages || 1}`}
            highlight={false}
          />
        </View>
      ) : null}

      <View className="mb-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre o email..."
        />
      </View>

      {state.status === 'loading' && (
        <View className="py-16 items-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      )}

      {state.status === 'error' && (
        <Alert variant="error">
          <Text className="text-rose-700 dark:text-rose-300 text-sm">
            {state.error.message}
          </Text>
          <Pressable onPress={refetch} className="mt-2">
            <Text className="text-indigo-600 text-xs font-semibold">
              Reintentar
            </Text>
          </Pressable>
        </Alert>
      )}

      {state.status === 'ready' && (
        <SectionCard noPadding>
          {state.data.data.length === 0 ? (
            <EmptyState
              title="Sin pacientes todavía"
              description="Cuando los pacientes se atiendan con tus médicos aparecerán aquí."
              icon={Users}
            />
          ) : (
            <View>
              {state.data.data.map((p) => (
                <PatientRow key={p.id} patient={p} />
              ))}
            </View>
          )}
        </SectionCard>
      )}
    </Screen>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | string;
  highlight: boolean;
}) {
  return (
    <View
      className={`flex-1 rounded-2xl border p-3 items-center ${
        highlight
          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
      }`}>
      <Text
        className={`text-xl font-bold ${
          highlight
            ? 'text-indigo-700 dark:text-indigo-300'
            : 'text-slate-800 dark:text-white'
        }`}>
        {value}
      </Text>
      <Text className="text-xs text-slate-400 mt-0.5">{label}</Text>
    </View>
  );
}

function PatientRow({ patient }: { patient: PatientDto }) {
  const profile = patient.user?.profile;
  const age = calcAge(patient.dateOfBirth);
  return (
    <View className="flex-row items-start gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <Avatar
        initials={profileInitials(profile, 'PT')}
        imageUrl={profile?.avatarUrl ?? null}
        size="md"
        variant="indigo"
      />
      <View className="flex-1 min-w-0">
        <Text
          numberOfLines={1}
          className="text-sm font-semibold text-slate-800 dark:text-white">
          {fullName(profile)}
        </Text>
        <View className="flex-row items-center gap-1 mt-0.5">
          <Mail size={11} color="#94a3b8" />
          <Text
            numberOfLines={1}
            className="text-xs text-slate-500 flex-1">
            {patient.user?.email ?? '—'}
          </Text>
        </View>
        {profile?.phone ? (
          <View className="flex-row items-center gap-1 mt-0.5">
            <Phone size={11} color="#94a3b8" />
            <Text className="text-xs text-slate-500">{profile.phone}</Text>
          </View>
        ) : null}
        <View className="flex-row items-center gap-3 mt-1">
          {age !== null ? (
            <Text className="text-[11px] text-slate-500">{age} años</Text>
          ) : null}
          {patient.bloodType ? (
            <View className="bg-rose-100 dark:bg-rose-900/30 px-1.5 py-0.5 rounded">
              <Text className="text-[10px] font-bold text-rose-700 dark:text-rose-300">
                {patient.bloodType}
              </Text>
            </View>
          ) : null}
        </View>
        {patient.allergies.length > 0 ? (
          <View className="flex-row items-start gap-1 mt-1.5">
            <AlertCircle size={11} color="#e11d48" />
            <Text
              numberOfLines={2}
              className="text-[11px] text-rose-600 flex-1">
              {patient.allergies.join(', ')}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
