/**
 * Reset password — el usuario llega aquí desde el deep link enviado por
 * email (medicget://reset-password?token=xxx). Pide nueva contraseña dos
 * veces, valida y llama al backend.
 */

import { useState } from 'react';
import { Text, View } from 'react-native';
import { Eye, EyeOff, KeyRound } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { AuthCard } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { authApi } from '@/lib/api';
import { extractApiError } from '@/services/http';
import {
  isClean,
  validatePassword,
  validatePasswordMatch,
} from '@/features/auth/validation';

export default function ResetPasswordScreen() {
  const { token: tokenParam } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();

  const [token, setToken] = useState(tokenParam ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const errors = {
    token: token.trim().length > 0 ? null : 'El token es obligatorio',
    password: validatePassword(password),
    confirm: validatePasswordMatch(password, confirm),
  };

  const onSubmit = async () => {
    if (!isClean(errors)) {
      setError('Revisa los campos antes de continuar.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await authApi.resetPassword(token.trim(), password);
      setDone(true);
    } catch (err) {
      const { message } = extractApiError(
        err,
        'No se pudo restablecer la contraseña',
      );
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard>
        <View className="items-center mb-5">
          <View className="w-12 h-12 rounded-2xl bg-blue-50 items-center justify-center mb-2">
            <KeyRound size={22} color="#2563eb" />
          </View>
          <Text className="text-xl font-bold text-slate-800 dark:text-white">
            Nueva contraseña
          </Text>
        </View>

        {done ? (
          <>
            <Alert variant="success">
              Tu contraseña se actualizó correctamente.
            </Alert>
            <View className="mt-4">
              <Button onPress={() => router.replace('/(auth)/login')} fullWidth>
                Ir al login
              </Button>
            </View>
          </>
        ) : (
          <>
            {error ? (
              <View className="mb-3">
                <Alert variant="error">{error}</Alert>
              </View>
            ) : null}

            <FormField label="Token" hint="Cópialo del enlace del correo">
              <Input
                placeholder="Pega aquí el token"
                value={token}
                onChangeText={setToken}
                autoCapitalize="none"
              />
            </FormField>

            <View className="mt-3">
              <FormField
                label="Nueva contraseña"
                error={password.length > 0 ? errors.password : null}>
                <Input
                  secureTextEntry={!showPassword}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChangeText={setPassword}
                  rightIcon={
                    showPassword ? (
                      <EyeOff size={18} color="#94a3b8" />
                    ) : (
                      <Eye size={18} color="#94a3b8" />
                    )
                  }
                  onRightIconPress={() => setShowPassword((v) => !v)}
                />
              </FormField>
            </View>

            <View className="mt-3">
              <FormField
                label="Repite la contraseña"
                error={confirm.length > 0 ? errors.confirm : null}>
                <Input
                  secureTextEntry={!showPassword}
                  placeholder="Repite la contraseña"
                  value={confirm}
                  onChangeText={setConfirm}
                />
              </FormField>
            </View>

            <View className="mt-5">
              <Button onPress={onSubmit} loading={submitting} fullWidth>
                Cambiar contraseña
              </Button>
            </View>
          </>
        )}
      </AuthCard>
    </AuthLayout>
  );
}
