/**
 * Clinic — Pagos. Espejo del PaymentsPage web.
 *
 * KPIs (total cobrado, neto al médico, comisión MedicGet, pendiente) +
 * historial de pagos.
 */

import { useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Percent,
  RotateCcw,
  XCircle,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { SectionCard } from '@/components/ui/SectionCard';
import { Avatar } from '@/components/ui/Avatar';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { useApi } from '@/hooks/useApi';
import { dashboardApi, paymentApi, type PaymentRowDto } from '@/lib/api';
import { fmtMedDate, profileInitials } from '@/lib/format';

function fmtMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

export default function ClinicPayments() {
  const router = useRouter();

  const dash = useApi(() => dashboardApi.clinic(), []);
  const payments = useApi(
    () => paymentApi.list({ pageSize: 100 }),
    [],
  );

  const dashStats =
    dash.state.status === 'ready'
      ? dash.state.data.stats ?? {}
      : ({} as Record<string, number | undefined>);

  const platformAgg = useMemo(() => {
    if (payments.state.status !== 'ready') return { fees: 0, docs: 0 };
    const paid = payments.state.data.data.filter((p) => p.status === 'PAID');
    const fees = paid.reduce((s, r) => s + (r.platformFee ?? 0), 0);
    const docs = paid.reduce(
      (s, r) => s + (r.doctorAmount ?? r.amount - (r.platformFee ?? 0)),
      0,
    );
    return { fees, docs };
  }, [payments.state]);

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
            Pagos
          </Text>
          <Text className="text-xs text-slate-500">
            Resumen financiero de tu clínica
          </Text>
        </View>
      </View>

      {dash.state.status === 'loading' || payments.state.status === 'loading' ? (
        <View className="py-16 items-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <View className="gap-4">
          <View className="flex-row gap-3">
            <Kpi
              icon={<DollarSign size={16} color="#10b981" />}
              tint="bg-emerald-100 dark:bg-emerald-900/30"
              label="Ingresos totales"
              value={fmtMoney(dashStats.totalRevenue ?? 0)}
            />
            <Kpi
              icon={<DollarSign size={16} color="#2563eb" />}
              tint="bg-blue-100 dark:bg-blue-900/30"
              label="Neto al médico"
              value={fmtMoney(platformAgg.docs)}
              sub="después de comisión"
            />
          </View>
          <View className="flex-row gap-3">
            <Kpi
              icon={<Percent size={16} color="#7c3aed" />}
              tint="bg-purple-100 dark:bg-purple-900/30"
              label="Comisión MedicGet"
              value={fmtMoney(platformAgg.fees)}
            />
            <Kpi
              icon={<CreditCard size={16} color="#d97706" />}
              tint="bg-amber-100 dark:bg-amber-900/30"
              label="Pendiente"
              value={fmtMoney(dashStats.pendingRevenue ?? 0)}
            />
          </View>

          {payments.state.status === 'error' ? (
            <Alert variant="error">
              <Text className="text-rose-700 dark:text-rose-300 text-sm">
                {payments.state.error.message}
              </Text>
              <Pressable onPress={payments.refetch} className="mt-2">
                <Text className="text-indigo-600 text-xs font-semibold">
                  Reintentar
                </Text>
              </Pressable>
            </Alert>
          ) : null}

          {payments.state.status === 'ready' ? (
            <SectionCard title="Historial" noPadding>
              {payments.state.data.data.length === 0 ? (
                <EmptyState
                  title="Sin pagos todavía"
                  description="Cuando se procese el primer pago aparecerá acá."
                />
              ) : (
                <View>
                  {payments.state.data.data.map((p) => (
                    <PaymentRow key={p.id} payment={p} />
                  ))}
                </View>
              )}
            </SectionCard>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

function Kpi({
  icon,
  tint,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  tint: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View className="flex-1 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
      <View
        className={`w-9 h-9 rounded-xl items-center justify-center ${tint}`}>
        {icon}
      </View>
      <Text className="text-[10px] text-slate-400 mt-2 uppercase tracking-wider">
        {label}
      </Text>
      <Text className="text-lg font-bold text-slate-800 dark:text-white mt-0.5">
        {value}
      </Text>
      {sub ? <Text className="text-[10px] text-slate-400">{sub}</Text> : null}
    </View>
  );
}

function PaymentRow({ payment }: { payment: PaymentRowDto }) {
  const patient = payment.appointment.patient.user.profile;
  const doctor = payment.appointment.doctor.user.profile;
  const patientName =
    `${patient?.firstName ?? ''} ${patient?.lastName ?? ''}`.trim() ||
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

  return (
    <View className="flex-row items-start gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <Avatar
        initials={profileInitials(patient, 'PT')}
        imageUrl={patient?.avatarUrl ?? null}
        size="md"
        variant="indigo"
      />
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-2 flex-wrap">
          <Text
            numberOfLines={1}
            className="text-sm font-semibold text-slate-800 dark:text-white flex-1">
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
        <Text className="text-[11px] text-slate-500 mt-0.5">
          Dr. {[doctor?.firstName, doctor?.lastName].filter(Boolean).join(' ')}{' '}
          · {payment.appointment.doctor.specialty}
        </Text>
        <Text className="text-[11px] text-slate-400 mt-0.5">
          {fmtMedDate(payment.appointment.date)} · {payment.appointment.time}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-sm font-bold text-slate-800 dark:text-white">
          ${payment.amount.toFixed(2)}
        </Text>
        {payment.platformFee ? (
          <Text className="text-[10px] text-slate-400">
            comisión ${payment.platformFee.toFixed(2)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
