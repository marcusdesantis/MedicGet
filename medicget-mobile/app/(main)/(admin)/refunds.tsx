/**
 * Admin — Cola de reembolsos. Espejo del AdminRefundsPage web.
 *
 * Lista RefundRequest por estado. Para los PENDING el admin puede marcar
 * PROCESADO (tras hacer el reverso real en PayPhone Business) o RECHAZAR
 * con un motivo. MedicGet solo registra el estado — el reverso es manual.
 */

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  XCircle,
} from 'lucide-react-native';

import { Screen } from '@/components/ui/Screen';
import { SectionCard } from '@/components/ui/SectionCard';
import { Avatar } from '@/components/ui/Avatar';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { PolicyPanel } from '@/components/ui/PolicyPanel';
import { useApi } from '@/hooks/useApi';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { fmtMedDate, profileInitials } from '@/lib/format';
import {
  refundsApi,
  type RefundRequestDto,
  type RefundRequestStatus,
} from '@/lib/api';

const TABS: { value: RefundRequestStatus | 'ALL'; label: string }[] = [
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'PROCESSED', label: 'Procesados' },
  { value: 'REJECTED', label: 'Rechazados' },
  { value: 'ALL', label: 'Todos' },
];

export default function AdminRefunds() {
  const router = useRouter();
  const [tab, setTab] = useState<RefundRequestStatus | 'ALL'>('PENDING');
  const [selected, setSelected] = useState<RefundRequestDto | null>(null);
  const [mode, setMode] = useState<'process' | 'reject' | null>(null);

  const { state, refetch } = useApi(
    () => refundsApi.list({ status: tab, pageSize: 50 }),
    [tab],
  );
  useRefetchOnFocus(refetch);

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center gap-2 mb-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="p-1">
          <ArrowLeft size={20} color="#475569" />
        </Pressable>
        <Text className="text-xl font-bold text-slate-900 dark:text-white">Reembolsos</Text>
      </View>
      <Text className="text-sm text-slate-500 mb-3">
        Procesá el reverso en PayPhone Business y marcalos acá.
      </Text>

      <View className="mb-3">
        <PolicyPanel
          title="Cómo procesar un reembolso"
          icon={CreditCard}
          tone="blue"
          steps={[
            'Una solicitud aparece cuando un paciente cancela una cita pagada con reembolso aplicable.',
            'Hacé el reverso real en el panel de PayPhone Business por el monto indicado.',
            'Volvé acá, tocá "Procesado" e ingresá la referencia de PayPhone. El paciente recibe email + notificación.',
            'Si no procede, tocá "Rechazar" con un motivo claro — se le envía al paciente y el pago vuelve a PAGADO.',
          ]}
        />
      </View>

      <View className="flex-row flex-wrap gap-2 mb-3">
        {TABS.map((t) => (
          <Pressable
            key={t.value}
            onPress={() => setTab(t.value)}
            className={`px-3.5 py-2 rounded-xl ${
              tab === t.value
                ? 'bg-rose-600'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}>
            <Text
              className={`text-xs font-semibold ${
                tab === t.value ? 'text-white' : 'text-slate-600 dark:text-slate-300'
              }`}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {state.status === 'loading' && (
        <View className="py-16 items-center">
          <ActivityIndicator size="large" color="#e11d48" />
        </View>
      )}
      {state.status === 'error' && <Alert variant="error">{state.error.message}</Alert>}
      {state.status === 'ready' && state.data.data.length === 0 && (
        <EmptyState
          icon={CreditCard}
          title="Sin solicitudes"
          description={tab === 'PENDING' ? 'No hay reembolsos pendientes.' : 'Nada en esta categoría.'}
        />
      )}

      {state.status === 'ready' && state.data.data.length > 0 && (
        <View className="gap-3">
          {state.data.data.map((r) => (
            <RefundCard
              key={r.id}
              refund={r}
              onProcess={() => { setSelected(r); setMode('process'); }}
              onReject={() => { setSelected(r); setMode('reject'); }}
            />
          ))}
        </View>
      )}

      <ActionModal
        refund={mode ? selected : null}
        mode={mode}
        onClose={() => { setSelected(null); setMode(null); }}
        onDone={() => { setSelected(null); setMode(null); refetch(); }}
      />
    </Screen>
  );
}

function RefundCard({
  refund,
  onProcess,
  onReject,
}: {
  refund: RefundRequestDto;
  onProcess: () => void;
  onReject: () => void;
}) {
  const appt = refund.payment?.appointment;
  const pat = appt?.patient?.user?.profile;
  const doc = appt?.doctor?.user?.profile;
  const amount = refund.payment?.amount ?? 0;

  const badge =
    refund.status === 'PENDING'
      ? { cls: 'bg-amber-100 text-amber-700', Icon: Clock, label: 'PENDIENTE' }
      : refund.status === 'PROCESSED'
      ? { cls: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle2, label: 'PROCESADO' }
      : { cls: 'bg-slate-200 text-slate-700', Icon: XCircle, label: 'RECHAZADO' };
  const BIcon = badge.Icon;

  return (
    <SectionCard>
      <View className="flex-row items-center gap-2 mb-2">
        <View className={`flex-row items-center gap-1 px-2 py-0.5 rounded-md ${badge.cls}`}>
          <BIcon size={11} color="#000" />
          <Text className="text-[10px] font-bold">{badge.label}</Text>
        </View>
        <Text className="text-[11px] text-slate-400">
          {fmtMedDate(refund.requestedAt)}
        </Text>
      </View>

      <View className="flex-row items-start gap-3">
        <Avatar
          initials={profileInitials(pat, 'P')}
          imageUrl={pat?.avatarUrl ?? null}
          size="md"
        />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-slate-800 dark:text-white">
            {`${pat?.firstName ?? ''} ${pat?.lastName ?? ''}`.trim() || 'Paciente'}
          </Text>
          <Text className="text-xs text-slate-500 mt-0.5">
            Dr. {`${doc?.firstName ?? ''} ${doc?.lastName ?? ''}`.trim() || '—'} · {appt?.doctor?.specialty ?? ''}
          </Text>
          {appt ? (
            <Text className="text-[11px] text-slate-400">
              {fmtMedDate(appt.date)} · {appt.time}
            </Text>
          ) : null}
        </View>
        <Text className="text-lg font-bold text-slate-800 dark:text-white">
          ${amount.toFixed(2)}
        </Text>
      </View>

      {refund.requestReason ? (
        <View className="mt-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg p-2">
          <Text className="text-[10px] uppercase tracking-wide font-semibold text-slate-500 mb-0.5">
            Motivo del paciente
          </Text>
          <Text className="text-xs text-slate-700 dark:text-slate-200">{refund.requestReason}</Text>
        </View>
      ) : null}

      {refund.status !== 'PENDING' && refund.processorNotes ? (
        <View className="mt-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg p-2">
          <Text className="text-[10px] uppercase tracking-wide font-semibold text-slate-500 mb-0.5">
            Nota del admin
          </Text>
          <Text className="text-xs text-slate-700 dark:text-slate-200">{refund.processorNotes}</Text>
          {refund.externalReference ? (
            <Text className="text-[11px] text-slate-400 mt-1">Ref. PayPhone: {refund.externalReference}</Text>
          ) : null}
        </View>
      ) : null}

      {refund.status === 'PENDING' ? (
        <View className="flex-row gap-2 mt-3">
          <Pressable
            onPress={onProcess}
            className="flex-1 flex-row items-center justify-center gap-1.5 bg-emerald-600 active:bg-emerald-700 py-2.5 rounded-xl">
            <CheckCircle2 size={14} color="#fff" />
            <Text className="text-white text-xs font-semibold">Procesado</Text>
          </Pressable>
          <Pressable
            onPress={onReject}
            className="flex-row items-center justify-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl">
            <XCircle size={14} color="#475569" />
            <Text className="text-slate-700 dark:text-slate-200 text-xs font-semibold">Rechazar</Text>
          </Pressable>
        </View>
      ) : null}
    </SectionCard>
  );
}

function ActionModal({
  refund,
  mode,
  onClose,
  onDone,
}: {
  refund: RefundRequestDto | null;
  mode: 'process' | 'reject' | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [externalRef, setExternalRef] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!refund || !mode) return null;

  const canSubmit = mode === 'process' || notes.trim().length >= 5;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'process') {
        await refundsApi.process(refund.id, {
          externalReference: externalRef.trim() || undefined,
          processorNotes: notes.trim() || undefined,
        });
      } else {
        await refundsApi.reject(refund.id, { processorNotes: notes.trim() });
      }
      setExternalRef('');
      setNotes('');
      onDone();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'Error al procesar.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={!!refund}
      onClose={onClose}
      title={mode === 'process' ? 'Marcar como procesado' : 'Rechazar solicitud'}
      footer={
        <Button
          onPress={handleSubmit}
          loading={submitting}
          disabled={!canSubmit}
          variant={mode === 'process' ? 'success' : 'primary'}
          fullWidth>
          {mode === 'process' ? 'Confirmar procesado' : 'Rechazar solicitud'}
        </Button>
      }>
      <Text className="text-sm text-slate-600 dark:text-slate-300 mb-3 leading-5">
        {mode === 'process'
          ? 'Confirmá que ya hiciste el reverso en PayPhone Business. El paciente recibirá email + notificación.'
          : 'El motivo se envía al paciente. Sé específico.'}
      </Text>

      {mode === 'process' ? (
        <>
          <FormField label="Referencia PayPhone (opcional)">
            <Input value={externalRef} onChangeText={setExternalRef} placeholder="REV-2026-00123" />
          </FormField>
          <FormField label="Notas internas (opcional)">
            <Input value={notes} onChangeText={setNotes} placeholder="Reverso confirmado, ticket 1234" />
          </FormField>
        </>
      ) : (
        <FormField label="Motivo del rechazo *" hint="Mínimo 5 caracteres.">
          <Input
            value={notes}
            onChangeText={setNotes}
            placeholder="ej: El paciente ya fue atendido."
          />
        </FormField>
      )}

      {error ? (
        <View className="mt-2">
          <Alert variant="error">{error}</Alert>
        </View>
      ) : null}
    </Modal>
  );
}
