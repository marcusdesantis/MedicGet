/**
 * Patient Search — espejo del SearchDoctorsPage web. Lista médicos con
 * filtros (texto libre, especialidad y disponibilidad). Tap en una card
 * navega a la pantalla de detalle/reserva.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  Filter,
  Star,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { useApi } from '@/hooks/useApi';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { doctorsApi, type DoctorDto } from '@/lib/api';
import { DEFAULT_SPECIALTIES } from '@/lib/specialties';
import { profileInitials } from '@/lib/format';

function doctorFullName(d: DoctorDto): string {
  const p = d.user?.profile;
  return `Dr. ${[p?.firstName, p?.lastName].filter(Boolean).join(' ')}`.trim();
}

export default function SearchDoctors() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [specialtyOpen, setSpecialtyOpen] = useState(false);

  // Debounce free-text para no spamear el API.
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const filters = useMemo(
    () => ({
      search: debouncedQuery || undefined,
      specialty: specialty || undefined,
      available: onlyAvailable ? 'true' : undefined,
    }),
    [debouncedQuery, specialty, onlyAvailable],
  );

  const { state, refetch } = useApi(
    () => doctorsApi.list(filters),
    [debouncedQuery, specialty, onlyAvailable],
  );
  useRefetchOnFocus(refetch);

  return (
    <Screen>
      <PageHeader
        title="Buscar médicos"
        subtitle="Encuentra al especialista que necesitas"
      />

      <View className="gap-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Nombre o especialidad..."
        />
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => setSpecialtyOpen(true)}
            className="flex-1 flex-row items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 h-12">
            <Text
              numberOfLines={1}
              className={`text-sm flex-1 ${
                specialty
                  ? 'text-slate-800 dark:text-slate-100'
                  : 'text-slate-400'
              }`}>
              {specialty || 'Todas las especialidades'}
            </Text>
            <ChevronDown size={16} color="#94a3b8" />
          </Pressable>
          <Pressable
            onPress={() => setOnlyAvailable((v) => !v)}
            className={`flex-row items-center gap-1.5 px-3 h-12 rounded-2xl border ${
              onlyAvailable
                ? 'bg-blue-600 border-blue-600'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
            }`}>
            <Filter
              size={14}
              color={onlyAvailable ? '#fff' : '#475569'}
            />
            <Text
              className={`text-xs font-medium ${
                onlyAvailable ? 'text-white' : 'text-slate-600 dark:text-slate-300'
              }`}>
              Disponibles
            </Text>
          </Pressable>
        </View>
      </View>

      {state.status === 'loading' && (
        <View className="py-16 items-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      )}

      {state.status === 'error' && (
        <View className="mt-4">
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
        </View>
      )}

      {state.status === 'ready' && (
        <View className="mt-4 gap-3">
          <Text className="text-xs text-slate-500 dark:text-slate-400">
            {state.data.data.length}{' '}
            {state.data.data.length === 1
              ? 'médico encontrado'
              : 'médicos encontrados'}
          </Text>

          {state.data.data.length === 0 ? (
            <EmptyState
              title="Sin resultados"
              description="Probá quitando filtros o buscando con otra palabra."
            />
          ) : (
            state.data.data.map((doc) => (
              <DoctorCard
                key={doc.id}
                doc={doc}
                onPress={() =>
                  router.push(`/(main)/(patient)/doctor/${doc.id}` as never)
                }
              />
            ))
          )}
        </View>
      )}

      <SpecialtyPicker
        visible={specialtyOpen}
        value={specialty}
        onSelect={(v) => {
          setSpecialty(v);
          setSpecialtyOpen(false);
        }}
        onClose={() => setSpecialtyOpen(false)}
      />
    </Screen>
  );
}

function DoctorCard({
  doc,
  onPress,
}: {
  doc: DoctorDto;
  onPress: () => void;
}) {
  const profile = doc.user?.profile;
  const initials = profileInitials(profile, 'DR');
  const disabled = !doc.available;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 ${
        disabled ? 'opacity-60' : 'active:bg-slate-50 dark:active:bg-slate-800'
      }`}>
      <View className="flex-row items-start gap-3">
        <Avatar
          initials={initials}
          imageUrl={profile?.avatarUrl ?? null}
          size="lg"
          shape="rounded"
          variant="blue"
        />
        <View className="flex-1 min-w-0">
          <Text
            numberOfLines={1}
            className="font-semibold text-slate-800 dark:text-white text-sm">
            {doctorFullName(doc)}
          </Text>
          <Text className="text-xs text-blue-600 font-medium mt-0.5">
            {doc.specialty}
          </Text>
          {doc.clinic ? (
            <Text numberOfLines={1} className="text-xs text-slate-400 mt-0.5">
              {doc.clinic.name}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="flex-row gap-2 mt-4">
        <Stat
          label="Rating"
          value={doc.rating > 0 ? `★ ${doc.rating.toFixed(1)}` : '—'}
          textClass="text-amber-500"
        />
        <Stat
          label="Precio"
          value={
            doc.pricePerConsult > 0
              ? `$${doc.pricePerConsult.toFixed(0)}`
              : 'Consultar'
          }
        />
        <Stat label="Exp." value={`${doc.experience}a`} />
      </View>

      <View className="flex-row items-center gap-3 mt-3">
        <View className="flex-row items-center gap-1">
          <Clock size={11} color="#94a3b8" />
          <Text className="text-xs text-slate-400">
            {doc.consultDuration} min
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Star size={11} color="#94a3b8" />
          <Text className="text-xs text-slate-400">
            {doc.reviewCount} reseñas
          </Text>
        </View>
      </View>

      <View
        className={`flex-row items-center justify-center gap-1.5 mt-4 py-3 rounded-xl ${
          doc.available ? 'bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'
        }`}>
        <Text
          className={`text-sm font-semibold ${
            doc.available ? 'text-white' : 'text-slate-500'
          }`}>
          {doc.available ? 'Ver perfil y reservar' : 'No disponible'}
        </Text>
        {doc.available ? <ArrowRight size={14} color="#fff" /> : null}
      </View>
    </Pressable>
  );
}

function Stat({
  label,
  value,
  textClass,
}: {
  label: string;
  value: string;
  textClass?: string;
}) {
  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-xl py-2 items-center">
      <Text className="text-[10px] text-slate-400">{label}</Text>
      <Text
        className={`text-sm font-bold ${
          textClass ?? 'text-slate-800 dark:text-white'
        }`}>
        {value}
      </Text>
    </View>
  );
}

interface SpecialtyPickerProps {
  visible: boolean;
  value: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}

function SpecialtyPicker({
  visible,
  value,
  onSelect,
  onClose,
}: SpecialtyPickerProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/40 justify-end">
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View className="bg-white dark:bg-slate-900 rounded-t-3xl pt-5 pb-8 max-h-[80%]">
            <View className="px-5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Text className="text-base font-semibold text-slate-800 dark:text-white">
                Especialidad
              </Text>
            </View>
            <ScrollView className="max-h-[60vh]">
              <Option
                label="Todas las especialidades"
                selected={value === ''}
                onPress={() => onSelect('')}
              />
              {DEFAULT_SPECIALTIES.map((s) => (
                <Option
                  key={s}
                  label={s}
                  selected={value === s}
                  onPress={() => onSelect(s)}
                />
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Option({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between px-5 py-3 active:bg-slate-50 dark:active:bg-slate-800">
      <Text
        className={`text-sm ${
          selected
            ? 'text-blue-600 font-semibold'
            : 'text-slate-700 dark:text-slate-200'
        }`}>
        {label}
      </Text>
      {selected ? <Check size={16} color="#2563eb" /> : null}
    </Pressable>
  );
}
