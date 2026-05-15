/**
 * Patient — Chat de la cita (modalidad CHAT). Espejo recortado del
 * AppointmentChatPage web: header con peer, lista de mensajes con
 * burbujas y separador de día, composer con envío y polling cada 3s.
 *
 * Por ahora sin adjuntos (faltan dependencias de upload). El backend
 * acepta texto plano vía POST /appointments/:id/messages.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  FileText,
  Lock,
  Paperclip,
  Send,
  X,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { Avatar } from '@/components/ui/Avatar';
import { useApi } from '@/hooks/useApi';
import {
  chatApi,
  type ChatMessageDto,
  type ChatThreadDto,
} from '@/lib/api';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const POLL_INTERVAL_MS = 3000;

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function formatDateSeparator(iso: string): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(iso, today.toISOString())) return 'Hoy';
  if (isSameDay(iso, yesterday.toISOString())) return 'Ayer';
  return new Date(iso).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PatientAppointmentChat() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const { state, refetch } = useApi<ChatThreadDto>(
    () => chatApi.list(id!),
    [id],
  );

  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    name: string;
    mime: string;
    dataUrl: string;
    size: number;
  } | null>(null);
  const lastPollAt = useRef<string | null>(null);
  const pollCount = useRef(0);
  const scrollRef = useRef<ScrollView | null>(null);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Habilitá el acceso a tus fotos.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset?.base64) return;
    const fileSize = asset.fileSize ?? (asset.base64.length * 3) / 4;
    if (fileSize > MAX_FILE_BYTES) {
      Alert.alert('Archivo muy grande', 'Máximo 5 MB.');
      return;
    }
    const mime = asset.mimeType ?? 'image/jpeg';
    const name = asset.fileName ?? `imagen-${Date.now()}.${mime.split('/')[1] ?? 'jpg'}`;
    setPendingFile({
      name,
      mime,
      dataUrl: `data:${mime};base64,${asset.base64}`,
      size: fileSize,
    });
  };

  const pickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset) return;
    if (asset.size && asset.size > MAX_FILE_BYTES) {
      Alert.alert('Archivo muy grande', 'Máximo 5 MB.');
      return;
    }
    // RN no expone base64 desde DocumentPicker. Usamos fetch local con
    // la uri file:// del fichero que devuelve el picker — RN lo
    // soporta — y leemos el blob como dataURL via FileReader.
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === 'string') resolve(result.split(',')[1] ?? '');
          else reject(new Error('Lectura inválida'));
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      const mime = asset.mimeType ?? 'application/pdf';
      setPendingFile({
        name: asset.name,
        mime,
        dataUrl: `data:${mime};base64,${base64}`,
        size: asset.size ?? 0,
      });
    } catch (err) {
      console.error('[chat] no se pudo leer el PDF', err);
      Alert.alert('Error', 'No se pudo leer el archivo.');
    }
  };

  const showAttachmentMenu = () => {
    Alert.alert('Adjuntar', '¿Qué querés enviar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Imagen', onPress: pickImage },
      { text: 'PDF', onPress: pickDocument },
    ]);
  };

  useEffect(() => {
    if (state.status === 'ready') {
      setMessages(state.data.messages);
    }
  }, [state]);

  // Polling cada 3s
  useEffect(() => {
    if (state.status !== 'ready' || !id) return;
    const interval = setInterval(async () => {
      try {
        pollCount.current += 1;
        if (pollCount.current % 5 === 0) {
          const full = await chatApi.list(id);
          setMessages(full.data.messages);
          lastPollAt.current = new Date().toISOString();
          return;
        }
        const since =
          lastPollAt.current ??
          messages[messages.length - 1]?.createdAt ??
          new Date(Date.now() - 60_000).toISOString();
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
        /* blip de red — el próximo tick reintenta */
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, state.status]);

  // Auto-scroll al fondo
  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages.length]);

  const peerName = useMemo(() => {
    if (state.status !== 'ready') return '';
    const peer = state.data.peer;
    return peer.role === 'DOCTOR'
      ? `Dr. ${peer.firstName} ${peer.lastName}`.trim()
      : `${peer.firstName} ${peer.lastName}`.trim();
  }, [state]);

  const canSend = state.status === 'ready' ? state.data.canSend : false;
  const myUserId = state.status === 'ready' ? state.data.myUserId : '';

  const handleSubmit = async () => {
    const content = draft.trim();
    if ((!content && !pendingFile) || sending || !id) return;

    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const temp: ChatMessageDto = {
      id: tempId,
      appointmentId: id,
      senderId: myUserId,
      content,
      attachmentUrl: pendingFile?.dataUrl ?? null,
      attachmentName: pendingFile?.name ?? null,
      attachmentMime: pendingFile?.mime ?? null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, temp]);
    const old = draft;
    const file = pendingFile;
    setDraft('');
    setPendingFile(null);

    try {
      const res = await chatApi.send(id, {
        content,
        ...(file && {
          attachmentUrl: file.dataUrl,
          attachmentName: file.name,
          attachmentMime: file.mime,
        }),
      });
      setMessages((prev) => prev.map((m) => (m.id === tempId ? res.data : m)));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setDraft(old);
      setPendingFile(file);
    } finally {
      setSending(false);
    }
  };

  if (state.status === 'loading') {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  if (state.status === 'error') {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
        <View className="p-5">
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center gap-1.5 mb-3">
            <ArrowLeft size={14} color="#475569" />
            <Text className="text-sm text-slate-500">Volver</Text>
          </Pressable>
          <Text className="text-rose-600">{state.error.message}</Text>
          <Pressable onPress={refetch} className="mt-2">
            <Text className="text-blue-600 text-xs font-semibold">
              Reintentar
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const { peer, appointment } = state.data;

  return (
    <SafeAreaView
      className="flex-1 bg-slate-50 dark:bg-slate-950"
      edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-3 px-3 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <Pressable
          onPress={() => router.back()}
          hitSlop={6}
          className="w-9 h-9 rounded-lg items-center justify-center">
          <ArrowLeft size={18} color="#475569" />
        </Pressable>
        <Avatar
          initials={((peer.firstName?.[0] ?? '') + (peer.lastName?.[0] ?? '')).toUpperCase() || 'DR'}
          imageUrl={peer.avatarUrl}
          size="md"
          variant={peer.role === 'DOCTOR' ? 'blue' : 'indigo'}
        />
        <View className="flex-1 min-w-0">
          <Text
            numberOfLines={1}
            className="font-semibold text-slate-800 dark:text-white">
            {peerName}
          </Text>
          <View className="flex-row items-center gap-1.5">
            {canSend ? (
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            ) : null}
            <Text
              numberOfLines={1}
              className="text-xs text-slate-500 flex-1">
              {peer.role === 'DOCTOR' ? peer.specialty ?? 'Médico' : 'Paciente'}
              {' · '}
              {new Date(appointment.date).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
              })}
              {' · '}
              {appointment.time}
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        className="flex-1">
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-3 py-3"
          contentContainerStyle={{ flexGrow: 1 }}>
          {messages.length === 0 ? (
            <View className="flex-1 items-center justify-center py-12">
              <View className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 items-center justify-center mb-3">
                <Send size={22} color="#2563eb" />
              </View>
              <Text className="text-base font-semibold text-slate-800 dark:text-white">
                Empezá la conversación
              </Text>
              <Text className="text-sm text-slate-500 text-center mt-1 max-w-[280px]">
                Esta es tu sala privada con {peerName}. Los mensajes forman
                parte de la consulta.
              </Text>
            </View>
          ) : (
            <MessagesList messages={messages} myUserId={myUserId} />
          )}
        </ScrollView>

        <View className="px-3 py-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {!canSend ? (
            <View className="flex-row items-center gap-2 px-3 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <Lock size={14} color="#64748b" />
              <Text className="text-sm text-slate-500">
                La conversación está cerrada porque la cita ya finalizó.
              </Text>
            </View>
          ) : (
            <>
              {pendingFile ? (
                <View className="flex-row items-center gap-3 p-2 pr-3 bg-slate-100 dark:bg-slate-800 rounded-xl mb-2">
                  {pendingFile.mime.startsWith('image/') ? (
                    <Image
                      source={{ uri: pendingFile.dataUrl }}
                      className="w-12 h-12 rounded-lg"
                    />
                  ) : (
                    <View className="w-12 h-12 rounded-lg bg-rose-100 dark:bg-rose-900/30 items-center justify-center">
                      <FileText size={18} color="#e11d48" />
                    </View>
                  )}
                  <View className="flex-1 min-w-0">
                    <Text
                      numberOfLines={1}
                      className="text-xs font-medium text-slate-800 dark:text-white">
                      {pendingFile.name}
                    </Text>
                    <Text className="text-[10px] text-slate-500">
                      {pendingFile.mime.startsWith('image/') ? 'Imagen' : 'PDF'}
                      {' · '}
                      {(pendingFile.size / 1024).toFixed(0)} KB
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setPendingFile(null)}
                    hitSlop={4}
                    className="p-1.5 rounded-full">
                    <X size={14} color="#475569" />
                  </Pressable>
                </View>
              ) : null}

              <View className="flex-row items-end gap-2">
                <Pressable
                  onPress={showAttachmentMenu}
                  hitSlop={4}
                  className="w-10 h-10 rounded-full items-center justify-center">
                  <Paperclip size={18} color="#475569" />
                </Pressable>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={
                    pendingFile
                      ? 'Agregá un comentario (opcional)…'
                      : 'Escribe un mensaje…'
                  }
                  placeholderTextColor="#94a3b8"
                  multiline
                  className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-2 text-sm text-slate-800 dark:text-white max-h-32"
                  style={{ minHeight: 40 }}
                />
                <Pressable
                  onPress={handleSubmit}
                  disabled={(!draft.trim() && !pendingFile) || sending}
                  className={`w-10 h-10 rounded-full items-center justify-center ${
                    (draft.trim() || pendingFile) && !sending
                      ? 'bg-blue-600 active:bg-blue-700'
                      : 'bg-slate-300 dark:bg-slate-700'
                  }`}>
                  {sending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Send size={16} color="#fff" />
                  )}
                </Pressable>
              </View>
            </>
          )}
          <View className="flex-row items-center justify-center gap-1 mt-2">
            <Lock size={9} color="#94a3b8" />
            <Text className="text-[10px] text-slate-400">
              Los mensajes son visibles sólo para vos y {peerName}.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessagesList({
  messages,
  myUserId,
}: {
  messages: ChatMessageDto[];
  myUserId: string;
}) {
  const rows = useMemo(() => {
    const out: Array<
      | { type: 'sep'; key: string; label: string }
      | {
          type: 'msg';
          key: string;
          m: ChatMessageDto;
          isMine: boolean;
          consecutive: boolean;
        }
    > = [];

    let prev: ChatMessageDto | null = null;
    for (const m of messages) {
      if (!prev || !isSameDay(prev.createdAt, m.createdAt)) {
        out.push({
          type: 'sep',
          key: `sep-${m.id}`,
          label: formatDateSeparator(m.createdAt),
        });
      }
      const isMine = m.senderId === myUserId;
      const consecutive =
        !!prev &&
        prev.senderId === m.senderId &&
        isSameDay(prev.createdAt, m.createdAt) &&
        new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() <
          5 * 60_000;
      out.push({ type: 'msg', key: m.id, m, isMine, consecutive });
      prev = m;
    }
    return out;
  }, [messages]);

  const lastMineId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]!.senderId === myUserId) return messages[i]!.id;
    }
    return null;
  }, [messages, myUserId]);

  return (
    <View>
      {rows.map((row) =>
        row.type === 'sep' ? (
          <View key={row.key} className="items-center my-3">
            <View className="px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <Text className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                {row.label}
              </Text>
            </View>
          </View>
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
    </View>
  );
}

function MessageBubble({
  message,
  isMine,
  consecutive,
  showReceipt,
}: {
  message: ChatMessageDto;
  isMine: boolean;
  consecutive: boolean;
  showReceipt: boolean;
}) {
  const isPending = message.id.startsWith('temp-');
  const isDeleted = !!message.deletedAt;
  const hasImage =
    !isDeleted &&
    !!message.attachmentUrl &&
    !!message.attachmentMime?.startsWith('image/');
  const hasPdf =
    !isDeleted &&
    !!message.attachmentUrl &&
    message.attachmentMime === 'application/pdf';
  const hasText = !!message.content && !isDeleted;

  return (
    <View
      className={`flex-row ${isMine ? 'justify-end' : 'justify-start'} ${
        consecutive ? 'mt-0.5' : 'mt-2'
      }`}>
      <View className="max-w-[78%]">
        {hasImage ? (
          <Pressable
            onPress={() =>
              message.attachmentUrl && Linking.openURL(message.attachmentUrl)
            }
            className="overflow-hidden rounded-2xl mb-1">
            <Image
              source={{ uri: message.attachmentUrl! }}
              className="w-56 h-56"
              resizeMode="cover"
            />
          </Pressable>
        ) : null}
        {hasText || hasPdf || isDeleted ? (
          <View
            className={`px-3 py-2 rounded-2xl ${
              isMine
                ? 'bg-blue-600 rounded-br-md'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-bl-md'
            } ${isDeleted ? 'opacity-60' : ''}`}>
            {isDeleted ? (
              <Text className="text-sm italic text-white">
                Mensaje eliminado
              </Text>
            ) : (
              <>
                {hasText ? (
                  <Text
                    className={`text-sm ${
                      isMine
                        ? 'text-white'
                        : 'text-slate-800 dark:text-slate-100'
                    }`}>
                    {message.content}
                  </Text>
                ) : null}
                {hasPdf ? (
                  <Pressable
                    onPress={() =>
                      message.attachmentUrl &&
                      Linking.openURL(message.attachmentUrl)
                    }
                    className={`flex-row items-center gap-2 mt-1 px-2 py-2 rounded-lg ${
                      isMine
                        ? 'bg-blue-700/40'
                        : 'bg-slate-100 dark:bg-slate-700'
                    }`}>
                    <FileText
                      size={14}
                      color={isMine ? '#fff' : '#475569'}
                    />
                    <Text
                      numberOfLines={1}
                      className={`flex-1 text-xs font-medium ${
                        isMine
                          ? 'text-white'
                          : 'text-slate-700 dark:text-slate-200'
                      }`}>
                      {message.attachmentName ?? 'Documento.pdf'}
                    </Text>
                    <Text
                      className={`text-[10px] uppercase ${
                        isMine ? 'text-blue-200' : 'text-slate-500'
                      }`}>
                      PDF
                    </Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        ) : null}
        {showReceipt ? (
          <View className="flex-row items-center gap-1 mt-0.5 self-end">
            <Text className="text-[10px] text-slate-400">
              {formatTime(message.createdAt)}
            </Text>
            <Text className="text-[10px] text-slate-400">·</Text>
            {isPending ? (
              <ActivityIndicator size="small" color="#94a3b8" />
            ) : message.readAt ? (
              <View className="flex-row items-center gap-0.5">
                <CheckCheck size={12} color="#3b82f6" />
                <Text className="text-[10px] text-blue-500">Visto</Text>
              </View>
            ) : (
              <View className="flex-row items-center gap-0.5">
                <Check size={12} color="#94a3b8" />
                <Text className="text-[10px] text-slate-400">Enviado</Text>
              </View>
            )}
          </View>
        ) : !consecutive ? (
          <Text
            className={`text-[10px] text-slate-400 mt-0.5 ${
              isMine ? 'self-end' : 'self-start'
            }`}>
            {formatTime(message.createdAt)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
