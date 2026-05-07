/**
 * AppointmentChatPage — modern Insta/FB-style chat between the patient and
 * doctor of a CHAT-modality appointment.
 *
 *  ┌──────────────────────────────────────────────────┐
 *  │ ← Back   Avatar   Dr. Pérez · Cardiología   ●online│   ← header
 *  ├──────────────────────────────────────────────────┤
 *  │              ───── Hoy ─────                      │
 *  │  ┌──────────────┐                                  │
 *  │  │ Hola doctor… │  ← incoming bubble (left)        │
 *  │  └──────────────┘                                  │
 *  │                       ┌──────────────────────┐    │
 *  │                       │ Buenas, ¿qué te pasa?│    │
 *  │                       └──────────────────────┘    │
 *  │                              09:42 · Visto         │
 *  ├──────────────────────────────────────────────────┤
 *  │ [📎] [Aa Mensaje………………………………………………]  [➤]      │
 *  └──────────────────────────────────────────────────┘
 *
 *  - Polling every 3s with `since` cursor for near-real-time delivery.
 *  - Read receipts: backend flips `readAt` for messages from the OTHER party
 *    on every list call. We read it back to render "Visto".
 *  - Date separators inserted automatically when the day changes between
 *    consecutive messages.
 *  - Sender can long-press a message to delete it (simple "x" on hover here).
 *  - Locked input with informative banner once the appointment is closed.
 *
 *  This is intentionally a single-file component — splitting into a
 *  `MessagesPanel` / `Composer` / etc. could come later but adds friction
 *  for a feature this size. Tailwind utility classes only.
 */

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Send, Loader2, Check, CheckCheck, MoreVertical,
  AlertCircle, Smile, Paperclip, Lock,
} from 'lucide-react';
import { Avatar }       from '@/components/ui/Avatar';
import { Alert }        from '@/components/ui/Alert';
import { useApi }       from '@/hooks/useApi';
import { chatApi, type ChatMessageDto, type ChatThreadDto } from '@/lib/api';

const POLL_INTERVAL_MS = 3000;

// Tiny helper — same-day check off two ISO strings.
function isSameDay(a: string, b: string): boolean {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
         da.getMonth() === db.getMonth() &&
         da.getDate() === db.getDate();
}

