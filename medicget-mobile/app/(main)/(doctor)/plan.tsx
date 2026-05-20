/**
 * Doctor — Mi plan. Espejo movil del ManagePlanPage web.
 *
 *  - Si el medico pertenece a una clinica (`user.dto.doctor.clinic != null`),
 *    mostramos el plan HEREDADO en modo solo lectura: sin grilla de
 *    "Otros planes" ni boton de cancelar.
 *  - Si es independiente, mostramos plan actual + grilla con todos los
 *    planes DOCTOR. Los botones "Mejorar/Cambiar" abren el modal de
 *    checkout (PayPhone).
 *  - El downgrade a FREE usa /subscriptions/cancel (inmediato, no PayPhone).
 */

import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert as RNAlert,
  Pressable,
  Text,
  View,
} from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  ShieldCheck,
  Sparkles,
  X as XIcon,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { SectionCard } from '@/components/ui/SectionCard';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useApi } from '@/hooks/useApi';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { useAuth } from '@/context/AuthContext';
import { plansApi, subscriptionsApi, type PlanDto } from '@/lib/api';
import { SubscribeCheckoutModal } from '@/components/subscription/SubscribeCheckoutModal';

const MODULE_LABELS: Record<string, string> = {
  ONLINE:             'Videollamadas ilimitadas',
  PRESENCIAL:         'Citas presenciales',
  CHAT:               'Chat en vivo con pacientes',
  PAYMENTS_DASHBOARD: 'Panel de pagos online',
  REPORTS:            'Reportes avanzados',
  PRIORITY_SEARCH:    'Prioridad en busqueda',
};

