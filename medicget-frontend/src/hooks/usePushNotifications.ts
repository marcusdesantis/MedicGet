/**
 * usePushNotifications — gestiona el ciclo de vida de Web Push:
 *
 *   • Detecta soporte del navegador (Service Worker + PushManager)
 *   • Lee el estado del permiso (`default` / `granted` / `denied`)
 *   • Verifica si ya existe una suscripción para esta página
 *   • `enable()` pide permiso, registra el SW si hace falta, suscribe
 *     contra el endpoint de push del navegador y manda al backend
 *   • `disable()` desuscribe y borra del backend
 *
 * Si el usuario YA está suscripto en otro dispositivo, este hook
 * sólo afecta al actual — no toca las otras suscripciones.
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface PushState {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  subscribed: boolean;
  loading:    boolean;
}

const SW_PATH = '/sw.js';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export function usePushNotifications() {
  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const [state, setState] = useState<PushState>({
    supported,
    permission: supported ? Notification.permission : 'unsupported',
    subscribed: false,
    loading: false,
  });

  // ─── Detectar suscripción existente al montar ───
  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
        const sub = await reg?.pushManager.getSubscription();
        if (!cancelled) {
          setState((s) => ({ ...s, subscribed: !!sub }));
        }
      } catch {
        /* swallow */
      }
    })();
    return () => { cancelled = true; };
  }, [supported]);

  // ─── Activar push ───
  const enable = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;
    setState((s) => ({ ...s, loading: true }));
    try {
      // 1. Asegurar SW registrado
      let reg = await navigator.serviceWorker.getRegistration(SW_PATH);
      if (!reg) reg = await navigator.serviceWorker.register(SW_PATH);
      await navigator.serviceWorker.ready;

      // 2. Permiso del navegador
      const perm = await Notification.requestPermission();
      setState((s) => ({ ...s, permission: perm }));
      if (perm !== 'granted') {
        setState((s) => ({ ...s, loading: false }));
        return false;
      }

      // 3. Pedir VAPID public key al backend
      const vapidRes = await api.get<{ ok: true; data: { publicKey: string } }>('/push/vapid-public-key');
      const publicKey = vapidRes.data.data.publicKey;

      // 4. Suscribir contra el navegador
      const existing = await reg.pushManager.getSubscription();
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 5. Mandar suscripción al backend
      const subJson = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await api.post('/push/subscribe', {
        endpoint: subJson.endpoint,
        keys:     subJson.keys,
      });

      setState({ supported: true, permission: 'granted', subscribed: true, loading: false });
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[push] enable failed:', err);
      setState((s) => ({ ...s, loading: false }));
      return false;
    }
  }, [supported]);

  // ─── Desactivar push ───
  const disable = useCallback(async (): Promise<void> => {
    if (!supported) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await api.delete(`/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`);
        await sub.unsubscribe();
      }
      setState((s) => ({ ...s, subscribed: false, loading: false }));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[push] disable failed:', err);
      setState((s) => ({ ...s, loading: false }));
    }
  }, [supported]);

  return { ...state, enable, disable };
}
