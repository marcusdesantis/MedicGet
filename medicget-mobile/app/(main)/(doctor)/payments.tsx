/**
 * Doctor — Historial de pagos. Espejo del DoctorPaymentsPage web.
 *
 * Backend devuelve la lista filtrada por rol automáticamente: cuando el
 * caller es DOCTOR, `paymentApi.list()` devuelve solo los pagos donde el
 * médico era el destinatario. Mostramos: total bruto, comisión, neto.
 */

import { useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { ArrowLeft, CheckCircle2, RotateCcw, XCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { SectionCard } from '@/components/ui/SectionCard';
import { Avatar } from '@/components/ui/Avatar';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { useApi } from '@/hooks/useApi';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { paymentApi, type PaymentRowDto } from '@/lib/api';
import { fmtMedDate, profileInitials } from '@/lib/format';

export default function DoctorPayments() {
  const router = useRouter();
  const { state, refetch } = useApi(
    () => paymentApi.list({ pageSize: 100 }),
    [],
  );
  useRefetchOnFocus(refetch);

  const summary = useMemo(() => {
    if (state.status !== 'ready') return null;
    let gross = 0;
    let fees = 0;
    let net = 0;
    let paidCount = 0;
    for (const p of state.data.data) {
      if (p.status === 'PAID') {
        gross += p.amount;
        fees += p.platformFee ?? 0;
        net += p.doctorAmount ?? p.amount - (p.platformFee ?? 0);
        paidCount += 1;
      }
    }
    return { gross, fees, net, paidCount };
  }, [state]);

  return (
    <Screen>
      <View className="flex-row items-center gap-2 mb-4">
        <Pressable
          onPress={() => router.back()}
          hitSlop={6}
          className="w-9 h-9 rounded-lg items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
          <ArrowLeft size={16} color="#475569" />
        </Pressable>
        <View>
          <Text className="text-xl font-bold text-slate-800 dark:text-white">
            Pagos recibidos
          </Text>
          <Text className="text-xs text-slate-500">
            Historial de cobros por consulta
          </Text>
        </View>
      </View>

      {state.status === 'loading' ? (
        <View className="py-16 items-center">
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      ) : state.status === 'error' ? (
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
      ) : (
        <View className="gap-4">
          {summary ? (
            <View className="gap-3">
              <View className="flex-row gap-3">
                <Card label="Total cobrado" value={`$${summary.gross.toFixed(2)}`} />
                <Card
                  label="Neto recibido"
                  value={`$${summary.net.toFixed(2)}`}
                  highlight
                />
              </View>
              <View className="flex-row gap-3">
                <Card label="Comisión plataforma" value={`$${summary.fees.toFixed(2)}`} />
                <Card label="Pagos confirmados" value={summary.paidCount} />
              </View>
            </View>
          ) : null}

          <SectionCard title="Movimientos" noPadding>
            {state.data.data.length === 0 ? (
              <EmptyState
                title="Sin pagos todavía"
                description="Cuando un paciente pague una consulta, aparecerá aquí."
              />
            ) : (
              <View>
                {state.data.data.map((p) => (
                  <PaymentRow key={p.id} payment={p} />
                ))}
              </View>
            )}
          </SectionCard>
        </View>
      )}
    </Screen>
  );
}

function Card({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <View
      className={`flex-1 rounded-2xl border p-3 ${
        highlight
          ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800'
          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
      }`}>
      <Text className="text-[10px] text-slate-500 uppercase tracking-wider">
        {label}
      </Text>
      <Text
        className={`text-xl font-bold mt-1 ${
          highlight
            ? 'text-teal-700 dark:text-teal-300'
            : 'text-slate-800 dark:text-white'
        }`}>
        {value}
      </Text>
    </View>
  );
}

function PaymentRow({ payment }: { payment: PaymentRowDto }) {
  const profile = payment.appointment.patient.user.profile;
  const patientName =
    `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() ||
    payment.appointment.patient.user.email;

  const statusConfig: Record<
    PaymentRowDto['status'],
    { label: string; icon: React.ReactNode; text: string; bg: string }
  > = {
    PAID: {
      label: 'Pagado',
      icon: <CheckCircle2 size={12} color="#10b981" />,
      text: 'text-emerald-700 dark:text-emerald-300',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    PENDING: {
      label: 'Pendiente',
      icon: <RotateCcw size={12} color="#d97706" />,
      text: 'text-amber-700 dark:text-amber-300',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
    },
    REFUNDED: {
      label: 'Reembolsado',
      icon: <RotateCcw size={12} color="#64748b" />,
      text: 'text-slate-600 dark:text-slate-300',
      bg: 'bg-slate-100 dark:bg-slate-800',
    },
    FAILED: {
      label: 'Falló',
      icon: <XCircle size={12} color="#e11d48" />,
      text: 'text-rose-700 dark:text-rose-300',
      bg: 'bg-rose-100 dark:bg-rose-900/30',
    },
  };

  const cfg = statusConfig[payment.status];
  const net =
    payment.doctorAmount ?? payment.amount - (payment.platformFee ?? 0);

  return (
    <View className="flex-row items-start gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
      <Avatar
        initials={profileInitials(profile, 'PT')}
        imageUrl={profile?.avatarUrl ?? null}
        size="md"
        variant="indigo"
      />
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-2 flex-wrap">
          <Text
            numberOfLines={1}
            className="text-sm font-semibold text-slate-800 dark:text-white">
            {patientName}
          </Text>
          <View
            className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full ${cfg.bg}`}>
            {cfg.icon}
            <Text className={`text-[10px] font-medium ${cfg.text}`}>
              {cfg.label}
            </Text>
          </View>
        </View>
        <Text className="text-[11px] text-slate-400 mt-0.5">
          {fmtMedDate(payment.appointment.date)} · {payment.appointment.time}{' '}
          · {payment.appointment.modality.toLowerCase()}
        </Text>
        {payment.platformFee ? (
          <Text className="text-[10px] text-slate-400 mt-0.5">
            Comisión ${(payment.platformFee ?? 0).toFixed(2)}
          </Text>
        ) : null}
      </View>
      <View className="items-end">
        <Text className="text-sm font-bold text-slate-800 dark:text-white">
          ${payment.amount.toFixed(2)}
        </Text>
        {payment.status === 'PAID' ? (
          <Text className="text-xs text-teal-600 font-semibold">
            +${net.toFixed(2)} neto
          </Text>
        ) : null}
      </View>
    </View>
  );
}