export default function DoctorPlan() {
  const router = useRouter();
  const { user } = useAuth();
  const isDoctorOfClinic = !!user?.dto.doctor?.clinicId;

  const meQ    = useApi(() => subscriptionsApi.me(), []);
  const plansQ = useApi(() => plansApi.list('DOCTOR'), []);
  useRefetchOnFocus(meQ.refetch);

  const [checkoutPlan, setCheckoutPlan] = useState<PlanDto | null>(null);
  const [cancelling, setCancelling]     = useState(false);

  const inherited = meQ.state.status === 'ready' && !!meQ.state.data.inherited;
  const currentPlan: PlanDto | null = useMemo(() => {
    if (meQ.state.status !== 'ready') return null;
    return meQ.state.data.subscription?.plan ?? meQ.state.data.freePlan ?? null;
  }, [meQ.state]);
  const sub = meQ.state.status === 'ready' ? meQ.state.data.subscription : null;
  const isFree = currentPlan?.code === 'FREE';

  const onCancel = () => {
    RNAlert.alert(
      'Cancelar suscripcion',
      'Volveras al plan gratuito y perderas las funciones premium inmediatamente. No hay reembolso del periodo actual.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Si, cancelar',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await subscriptionsApi.cancel();
              meQ.refetch();
            } catch (err: unknown) {
              const msg = (err as { response?: { data?: { error?: { message?: string } } } })
                ?.response?.data?.error?.message ?? 'No se pudo cancelar';
              RNAlert.alert('Error', msg);
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  if (meQ.state.status === 'loading' || plansQ.state.status === 'loading') {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center py-24">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </Screen>
    );
  }

  if (plansQ.state.status === 'error') {
    return (
      <Screen>
        <Alert variant="error">{plansQ.state.error.message}</Alert>
      </Screen>
    );
  }

  const plans = plansQ.state.status === 'ready' ? plansQ.state.data : [];

  return (
    <Screen>
      <View className="flex-row items-center gap-2 mb-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={6}
          className="w-9 h-9 rounded-lg items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
          <ArrowLeft size={16} color="#475569" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-bold text-slate-800 dark:text-white">
            Mi plan
          </Text>
          <Text className="text-xs text-slate-500">
            {isDoctorOfClinic
              ? 'Plan heredado de tu clinica'
              : 'Gestiona tu suscripcion'}
          </Text>
        </View>
      </View>

      <View className="gap-4">
        {isDoctorOfClinic ? (
          <Alert variant="info">
            <View className="flex-row items-center gap-1.5">
              <ShieldCheck size={14} color="#2563eb" />
              <Text className="flex-1 text-blue-700 dark:text-blue-300 text-sm">
                Perteneces a una clinica, asi que tu plan lo gestiona y paga
                ella. Esta vista es informativa.
              </Text>
            </View>
          </Alert>
        ) : null}

        {/* Plan actual */}
        {currentPlan ? (
          <SectionCard>
            <View className="flex-row items-start gap-3">
              <View
                className={`h-14 w-14 rounded-2xl items-center justify-center ${
                  currentPlan.code === 'PREMIUM'
                    ? 'bg-amber-400'
                    : currentPlan.code === 'PRO'
                      ? 'bg-blue-600'
                      : 'bg-slate-100 dark:bg-slate-800'
                }`}>
                {currentPlan.code === 'PREMIUM' ? (
                  <Sparkles size={22} color="#fff" />
                ) : (
                  <BadgeCheck
                    size={22}
                    color={currentPlan.code === 'PRO' ? '#fff' : '#94a3b8'}
                  />
                )}
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  Plan actual
                </Text>
                <Text className="text-xl font-bold text-slate-800 dark:text-white">
                  {currentPlan.name}
                </Text>
                {currentPlan.description ? (
                  <Text className="text-xs text-slate-500 mt-0.5">
                    {currentPlan.description}
                  </Text>
                ) : null}
                {sub && currentPlan.monthlyPrice > 0 ? (
                  <Text className="text-[11px] text-slate-500 mt-1.5">
                    Renueva el{' '}
                    <Text className="font-semibold">
                      {new Date(sub.expiresAt).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                  </Text>
                ) : null}
              </View>
              <View className="items-end">
                <Text className="text-2xl font-bold text-slate-800 dark:text-white">
                  ${currentPlan.monthlyPrice.toFixed(2)}
                </Text>
                <Text className="text-[10px] text-slate-400">por mes</Text>
              </View>
            </View>

            <View className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Text className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">
                Tu plan incluye
              </Text>
              <View className="flex-row flex-wrap gap-1.5">
                {currentPlan.modules
                  .filter((m) => MODULE_LABELS[m])
                  .map((m) => (
                    <View
                      key={m}
                      className="flex-row items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                      <Check size={10} color="#10b981" />
                      <Text className="text-[11px] text-emerald-700 dark:text-emerald-300">
                        {MODULE_LABELS[m]}
                      </Text>
                    </View>
                  ))}
              </View>
            </View>

            {!isFree && !isDoctorOfClinic ? (
              <View className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Pressable
                  onPress={onCancel}
                  disabled={cancelling}
                  className="flex-row items-center gap-1.5 self-start px-3 py-2 rounded-lg">
                  <XIcon size={12} color="#dc2626" />
                  <Text className="text-xs font-medium text-rose-600">
                    {cancelling ? 'Cancelando...' : 'Cancelar suscripcion'}
                  </Text>
                </Pressable>
                <Text className="text-[10px] text-slate-400 mt-1">
                  Volveras al plan gratuito al instante.
                </Text>
              </View>
            ) : null}

            {isDoctorOfClinic && inherited ? (
              <View className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Text className="text-[10px] text-slate-400">
                  Este plan esta vinculado a tu clinica. Si te desvinculas
                  de ella, volveras al plan gratuito como medico independiente.
                </Text>
              </View>
            ) : null}
          </SectionCard>
        ) : null}

        {/* Otros planes (solo para independientes) */}
        {!isDoctorOfClinic ? (
          <View>
            <Text className="text-lg font-bold text-slate-800 dark:text-white mb-1">
              {isFree ? 'Mejora tu plan' : 'Cambiar de plan'}
            </Text>
            <Text className="text-xs text-slate-500 mb-3">
              Sin permanencia, cambia cuando quieras
            </Text>
            <View className="gap-3">
              {plans.map((p) => {
                const isCurrent = p.id === currentPlan?.id;
                const isFreeOpt = p.monthlyPrice === 0;
                const isHighlight = p.code === 'PRO';
                return (
                  <View
                    key={p.id}
                    className={`rounded-2xl p-4 border ${
                      isCurrent
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300'
                        : isHighlight
                          ? 'bg-blue-600 border-blue-700'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                    }`}>
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1">
                        <Text
                          className={`text-[10px] uppercase tracking-wider font-bold ${
                            isHighlight && !isCurrent ? 'text-blue-100' : 'text-slate-400'
                          }`}>
                          {p.code}
                        </Text>
                        <Text
                          className={`text-lg font-bold ${
                            isHighlight && !isCurrent ? 'text-white' : 'text-slate-800 dark:text-white'
                          }`}>
                          {p.name}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text
                          className={`text-2xl font-bold ${
                            isHighlight && !isCurrent ? 'text-white' : 'text-slate-800 dark:text-white'
                          }`}>
                          ${p.monthlyPrice.toFixed(2)}
                        </Text>
                        <Text
                          className={`text-[10px] ${
                            isHighlight && !isCurrent ? 'text-blue-100' : 'text-slate-400'
                          }`}>
                          /mes
                        </Text>
                      </View>
                    </View>

                    <View className="mt-3 gap-1">
                      {p.modules
                        .filter((m) => MODULE_LABELS[m])
                        .slice(0, 5)
                        .map((m) => (
                          <View key={m} className="flex-row items-start gap-1.5">
                            <Check
                              size={11}
                              color={isHighlight && !isCurrent ? '#bfdbfe' : '#10b981'}
                              style={{ marginTop: 3 }}
                            />
                            <Text
                              className={`text-xs flex-1 ${
                                isHighlight && !isCurrent ? 'text-blue-50' : 'text-slate-600 dark:text-slate-300'
                              }`}>
                              {MODULE_LABELS[m]}
                            </Text>
                          </View>
                        ))}
                    </View>

                    <View className="mt-3">
                      {isCurrent ? (
                        <View className="py-2 items-center bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                          <Text className="text-xs font-bold text-emerald-700">
                            Plan activo
                          </Text>
                        </View>
                      ) : isFreeOpt ? (
                        <Pressable
                          onPress={onCancel}
                          disabled={cancelling || !sub || currentPlan?.code === 'FREE'}
                          className="py-2 items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                          <Text className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                            Bajar a gratuito
                          </Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={() => setCheckoutPlan(p)}
                          className={`py-2.5 flex-row items-center justify-center gap-1.5 rounded-xl ${
                            isHighlight ? 'bg-white' : 'bg-blue-600'
                          }`}>
                          <Text
                            className={`text-sm font-bold ${
                              isHighlight ? 'text-blue-700' : 'text-white'
                            }`}>
                            {currentPlan && currentPlan.monthlyPrice < p.monthlyPrice
                              ? 'Mejorar'
                              : 'Cambiar'}
                          </Text>
                          <ArrowRight size={12} color={isHighlight ? '#1d4ed8' : '#fff'} />
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            <View className="mt-4 flex-row items-center justify-center gap-1.5">
              <ShieldCheck size={11} color="#94a3b8" />
              <Text className="text-[10px] text-slate-400 text-center">
                Pagos procesados por PayPhone con cifrado TLS
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* Modal de checkout PayPhone */}
      <SubscribeCheckoutModal
        visible={!!checkoutPlan}
        plan={checkoutPlan}
        onClose={() => setCheckoutPlan(null)}
        onSuccess={() => meQ.refetch()}
      />
    </Screen>
  );
}
