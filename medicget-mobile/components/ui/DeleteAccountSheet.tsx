/**
 * DeleteAccountSheet — modal de confirmación para eliminar cuenta.
 *
 * Muestra consecuencias según el rol, pide que el usuario escriba "ELIMINAR"
 * para confirmar, llama DELETE /users/:id y hace logout al éxito.
 */

import { useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { AlertTriangle, Trash2, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { usersApi } from '@/lib/api';

const CONFIRM_WORD = 'ELIMINAR';

const ROLE_COPY: Record<
  'patient' | 'doctor' | 'clinic',
  { title: string; bullets: string[] }
> = {
  patient: {
    title: '¿Eliminar tu cuenta de paciente?',
    bullets: [
      'Tus citas pendientes y próximas serán canceladas.',
      'Se notificará a los médicos afectados.',
      'Tu historial médico y pagos quedarán registrados por obligación legal.',
      'No podrás volver a iniciar sesión con este correo.',
    ],
  },
  doctor: {
    title: '¿Eliminar tu cuenta de médico?',
    bullets: [
      'Tus citas pendientes y próximas serán canceladas.',
      'Se notificará a los pacientes afectados.',
      'Tu perfil desaparecerá del directorio de búsqueda.',
      'El historial de citas y pagos queda registrado por obligación legal.',
    ],
  },
  clinic: {
    title: '¿Eliminar tu cuenta de clínica?',
    bullets: [
      'Todas las citas activas de tus médicos serán canceladas.',
      'Se notificará a los pacientes afectados.',
      'El perfil de la clínica desaparecerá del directorio.',
      'El historial de citas y pagos queda registrado por obligación legal.',
    ],
  },
};

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function DeleteAccountSheet({ visible, onClose }: Props) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const role = user?.role as 'patient' | 'doctor' | 'clinic' | undefined;

  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = role ? ROLE_COPY[role] : null;
  const canConfirm = confirmText.trim().toUpperCase() === CONFIRM_WORD && !loading;

  const handleClose = () => {
    setConfirmText('');
    setError(null);
    onClose();
  };

  const handleDelete = async () => {
    if (!user || !canConfirm) return;
    setLoading(true);
    setError(null);
    try {
      await usersApi.deleteAccount(user.id);
      await logout();
      handleClose();
      router.replace('/(auth)/login');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ??
        'No se pudo eliminar la cuenta. Intenta de nuevo.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!copy) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}>
      <Pressable
        className="flex-1 bg-black/50 justify-end"
        onPress={handleClose}>
        <Pressable onPress={() => {}} className="bg-white dark:bg-slate-900 rounded-t-3xl px-5 pt-5 pb-10">
          {/* Handle */}
          <View className="items-center mb-4">
            <View className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
          </View>

          {/* Header */}
          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 items-center justify-center">
                <Trash2 size={18} color="#e11d48" />
              </View>
              <Text className="text-base font-bold text-slate-900 dark:text-white flex-1">
                {copy.title}
              </Text>
            </View>
            <Pressable
              onPress={handleClose}
              className="w-8 h-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 ml-2">
              <X size={16} color="#64748b" />
            </Pressable>
          </View>

          {/* Consecuencias */}
          <View className="bg-rose-50 dark:bg-rose-900/20 rounded-2xl p-4 mb-5 gap-2">
            {copy.bullets.map((b, i) => (
              <View key={i} className="flex-row items-start gap-2">
                <View className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <Text className="text-sm text-rose-800 dark:text-rose-300 flex-1 leading-5">
                  {b}
                </Text>
              </View>
            ))}
          </View>

          {/* Advertencia */}
          <View className="flex-row items-center gap-2 mb-4">
            <AlertTriangle size={14} color="#b45309" />
            <Text className="text-xs text-amber-700 dark:text-amber-400 flex-1">
              Esta acción es <Text className="font-bold">permanente</Text> y no se puede deshacer.
            </Text>
          </View>

          {/* Confirmación */}
          <Text className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            Escribe <Text className="font-bold text-rose-600">ELIMINAR</Text> para confirmar
          </Text>
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="ELIMINAR"
            placeholderTextColor="#94a3b8"
            autoCapitalize="characters"
            autoCorrect={false}
            className="border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-base text-slate-900 dark:text-white bg-white dark:bg-slate-800 mb-4"
          />

          {error ? (
            <View className="bg-rose-50 dark:bg-rose-900/20 rounded-xl px-4 py-3 mb-4">
              <Text className="text-sm text-rose-700 dark:text-rose-300">{error}</Text>
            </View>
          ) : null}

          {/* Botones */}
          <View className="gap-3">
            <Pressable
              onPress={handleDelete}
              disabled={!canConfirm}
              className={`flex-row items-center justify-center gap-2 rounded-2xl py-3.5 ${
                canConfirm
                  ? 'bg-rose-600 active:bg-rose-700'
                  : 'bg-rose-200 dark:bg-rose-900/30'
              }`}>
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Trash2 size={16} color={canConfirm ? '#fff' : '#fda4af'} />
              )}
              <Text
                className={`text-base font-semibold ${
                  canConfirm ? 'text-white' : 'text-rose-300'
                }`}>
                {loading ? 'Eliminando...' : 'Eliminar mi cuenta'}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleClose}
              disabled={loading}
              className="items-center py-3">
              <Text className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Cancelar
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
