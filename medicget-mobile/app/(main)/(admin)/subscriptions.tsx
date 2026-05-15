/**
 * Admin — Suscripciones. Espejo del AdminSubscriptionsPage web.
 *
 * Listado filtrable por status con acciones: extender vencimiento y
 * cambiar plan.
 */

import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert as RNAlert,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Plus, Repeat } from 'lucide-react-native';

import { Screen } from '@/components/ui/Screen';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { SectionCard } from '@/components/ui/SectionCard';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { useApi } from '@/hooks/useApi';
import {
  adminApi,
  type PlanDto,
  type SubscriptionDto,
} from '@/lib/api';

const STATUS_TABS = ['Todas', 'Activas', 'Pendientes', 'Expiradas', 'Canceladas'] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const STATUS_FILTER: Record<StatusTab, string | undefined> = {
  Todas: undefined,
  Activas: 'ACTIVE',
  Pendientes: 'PENDING_PAYMENT',
  Expiradas: 'EXPIRED',
  Canceladas: 'CANCELLED',
};

const STATUS_LABEL: Record<string, { label: string; bg: string; text: string }> = {
  ACTIVE: {
    label: 'Activa',
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  EXPIRED: {
    label: 'Expirada',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
  },
  CANCELLED: {
    label: 'Cancelada',
    bg: 'bg-rose-100 dark:bg-rose-900/40',
    text: 'text-rose-700 dark:text-rose-300',
  },
  PENDING_PAYMENT: {
    label: 'Pendiente',
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    text: 'text-amber-700 dark:text-amber-300',
  },
};

export default function AdminSubscriptions() {
  const [tab, setTab] = useState<StatusTab>('Todas');
  const [extending, setExtending] = useState<SubscriptionDto | null>(null);
  const [changing, setChanging] = useState<SubscriptionDto | null>(null);

  const status = STATUS_FILTER[tab];

  const { state, refetch } = useApi(
    () => adminApi.subscriptions({ status, pageSize: 100 }),
    [status],
  );

  const plansQ = useApi(() => adminApi.listPlans(), []);
  const plans = plansQ.state.status === 'ready' ? plansQ.state.data : [];

  return (
    <Screen>
      <PageHeader
        title="Suscripciones"
        subtitle="Auditá pagos y extendé períodos"
      />

      <View className="mb-3">
        <Tabs
          tabs={[...STATUS_TABS]}
          active={tab}
          onChange={(v) => setTab(v as StatusTab)}
        />
      </View>

      {state.status === 'loading' && (
        <View className="py-16 items-center">
          <ActivityIndicator size="large" color="#e11d48" />
        </View>
      )}

      {state.status === 'error' && (
        <Alert variant="error">{state.error.message}</Alert>
      )}

      {state.status === 'ready' && (
        <SectionCard noPadding>
          {state.data.data.length === 0 ? (
            <EmptyState
              title="Sin suscripciones"
              description="Probá con otro filtro."
            />
          ) : (
            <View>
              {state.data.data.map((s) => (
                <SubscriptionRow
                  key={s.id}
                  subscription={s}
                  onExtend={() => setExtending(s)}
                  onChangePlan={() => setChanging(s)}
                />
              ))}
            </View>
          )}
        </SectionCard>
      )}

      {extending ? (
        <ExtendModal
          subscription={extending}
          onClose={() => setExtending(null)}
          onSaved={() => {
            setExtending(null);
            refetch();
          }}
        />
      ) : null}

      {changing ? (
        <ChangePlanModal
          subscription={changing}
          plans={plans}
          onClose={() => setChanging(null)}
          onSaved={() => {
            setChanging(null);
            refetch();
          }}
        />
      ) : null}
    </Screen>
  );
}

function SubscriptionRow({
  subscription: s,
  onExtend,
  onChangePlan,
}: {
  subscription: SubscriptionDto;
  onExtend: () => void;
  onChangePlan: () => void;
}) {
  const statusCfg = STATUS_LABEL[s.status] ?? {
    label: s.status,
    bg: 'bg-slate-100',
    text: 'text-slate-600',
  };

  const userName =
    `${s.user?.profile?.firstName ?? ''} ${s.user?.profile?.lastName ?? ''}`.trim() ||
    s.user?.email ||
    'Usuario';

  return (
    <View className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <View className="flex-row items-center gap-2 flex-wrap mb-1">
        <Text
          numberOfLines={1}
          className="text-sm font-semibold text-slate-800 dark:text-white flex-1">
          {userName}
        </Text>
        <View className={`px-2 py-0.5 rounded-full ${statusCfg.bg}`}>
          <Text className={`text-[10px] font-semibold ${statusCfg.text}`}>
            {statusCfg.label}
          </Text>
        </View>
      </View>
      <Text className="text-xs text-slate-500">{s.user?.email}</Text>
      <Text className="text-xs text-slate-700 dark:text-slate-300 mt-1">
        {s.plan?.name} ·{' '}
        <Text className="text-slate-400">
          ${(s.plan?.monthlyPrice ?? 0).toFixed(2)}/mes
        </Text>
      </Text>
      <Text className="text-[11px] text-slate-400 mt-0.5">
        Vence:{' '}
        {new Date(s.expiresAt).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}
      </Text>

      <View className="flex-row gap-2 mt-2">
        <Pressable
          onPress={onChangePlan}
          className="flex-row items-center gap-1.5 bg-purple-50 dark:bg-purple-900/20 px-3 py-2 rounded-lg">
          <Repeat size={13} color="#7c3aed" />
          <Text className="text-purple-700 text-xs font-semibold">
            Cambiar plan
          </Text>
        </Pressable>
        <Pressable
          onPress={onExtend}
          className="flex-row items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
          <Plus size={13} color="#2563eb" />
          <Text className="text-blue-700 text-xs font-semibold">
            Extender
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function ExtendModal({
  subscription,
  onClose,
  onSaved,
}: {
  subscription: SubscriptionDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [days, setDays] = useState('30');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    const n = Number(days);
    if (!Number.isFinite(n) || n <= 0) {
      setErr('Ingresá un número de días positivo.');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await adminApi.extendSubscription(subscription.id, n);
      onSaved();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo extender';
      setErr(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible
      title="Extender suscripción"
      onClose={onClose}
      footer={
        <Button onPress={submit} loading={saving} fullWidth>
          <View className="flex-row items-center gap-2">
            <Plus size={15} color="#fff" />
            <Text className="text-white font-semibold">Extender</Text>
          </View>
        </Button>
      }>
      {err ? (
        <View className="mb-3">
          <Alert variant="error">{err}</Alert>
        </View>
      ) : null}
      <Text className="text-sm text-slate-600 dark:text-slate-300 mb-3">
        Vence el{' '}
        <Text className="font-semibold">
          {new Date(subscription.expiresAt).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
      </Text>
      <FormField label="Días a sumar">
        <TextInput
          value={days}
          onChangeText={setDays}
          keyboardType="numeric"
          placeholder="30"
          placeholderTextColor="#94a3b8"
          className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-2xl px-3 h-12 text-base text-slate-800 dark:text-slate-100"
        />
      </FormField>
    </Modal>
  );
}

function ChangePlanModal({
  subscription,
  plans,
  onClose,
  onSaved,
}: {
  subscription: SubscriptionDto;
  plans: PlanDto[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selectedId, setSelectedId] = useState(subscription.planId);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const eligible = useMemo(
    () =>
      plans.filter(
        (p) => p.audience === subscription.plan?.audience && p.isActive,
      ),
    [plans, subscription.plan?.audience],
  );

  const isSame = selectedId === subscription.planId;

  const save = async () => {
    if (isSame) return;
    setSaving(true);
    setErr(null);
    try {
      await adminApi.changeSubscriptionPlan(subscription.id, selectedId);
      onSaved();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo cambiar el plan';
      setErr(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible
      title="Cambiar plan"
      onClose={onClose}
      footer={
        <Button
          onPress={save}
          disabled={isSame || saving}
          loading={saving}
          fullWidth>
          <View className="flex-row items-center gap-2">
            <Repeat size={15} color="#fff" />
            <Text className="text-white font-semibold">Cambiar plan</Text>
          </View>
        </Button>
      }>
      <Alert variant="info">
        <Text className="text-blue-700 dark:text-blue-300 text-xs">
          Acción manual del superadmin. No genera cobro ni reembolso a través
          de PayPhone.
        </Text>
      </Alert>

      <View className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
        <Text className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
          Cuenta
        </Text>
        <Text className="font-semibold text-slate-800 dark:text-white mt-0.5">
          {subscription.user?.profile?.firstName}{' '}
          {subscription.user?.profile?.lastName}
        </Text>
        <Text className="text-xs text-slate-500">
          {subscription.user?.email}
        </Text>
        <Text className="text-xs text-slate-500 mt-2">
          Plan actual:{' '}
          <Text className="font-semibold text-slate-700 dark:text-slate-300">
            {subscription.plan?.name}
          </Text>
        </Text>
      </View>

      {err ? (
        <View className="mt-3">
          <Alert variant="error">{err}</Alert>
        </View>
      ) : null}

      <Text className="text-xs font-semibold text-slate-500 mt-4 mb-2">
        Plan destino
      </Text>
      <View className="gap-2">
        {eligible.map((p) => {
          const selected = p.id === selectedId;
          const isCurrent = p.id === subscription.planId;
          return (
            <Pressable
              key={p.id}
              onPress={() => setSelectedId(p.id)}
              className={`rounded-xl border-2 p-3 ${
                selected
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-slate-200 dark:border-slate-700'
              }`}>
              <View className="flex-row items-center justify-between">
                <Text
                  className={`text-[10px] uppercase tracking-wider font-bold ${
                    selected ? 'text-purple-600' : 'text-slate-400'
                  }`}>
                  {p.code}
                </Text>
                {isCurrent ? (
                  <View className="bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                    <Text className="text-[10px] font-bold text-emerald-700">
                      Actual
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text className="font-bold text-slate-800 dark:text-white text-sm mt-1">
                {p.name}
              </Text>
              <Text className="text-xl font-bold text-slate-800 dark:text-white mt-1">
                ${p.monthlyPrice.toFixed(2)}
                <Text className="text-xs text-slate-400 font-normal">
                  /mes
                </Text>
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}
