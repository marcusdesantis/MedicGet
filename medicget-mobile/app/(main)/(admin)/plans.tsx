/**
 * Admin — Planes. Espejo del AdminPlansPage web.
 *
 * Lista los planes por audiencia (DOCTOR / CLINIC) y permite editar
 * nombre, precio, descripción, módulos y activar/desactivar.
 */

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Edit3, Eye, EyeOff, Save, X } from 'lucide-react-native';

import { Screen } from '@/components/ui/Screen';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { useApi } from '@/hooks/useApi';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { adminApi, type PlanDto } from '@/lib/api';

const KNOWN_MODULES: { key: string; label: string }[] = [
  { key: 'ONLINE', label: 'Videollamada' },
  { key: 'PRESENCIAL', label: 'Cita presencial' },
  { key: 'CHAT', label: 'Chat en vivo' },
  { key: 'REPORTS', label: 'Reportes avanzados' },
  { key: 'PRIORITY_SEARCH', label: 'Prioridad en búsqueda' },
  { key: 'BRANDING', label: 'Branding propio' },
  { key: 'PAYMENTS_DASHBOARD', label: 'Panel de pagos (clínica)' },
  { key: 'MULTI_LOCATION', label: 'Multi-sede (clínica)' },
  { key: 'PRIORITY_SUPPORT', label: 'Soporte prioritario' },
];

export default function AdminPlans() {
  const { state, refetch } = useApi(() => adminApi.listPlans(), []);
  useRefetchOnFocus(refetch);
  const [editing, setEditing] = useState<PlanDto | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const toggleActive = async (p: PlanDto) => {
    setTogglingId(p.id);
    try {
      await adminApi.updatePlan(p.id, { isActive: !p.isActive });
      refetch();
    } catch {
      /* ignore */
    } finally {
      setTogglingId(null);
    }
  };

  if (state.status === 'loading') {
    return (
      <Screen>
        <View className="py-16 items-center">
          <ActivityIndicator size="large" color="#e11d48" />
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
            <Text className="text-rose-600 text-xs font-semibold">
              Reintentar
            </Text>
          </Pressable>
        </Alert>
      </Screen>
    );
  }

  const doctorPlans = state.data.filter((p) => p.audience === 'DOCTOR');
  const clinicPlans = state.data.filter((p) => p.audience === 'CLINIC');

  return (
    <Screen>
      <PageHeader
        title="Planes"
        subtitle="Configurá precios y módulos de cada plan"
      />

      <View className="gap-4">
        <SectionCard title="Médicos" noPadding>
          {doctorPlans.length === 0 ? (
            <Text className="text-sm text-slate-400 py-4 text-center">
              Sin planes para médicos.
            </Text>
          ) : (
            <View>
              {doctorPlans.map((p) => (
                <PlanRow
                  key={p.id}
                  plan={p}
                  toggling={togglingId === p.id}
                  onToggle={() => toggleActive(p)}
                  onEdit={() => setEditing(p)}
                />
              ))}
            </View>
          )}
        </SectionCard>

        <SectionCard title="Clínicas" noPadding>
          {clinicPlans.length === 0 ? (
            <Text className="text-sm text-slate-400 py-4 text-center">
              Sin planes para clínicas.
            </Text>
          ) : (
            <View>
              {clinicPlans.map((p) => (
                <PlanRow
                  key={p.id}
                  plan={p}
                  toggling={togglingId === p.id}
                  onToggle={() => toggleActive(p)}
                  onEdit={() => setEditing(p)}
                />
              ))}
            </View>
          )}
        </SectionCard>
      </View>

      {editing ? (
        <EditPlanModal
          plan={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refetch();
          }}
        />
      ) : null}
    </Screen>
  );
}

