/**
 * Doctor — Notificaciones. Lista de notificaciones del backend
 * (svc-users), con badge de no leídas y acción "marcar todas como leídas".
 *
 * Comparte la misma implementación que la del paciente — sólo cambia el
 * contexto de navegación (router.back() devuelve al dashboard médico).
 */

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import { ArrowLeft, Bell, BellRing, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { SectionCard } from '@/components/ui/SectionCard';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { useApi } from '@/hooks/useApi';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { notificationsApi, type NotificationDto } from '@/lib/api';

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d}d`;
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
  });
}

export default function DoctorNotifications() {
  const router = useRouter();
  const { state, refetch } = useApi(
    () => notificationsApi.list({ limit: 50 }),
    [],
  );
  useRefetchOnFocus(refetch);

  const [items, setItems] = useState<NotificationDto[]>([]);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (state.status === 'ready') setItems(state.data.items);
  }, [state]);

  const unreadCount = items.filter((n) => !n.isRead).length;

  const markOne = async (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    try {
      await notificationsApi.markRead(id);
    } catch {
      refetch();
    }
  };

  const markAll = async () => {
    setMarkingAll(true);
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      refetch();
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <Screen>
      <View className="flex-row items-center gap-2 mb-4">
        <Pressable
          onPress={() => router.back()}
          hitSlop={6}
          className="w-9 h-9 rounded-lg items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
          <ArrowLeft size={16} color="#475569" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-bold text-slate-800 dark:text-white">
            Notificaciones
          </Text>
          {unreadCount > 0 ? (
            <Text className="text-xs text-blue-600 font-medium">
              {unreadCount} sin leer
            </Text>
          ) : null}
        </View>
        {unreadCount > 0 ? (
          <Pressable
            onPress={markAll}
            disabled={markingAll}
            className="flex-row items-center gap-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            {markingAll ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <Check size={12} color="#2563eb" />
            )}
            <Text className="text-xs font-semibold text-blue-600">
              Marcar todo
            </Text>
          </Pressable>
        ) : null}
      </View>

      {state.status === 'loading' ? (
        <View className="py-16 items-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : state.status === 'error' ? (
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
      ) : (
        <SectionCard noPadding>
          {items.length === 0 ? (
            <EmptyState
              title="Todo al día"
              description="No tienes notificaciones por ahora."
              icon={Bell}
            />
          ) : (
            <View>
              {items.map((n) => (
                <Pressable
                  key={n.id}
                  onPress={() => !n.isRead && markOne(n.id)}
                  className={`flex-row items-start gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 ${
                    !n.isRead ? 'bg-blue-50/40 dark:bg-blue-950/10' : ''
                  }`}>
                  <View
                    className={`w-9 h-9 rounded-xl items-center justify-center ${
                      n.isRead
                        ? 'bg-slate-100 dark:bg-slate-800'
                        : 'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                    {n.isRead ? (
                      <Bell size={16} color="#94a3b8" />
                    ) : (
                      <BellRing size={16} color="#2563eb" />
                    )}
                  </View>
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center justify-between gap-2">
                      <Text
                        numberOfLines={1}
                        className={`text-sm flex-1 ${
                          !n.isRead
                            ? 'font-semibold text-slate-900 dark:text-white'
                            : 'text-slate-700 dark:text-slate-200'
                        }`}>
                        {n.title}
                      </Text>
                      <Text className="text-[10px] text-slate-400 flex-shrink-0">
                        {timeAgo(n.createdAt)}
                      </Text>
                    </View>
                    <Text
                      numberOfLines={2}
                      className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {n.message}
                    </Text>
                  </View>
                  {!n.isRead ? (
                    <View className="w-2 h-2 rounded-full bg-blue-600 mt-2" />
                  ) : null}
                </Pressable>
              ))}
            </View>
          )}
        </SectionCard>
      )}
    </Screen>
  );
}
