/**
 * NotificationsBell — campanita del topbar con dropdown de últimas
 * notificaciones del usuario.
 *
 *  - Polling cada 30s para refrescar el contador (mismo patrón del chat).
 *  - Badge rojo con contador (>9 muestra "9+").
 *  - Dropdown con scroll, agrupado por estado (no leídas arriba).
 *  - Click en una notificación la marca como leída + navega al destino
 *    según el tipo:
 *       APPOINTMENT_*  → lista de citas del rol
 *       PAYMENT_*      → pagos
 *       SYSTEM (chat)  → /:role/appointments/:id/chat
 *       REVIEW_*       → reseñas del médico
 *  - Botón "Marcar todo como leído" si hay alguna no leída.
 *  - Empty state amable si no hay nada.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Calendar, CreditCard, MessageSquare, Star, Settings,
  CheckCheck, Loader2, BellRing, BellOff,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { notificationsApi, type NotificationDto } from '@/lib/api';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const POLL_INTERVAL_MS = 30_000;

export function NotificationsBell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [open,    setOpen]    = useState(false);
  const [items,   setItems]   = useState<NotificationDto[]>([]);
  const [unread,  setUnread]  = useState(0);
  const [loading, setLoading] = useState(false);

  const push = usePushNotifications();
  const togglePush = async () => {
    if (push.subscribed) await push.disable();
    else                  await push.enable();
  };

  // Carga inicial + polling
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await notificationsApi.list({ limit: 20 });
        if (cancelled) return;
        setItems(res.data.items);
        setUnread(res.data.unreadCount);
      } catch {
        /* swallow */
      }
    };
    tick();
    const t = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => { cancelled = true; window.clearInterval(t); };
  }, []);

  // Cerrar al click afuera
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  const role = user?.role ?? 'patient';

  /**
   * Para una notificación, devolvemos el path al que llevarla según
   * su tipo. Si tiene metadata.appointmentId la priorizamos.
   */
  const hrefFor = (n: NotificationDto): string => {
    const meta = (n.metadata ?? {}) as { appointmentId?: string };
    const apptId = meta.appointmentId;

    if (n.type === 'APPOINTMENT_CONFIRMED' || n.type === 'APPOINTMENT_CANCELLED' || n.type === 'APPOINTMENT_REMINDER') {
      if (apptId) return `/${role}/appointments/${apptId}`;
      return `/${role}/appointments`;
    }
    if (n.type === 'PAYMENT_RECEIVED') {
      if (role === 'patient') return '/patient/appointments';
      if (role === 'doctor')  return '/doctor/payments';
      if (role === 'clinic')  return '/clinic/payments';
      return '/admin';
    }
    if (n.type === 'REVIEW_RECEIVED' && role === 'doctor') {
      return '/doctor';
    }
    if (n.type === 'SYSTEM' && apptId) {
      // Casi siempre es un mensaje de chat
      return `/${role}/appointments/${apptId}/chat`;
    }
    return `/${role}`;
  };

  const iconFor = (t: NotificationDto['type']) => {
    if (t.startsWith('APPOINTMENT')) return Calendar;
    if (t === 'PAYMENT_RECEIVED')    return CreditCard;
    if (t === 'REVIEW_RECEIVED')     return Star;
    if (t === 'SYSTEM')              return MessageSquare;
    return Settings;
  };

  const colorFor = (t: NotificationDto['type']) => {
    if (t === 'APPOINTMENT_CONFIRMED') return 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30';
    if (t === 'APPOINTMENT_CANCELLED') return 'text-rose-500 bg-rose-100 dark:bg-rose-900/30';
    if (t === 'APPOINTMENT_REMINDER')  return 'text-amber-500 bg-amber-100 dark:bg-amber-900/30';
    if (t === 'PAYMENT_RECEIVED')      return 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30';
    if (t === 'REVIEW_RECEIVED')       return 'text-amber-500 bg-amber-100 dark:bg-amber-900/30';
    if (t === 'SYSTEM')                return 'text-blue-500 bg-blue-100 dark:bg-blue-900/30';
    return 'text-slate-500 bg-slate-100 dark:bg-slate-800';
  };

  const goTo = async (n: NotificationDto) => {
    setOpen(false);
    if (!n.isRead) {
      // Optimistic
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, isRead: true } : x));
      setUnread((u) => Math.max(0, u - 1));
      notificationsApi.markRead(n.id).catch(() => {/* swallow — el badge se autocorrige al próximo poll */});
    }
    navigate(hrefFor(n));
  };

  const onMarkAll = async () => {
    if (unread === 0) return;
    setLoading(true);
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnread(0);
    try {
      await notificationsApi.markAllRead();
    } catch {
      /* el próximo poll reconcilia */
    } finally {
      setLoading(false);
    }
  };

  // Agrupar: no-leídas arriba, leídas abajo
  const grouped = useMemo(() => {
    const unread = items.filter((n) => !n.isRead);
    const read   = items.filter((n) => n.isRead);
    return { unread, read };
  }, [items]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins  = Math.floor(diff / 60_000);
    if (mins < 1)        return 'recién';
    if (mins < 60)       return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24)      return `hace ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7)        return `hace ${days} d`;
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition w-9 h-9 flex items-center justify-center"
        title="Notificaciones"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute top-0 right-0 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-2rem)] z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-800 dark:text-white">Notificaciones</p>
              <p className="text-[11px] text-slate-400">
                {unread === 0 ? 'Estás al día' : `${unread} sin leer`}
              </p>
            </div>
            {unread > 0 && (
              <button
                onClick={onMarkAll}
                disabled={loading}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded-lg transition disabled:opacity-50"
              >
                {loading ? <Loader2 size={11} className="animate-spin" /> : <CheckCheck size={11} />}
                Marcar todo
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {items.length === 0 && (
              <div className="py-12 text-center px-4">
                <div className="inline-flex h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center mb-3">
                  <Bell className="text-slate-300" size={20} />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Todavía no hay notificaciones</p>
                <p className="text-xs text-slate-400 mt-1">Te avisaremos cuando pase algo nuevo.</p>
              </div>
            )}

            {grouped.unread.length > 0 && (
              <NotifGroup
                label="Nuevas"
                items={grouped.unread}
                onClick={goTo}
                iconFor={iconFor}
                colorFor={colorFor}
                formatTime={formatTime}
              />
            )}
            {grouped.read.length > 0 && (
              <NotifGroup
                label="Anteriores"
                items={grouped.read}
                onClick={goTo}
                iconFor={iconFor}
                colorFor={colorFor}
                formatTime={formatTime}
              />
            )}
          </div>

          {/* Footer: toggle de push notifications */}
          {push.supported && push.permission !== 'denied' && (
            <button
              onClick={togglePush}
              disabled={push.loading}
              className="w-full px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition disabled:opacity-50"
            >
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                push.subscribed
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}>
                {push.loading ? <Loader2 size={14} className="animate-spin" />
                              : push.subscribed ? <BellRing size={14} /> : <BellOff size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-white">
                  {push.subscribed ? 'Notificaciones push activadas' : 'Activar notificaciones push'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                  {push.subscribed
                    ? 'Recibís alertas aunque la app esté cerrada.'
                    : 'Recibí avisos de citas y mensajes en este dispositivo.'}
                </p>
              </div>
            </button>
          )}
          {push.permission === 'denied' && (
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
              Bloqueaste las notificaciones en el navegador. Activalas desde la configuración del sitio para recibirlas.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Group renderer ─── */

function NotifGroup({ label, items, onClick, iconFor, colorFor, formatTime }: {
  label:    string;
  items:    NotificationDto[];
  onClick:  (n: NotificationDto) => void;
  iconFor:  (t: NotificationDto['type']) => typeof Bell;
  colorFor: (t: NotificationDto['type']) => string;
  formatTime: (iso: string) => string;
}) {
  return (
    <div>
      <p className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wider font-bold text-slate-400">
        {label}
      </p>
      {items.map((n) => {
        const Icon = iconFor(n.type);
        const colors = colorFor(n.type);
        return (
          <button
            key={n.id}
            onClick={() => onClick(n)}
            className={`w-full text-left flex items-start gap-3 px-4 py-3 transition ${
              n.isRead
                ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                : 'bg-blue-50/30 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20'
            }`}
          >
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colors}`}>
              <Icon size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm truncate ${n.isRead ? 'text-slate-700 dark:text-slate-300 font-medium' : 'font-bold text-slate-800 dark:text-white'}`}>
                {n.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug mt-0.5">
                {n.message}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">{formatTime(n.createdAt)}</p>
            </div>
            {!n.isRead && (
              <span className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}