function PlanRow({
  plan,
  toggling,
  onToggle,
  onEdit,
}: {
  plan: PlanDto;
  toggling: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  return (
    <View
      className={`px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 ${
        plan.isActive ? '' : 'opacity-60'
      }`}>
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text className="font-bold text-slate-800 dark:text-white">
              {plan.name}
            </Text>
            <View className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              <Text className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {plan.code}
              </Text>
            </View>
          </View>
          <Text className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
            ${plan.monthlyPrice.toFixed(2)}
            <Text className="text-xs font-normal text-slate-400">/mes</Text>
          </Text>
          {plan.description ? (
            <Text
              numberOfLines={2}
              className="text-xs text-slate-500 mt-1">
              {plan.description}
            </Text>
          ) : null}
        </View>
        <View className="gap-1">
          <Pressable
            onPress={onToggle}
            disabled={toggling}
            className="w-9 h-9 rounded-lg items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            hitSlop={4}>
            {toggling ? (
              <ActivityIndicator size="small" color="#94a3b8" />
            ) : plan.isActive ? (
              <Eye size={14} color="#475569" />
            ) : (
              <EyeOff size={14} color="#94a3b8" />
            )}
          </Pressable>
          <Pressable
            onPress={onEdit}
            className="w-9 h-9 rounded-lg items-center justify-center bg-rose-50 dark:bg-rose-900/20"
            hitSlop={4}>
            <Edit3 size={14} color="#e11d48" />
          </Pressable>
        </View>
      </View>

      {plan.modules.length > 0 ? (
        <View className="flex-row flex-wrap gap-1.5 mt-3">
          {plan.modules.map((m) => {
            const known = KNOWN_MODULES.find((k) => k.key === m);
            return (
              <View
                key={m}
                className="bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                <Text className="text-[10px] font-medium text-blue-700 dark:text-blue-300">
                  {known?.label ?? m}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function EditPlanModal({
  plan,
  onClose,
  onSaved,
}: {
  plan: PlanDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Partial<PlanDto>>({
    name: plan.name,
    description: plan.description ?? '',
    monthlyPrice: plan.monthlyPrice,
    modules: [...plan.modules],
    isActive: plan.isActive,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggleModule = (mod: string) => {
    const list = draft.modules ?? [];
    setDraft({
      ...draft,
      modules: list.includes(mod)
        ? list.filter((m) => m !== mod)
        : [...list, mod],
    });
  };

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      await adminApi.updatePlan(plan.id, {
        name: draft.name,
        description: draft.description,
        monthlyPrice: draft.monthlyPrice,
        modules: draft.modules,
        isActive: draft.isActive,
      });
      onSaved();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo guardar';
      setErr(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible
      title={`Editar — ${plan.name}`}
      onClose={onClose}
      footer={
        <Button onPress={save} loading={saving} fullWidth>
          <View className="flex-row items-center gap-2">
            <Save size={15} color="#fff" />
            <Text className="text-white font-semibold">Guardar plan</Text>
          </View>
        </Button>
      }>
      {err ? (
        <View className="mb-3">
          <Alert variant="error">{err}</Alert>
        </View>
      ) : null}

      <View className="gap-3">
        <FormField label="Nombre">
          <Input
            value={draft.name ?? ''}
            onChangeText={(t) => setDraft({ ...draft, name: t })}
          />
        </FormField>
        <FormField label="Precio mensual (USD)">
          <Input
            value={String(draft.monthlyPrice ?? 0)}
            onChangeText={(t) =>
              setDraft({ ...draft, monthlyPrice: Number(t) || 0 })
            }
            keyboardType="numeric"
          />
        </FormField>
        <FormField label="Descripción">
          <TextInput
            value={draft.description ?? ''}
            onChangeText={(t) => setDraft({ ...draft, description: t })}
            multiline
            numberOfLines={3}
            placeholder="Descripción visible en el pricing..."
            placeholderTextColor="#94a3b8"
            textAlignVertical="top"
            className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100 min-h-[80px]"
          />
        </FormField>

        <View>
          <Text className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
            Módulos incluidos
          </Text>
          <View className="gap-2">
            {KNOWN_MODULES.map((m) => {
              const checked = (draft.modules ?? []).includes(m.key);
              return (
                <Pressable
                  key={m.key}
                  onPress={() => toggleModule(m.key)}
                  className="flex-row items-center gap-2 py-1">
                  <Checkbox
                    checked={checked}
                    onChange={() => toggleModule(m.key)}
                  />
                  <Text className="text-sm text-slate-700 dark:text-slate-200">
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={() => setDraft({ ...draft, isActive: !draft.isActive })}
          className="flex-row items-center justify-between mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <View>
            <Text className="text-sm font-semibold text-slate-800 dark:text-white">
              Plan activo
            </Text>
            <Text className="text-xs text-slate-500 mt-0.5">
              Cuando está desactivado no aparece en la landing.
            </Text>
          </View>
          <View
            className={`w-11 h-6 rounded-full p-0.5 ${
              draft.isActive
                ? 'bg-emerald-500'
                : 'bg-slate-300 dark:bg-slate-700'
            }`}>
            <View
              className={`w-5 h-5 rounded-full bg-white ${
                draft.isActive ? 'translate-x-5' : ''
              }`}
            />
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}
