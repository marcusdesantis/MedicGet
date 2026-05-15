/**
 * ReviewModal — bottom-sheet para que el paciente califique al médico
 * después de una cita COMPLETED. Mismo contrato que el ReviewModal del
 * frontend web (POST /appointments/:id/review).
 */

import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { CheckCircle2, Star } from 'lucide-react-native';

import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { appointmentsApi, type AppointmentDto } from '@/lib/api';
import { profileInitials } from '@/lib/format';

interface ReviewModalProps {
  appointment: AppointmentDto | null;
  onClose: () => void;
  onSaved: () => void;
}

function ratingCopy(n: number): string {
  if (n === 0) return 'Tocá una estrella';
  if (n === 1) return 'Muy mala experiencia';
  if (n === 2) return 'Por debajo de lo esperado';
  if (n === 3) return 'Aceptable';
  if (n === 4) return 'Buena experiencia';
  return '¡Excelente!';
}

export function ReviewModal({ appointment, onClose, onSaved }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isPublic, setPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!appointment) return null;

  const profile = appointment.doctor?.user?.profile;
  const docName = `Dr. ${[profile?.firstName, profile?.lastName].filter(Boolean).join(' ')}`.trim();

  const submit = async () => {
    if (rating === 0) {
      setError('Elegí cuántas estrellas le ponés.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await appointmentsApi.createReview(appointment.id, {
        rating,
        comment: comment.trim() || undefined,
        isPublic,
      });
      onSaved();
      reset();
    } catch (err: unknown) {
      const errObj = (err as {
        response?: { data?: { error?: { code?: string; message?: string } } };
      })?.response?.data?.error;
      const code = errObj?.code;
      const msg = errObj?.message ?? 'No se pudo enviar la reseña';
      if (code === 'CONFLICT') {
        onSaved();
        reset();
        return;
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setRating(0);
    setComment('');
    setPublic(true);
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      visible={!!appointment}
      onClose={close}
      title="Calificar consulta"
      footer={
        <Button onPress={submit} disabled={rating === 0 || saving} loading={saving} fullWidth>
          <View className="flex-row items-center gap-2">
            <CheckCircle2 size={16} color="#fff" />
            <Text className="text-white text-base font-semibold">
              Enviar reseña
            </Text>
          </View>
        </Button>
      }>
      <View className="flex-row items-center gap-3">
        <Avatar
          initials={profileInitials(profile, 'DR')}
          imageUrl={profile?.avatarUrl ?? null}
          size="md"
          shape="rounded"
          variant="blue"
        />
        <View className="flex-1 min-w-0">
          <Text className="font-bold text-slate-800 dark:text-white">
            {docName}
          </Text>
          <Text className="text-xs text-slate-500">
            {appointment.doctor?.specialty} ·{' '}
            {new Date(appointment.date).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
      </View>

      <View className="mt-5">
        <Text className="text-xs font-semibold text-slate-500 mb-2">
          ¿Cómo fue tu experiencia?
        </Text>
        <View className="flex-row items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = rating >= n;
            return (
              <Pressable
                key={n}
                onPress={() => setRating(n)}
                hitSlop={4}
                className="p-1">
                <Star
                  size={32}
                  color={active ? '#f59e0b' : '#cbd5e1'}
                  fill={active ? '#fbbf24' : 'transparent'}
                />
              </Pressable>
            );
          })}
        </View>
        <Text className="text-xs text-slate-500 mt-1.5 h-4">
          {ratingCopy(rating)}
        </Text>
      </View>

      <View className="mt-4">
        <Text className="text-xs font-semibold text-slate-500 mb-2">
          Comentario (opcional)
        </Text>
        <TextInput
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={3}
          maxLength={500}
          placeholder="Contale a otros pacientes cómo te atendió, qué destacarías…"
          placeholderTextColor="#94a3b8"
          textAlignVertical="top"
          className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100 min-h-[88px]"
        />
        <Text className="text-[10px] text-slate-400 text-right mt-1">
          {comment.length}/500
        </Text>
      </View>

      <View className="mt-3">
        <Pressable
          onPress={() => setPublic((v) => !v)}
          className="flex-row items-start gap-2">
          <View className="mt-0.5">
            <Checkbox checked={isPublic} onChange={setPublic} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Publicar como reseña pública
            </Text>
            <Text className="text-xs text-slate-500 mt-0.5">
              {isPublic
                ? 'Otros pacientes verán tu reseña (sólo nombre + inicial del apellido).'
                : 'Sólo el médico verá tu reseña — sirve para feedback privado.'}
            </Text>
          </View>
        </Pressable>
      </View>

      {error ? (
        <View className="mt-3">
          <Alert variant="error">{error}</Alert>
        </View>
      ) : null}
    </Modal>
  );
}