function formatDateSeparator(iso: string): string {
  const d  = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(iso, today.toISOString()))     return 'Hoy';
  if (isSameDay(iso, yesterday.toISOString())) return 'Ayer';
  return d.toLocaleDateString('es-ES', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function initials(firstName: string, lastName: string): string {
  return ((firstName?.[0] ?? '') + (lastName?.[0] ?? '')).toUpperCase() || '··';
}

interface AppointmentChatPageProps {
  /** Where the back arrow returns to. Defaults to the previous page. */
  backTo?: string;
}

export function AppointmentChatPage({ backTo }: AppointmentChatPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ─── Initial fetch (full thread) ─────────────────────────────────────
  const { state, refetch } = useApi<ChatThreadDto>(
    () => chatApi.list(id!),
    [id],
  );

  // Local mirror of the messages list — we mutate it on send + on poll
  // so the UI updates without round-tripping through the heavier
  // useApi state.
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  useEffect(() => {
    if (state.status === 'ready') {
      setMessages(state.data.messages);
    }
  }, [state]);

  // ─── Polling for new messages ────────────────────────────────────────
  // Uses the `since` cursor so we only download deltas. Each call also
  // updates read receipts on the OTHER party's messages, so we re-fetch
  // the FULL thread once every 5 polls to refresh receipts on our own
  // outgoing bubbles.
  const lastPollAt = useRef<string | null>(null);
  const pollCount  = useRef(0);

  useEffect(() => {
    if (state.status !== 'ready' || !id) return;

    const interval = window.setInterval(async () => {
      try {
        pollCount.current += 1;
        // Every 5 polls, refetch the whole thread to pick up readAt
        // updates on our outgoing bubbles. Otherwise just delta-poll.
        if (pollCount.current % 5 === 0) {
          const full = await chatApi.list(id);
          setMessages(full.data.messages);
          lastPollAt.current = new Date().toISOString();
          return;
        }

        const since = lastPollAt.current ??
          (messages[messages.length - 1]?.createdAt ?? new Date(Date.now() - 60_000).toISOString());
        const res = await chatApi.list(id, since);
        if (res.data.messages.length > 0) {
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            const newOnes = res.data.messages.filter((m) => !seen.has(m.id));
            return newOnes.length ? [...prev, ...newOnes] : prev;
          });
        }
        lastPollAt.current = new Date().toISOString();
      } catch {
        /* network blip — next tick will retry */
      }
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, state.status]);

  // ─── Auto-scroll to bottom on new messages ───────────────────────────
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // ─── Composer state ─────────────────────────────────────────────────
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending || !id) return;

    setSending(true);
    setSendError(null);
    // Optimistic insert with a temporary id — the server's response will
    // overwrite it. Marked with a `_pending` flag so we can render a
    // spinner check icon.
    const tempId = `temp-${Date.now()}`;
    const tempMessage: ChatMessageDto = {
      id:            tempId,
      appointmentId: id,
      senderId:      state.status === 'ready' ? state.data.myUserId : '',
      content,
      createdAt:     new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMessage]);
    setDraft('');

    try {
      const res = await chatApi.send(id, { content });
      setMessages((prev) => prev.map((m) => (m.id === tempId ? res.data : m)));
    } catch (err: unknown) {
      // Roll back optimistic insert + surface error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo enviar el mensaje';
      setSendError(msg);
      setDraft(content);
    } finally {
      setSending(false);
    }
  };

  // ─── Loading / error gates ───────────────────────────────────────────
  if (state.status === 'loading') {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <Alert variant="error" action={
        <button onClick={refetch} className="text-sm font-medium underline">Reintentar</button>
      }>
        {state.error.message}
      </Alert>
    );
  }

  const { peer, myUserId, canSend, appointment } = state.data;
  const peerDisplayName = peer.role === 'DOCTOR'
    ? `Dr. ${peer.firstName} ${peer.lastName}`.trim()
    : `${peer.firstName} ${peer.lastName}`.trim();
  const peerSubtitle = peer.role === 'DOCTOR'
    ? (peer.specialty ?? 'Médico')
    : 'Paciente';

  return (
    <div className="flex flex-col -m-4 lg:-m-6 h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950">
      {/* ── Header ── */}
      <header className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <button
          onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
          title="Volver"
        >
          <ArrowLeft size={18} />
        </button>
        <Avatar
          initials={initials(peer.firstName, peer.lastName)}
          size="md"
          variant={peer.role === 'DOCTOR' ? 'blue' : 'indigo'}
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 dark:text-white truncate">{peerDisplayName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
            {canSend && (
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="En línea" />
            )}
            {peerSubtitle} · {new Date(appointment.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} · {appointment.time}
          </p>
        </div>
        <button
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
          title="Más opciones"
        >
          <MoreVertical size={18} />
        </button>
      </header>

      {/* ── Messages scroller ── */}
      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-1.5">
        {messages.length === 0 ? (
          <EmptyChatState peerName={peerDisplayName} />
        ) : (
          <MessagesList messages={messages} myUserId={myUserId} />
        )}
      </div>

      {/* ── Composer ── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 sm:px-4 py-3">
        {sendError && (
          <div className="mb-2 flex items-center gap-2 text-xs text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-300 rounded-lg px-3 py-2">
            <AlertCircle size={14} /> {sendError}
          </div>
        )}
        {!canSend ? (
          <div className="flex items-center gap-2 px-3 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-sm text-slate-500 dark:text-slate-400">
            <Lock size={14} /> La conversación está cerrada porque la cita ya finalizó.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <button
              type="button"
              className="p-2 rounded-full text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition flex-shrink-0"
              title="Adjuntar archivo (próximamente)"
              disabled
            >
              <Paperclip size={18} />
            </button>
            <button
              type="button"
              className="p-2 rounded-full text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition flex-shrink-0"
              title="Insertar emoji"
              onClick={() => setDraft((d) => d + '😊')}
            >
              <Smile size={18} />
            </button>
            <div className="flex-1 relative">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  // Enter sends, Shift+Enter inserts a new line — same UX as
                  // Slack / WhatsApp web. Don't trigger on IME composition.
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleSubmit(e as unknown as FormEvent);
                  }
                }}
                placeholder="Escribe un mensaje…"
                rows={1}
                className="w-full resize-none px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-sm text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 max-h-32"
                style={{ minHeight: '40px' }}
              />
            </div>
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              className="p-2.5 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white transition flex-shrink-0 shadow-sm"
              title="Enviar"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        )}
        <p className="text-[10px] text-slate-400 text-center mt-2">
          <Lock size={9} className="inline-block mr-1" />
          Los mensajes son visibles sólo para vos y {peerDisplayName}. MedicGet conserva el historial como parte de la historia clínica.
        </p>
      </footer>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────── */
/*  Subcomponents                                                       */
/* ───────────────────────────────────────────────────────────────────── */

interface MessagesListProps {
  messages: ChatMessageDto[];
  myUserId: string;
}

function MessagesList({ messages, myUserId }: MessagesListProps) {
  // Insert "date separator" pseudo-rows between messages whose calendar
  // day differs. Memoised so we don't recompute on every keystroke.
  const rows = useMemo(() => {
    const out: Array<
      | { type: 'separator'; key: string; label: string }
      | { type: 'message';   key: string; m: ChatMessageDto; isMine: boolean; consecutive: boolean }
    > = [];

    let prev: ChatMessageDto | null = null;
    for (const m of messages) {
      if (!prev || !isSameDay(prev.createdAt, m.createdAt)) {
        out.push({ type: 'separator', key: `sep-${m.id}`, label: formatDateSeparator(m.createdAt) });
      }
      const isMine = m.senderId === myUserId;
      const consecutive = !!prev &&
        prev.senderId === m.senderId &&
        isSameDay(prev.createdAt, m.createdAt) &&
        // Also break the cluster when the gap is >5 min — feels more
        // natural visually.
        new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60_000;
      out.push({ type: 'message', key: m.id, m, isMine, consecutive });
      prev = m;
    }
    return out;
  }, [messages]);

  // Find the LAST mine message — that's the only one that gets the
  // read-receipt indicator (Insta-style).
  const lastMineId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderId === myUserId) return messages[i].id;
    }
    return null;
  }, [messages, myUserId]);

  return (
    <>
      {rows.map((row) =>
        row.type === 'separator' ? (
          <div key={row.key} className="flex items-center justify-center my-3">
            <span className="px-3 py-1 text-[11px] uppercase tracking-wider font-semibold text-slate-400 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800">
              {row.label}
            </span>
          </div>
        ) : (
          <MessageBubble
            key={row.key}
            message={row.m}
            isMine={row.isMine}
            consecutive={row.consecutive}
            showReceipt={row.isMine && row.m.id === lastMineId}
          />
        ),
      )}
    </>
  );
}

