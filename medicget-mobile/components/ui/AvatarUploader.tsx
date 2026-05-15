/**
 * AvatarUploader — variante móvil del componente web.
 *
 *  ┌───────────┐
 *  │  Avatar   │
 *  │  cámara   │   tap → ImagePicker (galería)
 *  └───────────┘
 *   Cambiar · Quitar
 *
 * Pipeline:
 *   1. expo-image-picker abre la galería con `mediaTypes: Images`,
 *      `allowsEditing: true` (crop cuadrado) y `quality: 0.7`.
 *   2. Pedimos `base64: true` para evitar leer el fichero a mano y
 *      pasar directamente un data URL al `onChange`.
 *   3. El backend recibe el dataURL exactamente igual que en la web —
 *      cabe en la columna `avatarUrl` (TEXT) sin tocar storage externo.
 */

import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Camera, Loader2, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { Avatar } from './Avatar';

interface AvatarUploaderProps {
  value: string | null | undefined;
  initials: string;
  onChange: (next: string | null) => void;
  size?: 'lg' | 'xl';
  variant?: 'blue' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate';
  shape?: 'circle' | 'rounded';
}

export function AvatarUploader({
  value,
  initials,
  onChange,
  size = 'xl',
  variant = 'blue',
  shape = 'circle',
}: AvatarUploaderProps) {
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    setBusy(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permiso requerido',
          'Habilitá el acceso a tus fotos para cambiar tu avatar.',
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.base64) {
        Alert.alert('Error', 'No se pudo procesar la imagen.');
        return;
      }
      const mime = asset.mimeType ?? 'image/jpeg';
      const dataUrl = `data:${mime};base64,${asset.base64}`;
      onChange(dataUrl);
    } catch (err) {
      Alert.alert('Error', 'No se pudo abrir la galería.');
      console.error('[AvatarUploader] picker error', err);
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    Alert.alert('Quitar foto', '¿Eliminar tu foto de perfil?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () => onChange(null),
      },
    ]);
  };

  return (
    <View className="items-center gap-2">
      <Pressable onPress={pick} disabled={busy} className="relative">
        <Avatar
          initials={initials}
          imageUrl={value ?? null}
          size={size}
          variant={variant}
          shape={shape}
        />
        <View
          className={`absolute inset-0 ${
            shape === 'circle' ? 'rounded-full' : 'rounded-xl'
          } items-center justify-center bg-black/30`}>
          {busy ? (
            <Loader2 size={20} color="#fff" />
          ) : (
            <Camera size={20} color="#fff" />
          )}
        </View>
      </Pressable>

      <View className="flex-row items-center gap-2">
        <Pressable onPress={pick} disabled={busy} hitSlop={4}>
          <Text className="text-xs font-medium text-blue-600">
            {value ? 'Cambiar foto' : 'Subir foto'}
          </Text>
        </Pressable>
        {value ? (
          <>
            <Text className="text-slate-300">·</Text>
            <Pressable
              onPress={clear}
              disabled={busy}
              hitSlop={4}
              className="flex-row items-center gap-1">
              <Trash2 size={11} color="#e11d48" />
              <Text className="text-xs font-medium text-rose-600">Quitar</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}
