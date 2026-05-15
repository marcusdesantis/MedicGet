/**
 * Patient — Payment return. La pasarela de PayPhone redirige acá vía el
 * deep-link `medicget://payment-return` con query params:
 *
 *   ?id=<payphoneTransactionId>&clientTransactionId=<appointmentId>
 *
 * Llamamos a `paymentApi.confirm()` para que el backend valide con
 * PayPhone y flippee la cita a UPCOMING/PAID. Mostramos un estado claro
 * (procesando / éxito / falló) y luego volvemos a la lista de citas.
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { CheckCircle2, XCircle } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { PageHeader } from '@/components/ui/PageHeader';
import { paymentApi } from '@/lib/api';

type ConfirmStatus = 'loading' | 'paid' | 'failed' | 'pending';

export default function PaymentReturn() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string | string[];
    clientTransactionId?: string | string[];
    appointmentId?: string | string[];
  }>();

  const payphoneId = Array.isArray(params.id) ? params.id[0] : params.id;
  const appointmentId =
    (Array.isArray(params.appointmentId)
      ? params.appointmentId[0]
      : params.appointmentId) ??
    (Array.isArray(params.clientTransactionId)
      ? params.clientTransactionId[0]
      : params.clientTransactionId);

  const [status, setStatus] = useState<ConfirmStatus>('loading');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!appointmentId) {
        if (!cancelled) {
          setStatus('failed');
          setMessage('No se pudo identificar la cita asociada al pago.');
        }
        return;
      }
      try {
        const res = await paymentApi.confirm(appointmentId, {
          payphoneId: payphoneId || undefined,
        });
        if (cancelled) return;
        if (res.data.status === 'PAID') setStatus('paid');
        else if (res.data.status === 'PENDING') setStatus('pending');
        else setStatus('failed');
      } catch (err: unknown) {
        if (cancelled) return;
        const msg =
          (err as { response?: { data?: { error?: { message?: string } } } })
            ?.response?.data?.error?.message ?? 'No se pudo confirmar el pago';
        setStatus('failed');
        setMessage(msg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appointmentId, payphoneId]);

  return (
    <Screen>
      <PageHeader title="Confirmando pago" />

      <View className="flex-1 items-center justify-center py-10">
        {status === 'loading' ? (
          <>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-base font-semibold text-slate-800 dark:text-white mt-4">
              Verificando con PayPhone…
            </Text>
            <Text className="text-sm text-slate-500 mt-1 text-center">
              No cierres la app hasta que termine.
            </Text>
          </>
        ) : status === 'paid' ? (
          <>
            <View className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 items-center justify-center">
              <CheckCircle2 size={40} color="#10b981" />
            </View>
            <Text className="text-xl font-bold text-slate-800 dark:text-white mt-4">
              ¡Pago confirmado!
            </Text>
            <Text className="text-sm text-slate-500 mt-1 text-center">
              Tu cita ya está reservada. Te esperamos.
            </Text>
            <Pressable
              onPress={() =>
                router.replace('/(main)/(patient)/appointments' as never)
              }
              className="mt-6 px-6 py-3 rounded-2xl bg-blue-600 active:bg-blue-700">
              <Text className="text-white font-semibold">Ver mis citas</Text>
            </Pressable>
          </>
        ) : status === 'pending' ? (
          <>
            <ActivityIndicator size="large" color="#f59e0b" />
            <Text className="text-base font-semibold text-slate-800 dark:text-white mt-4">
              Pago en proceso
            </Text>
            <Text className="text-sm text-slate-500 mt-1 text-center max-w-[280px]">
              PayPhone aún está validando la transacción. Revisá tus citas en
              un momento.
            </Text>
            <Pressable
              onPress={() =>
                router.replace('/(main)/(patient)/appointments' as never)
              }
              className="mt-6 px-6 py-3 rounded-2xl bg-blue-600 active:bg-blue-700">
              <Text className="text-white font-semibold">Ver mis citas</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View className="w-20 h-20 rounded-full bg-rose-100 dark:bg-rose-900/30 items-center justify-center">
              <XCircle size={40} color="#e11d48" />
            </View>
            <Text className="text-xl font-bold text-slate-800 dark:text-white mt-4">
              No se pudo confirmar
            </Text>
            <Text className="text-sm text-slate-500 mt-1 text-center max-w-[280px]">
              {message ??
                'PayPhone rechazó el pago o se canceló. Probá nuevamente desde tu cita.'}
            </Text>
            <Pressable
              onPress={() =>
                router.replace('/(main)/(patient)/appointments' as never)
              }
              className="mt-6 px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800">
              <Text className="text-slate-700 dark:text-slate-200 font-semibold">
                Volver
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </Screen>
  );
}