interface MessageBubbleProps {
  message:     ChatMessageDto;
  isMine:      boolean;
  consecutive: boolean;
  showReceipt: boolean;
}

function MessageBubble({ message, isMine, consecutive, showReceipt }: MessageBubbleProps) {
  const isPending = message.id.startsWith('temp-');
  const isDeleted = !!message.deletedAt;

  // Stack consecutive messages from same sender tighter together —
  // Insta-style. Round all corners except the "tail" corner.
  const tailRadius = isMine
    ? 'rounded-2xl rounded-br-md'
    : 'rounded-2xl rounded-bl-md';
  const flatRadius = 'rounded-2xl';

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${consecutive ? 'mt-0.5' : 'mt-2'}`}>
      <div className="max-w-[78%] sm:max-w-[64%] flex flex-col">
        <div
          className={[
            'px-3.5 py-2 text-sm shadow-sm break-words',
            consecutive ? flatRadius : tailRadius,
            isMine
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700',
            isDeleted && 'italic opacity-60',
          ].filter(Boolean).join(' ')}
        >
          {isDeleted ? (
            <span>Mensaje eliminado</span>
          ) : (
            <>
              {message.content}
              {message.attachmentUrl && (
                <a
                  href={message.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block mt-1 text-xs underline ${isMine ? 'text-blue-100' : 'text-blue-600'}`}
                >
                  📎 {message.attachmentName ?? 'Adjunto'}
                </a>
              )}
            </>
          )}
        </div>

        {/* Receipt + timestamp — only on the LAST mine message to avoid
            visual noise on long threads */}
        {showReceipt && (
          <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-400 self-end">
            <span>{formatTime(message.createdAt)}</span>
            <span className="mx-0.5">·</span>
            {isPending ? (
              <Loader2 size={11} className="animate-spin" />
            ) : message.readAt ? (
              <span className="flex items-center gap-0.5 text-blue-500">
                <CheckCheck size={12} /> Visto
              </span>
            ) : (
              <span className="flex items-center gap-0.5">
                <Check size={12} /> Enviado
              </span>
            )}
          </div>
        )}
        {!showReceipt && !consecutive && (
          <div className={`text-[10px] text-slate-400 mt-0.5 ${isMine ? 'self-end' : 'self-start'}`}>
            {formatTime(message.createdAt)}
          </div>
        )}
      </div>
    </div>
  );
}

interface EmptyChatStateProps {
  peerName: string;
}

function EmptyChatState({ peerName }: EmptyChatStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
      <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
        <Send className="text-blue-600 dark:text-blue-400" size={26} />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">
        Empezá la conversación
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
        Esta es tu sala privada con {peerName}. Los mensajes que envíes acá
        forman parte de la consulta.
      </p>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────── */
/*  Role-specific entry points (so the router can pick a back-link)     */
/* ───────────────────────────────────────────────────────────────────── */

export function PatientAppointmentChatPage() {
  return <AppointmentChatPage backTo="/patient/appointments" />;
}

export function DoctorAppointmentChatPage() {
  return <AppointmentChatPage backTo="/doctor/appointments" />;
}

// Convenience link helpers — used by appointment lists / drawers so they
// don't have to hardcode role-specific paths.
export function chatPathForRole(role: 'patient' | 'doctor' | 'clinic', appointmentId: string): string {
  if (role === 'doctor')  return `/doctor/appointments/${appointmentId}/chat`;
  return `/patient/appointments/${appointmentId}/chat`;
}
