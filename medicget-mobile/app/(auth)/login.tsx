/**
 * Pantalla de login — espejo de `LoginPage.tsx` del frontend web.
 *
 * Tras un login exitoso, el usuario es redirigido al home del rol
 * correspondiente. Si la cuenta existe pero el correo no está
 * verificado, va a /verify-email con el email precargado.
 */

import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { CheckCircle2, Eye, EyeOff, Stethoscope } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { AuthCard } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useAuth, UserRole } from '@/context/AuthContext';

const ROLE_HOME: Record<UserRole, string> = {
  patient: '/(main)/(patient)',
  doctor: '/(main)/(doctor)',
  clinic: '/(main)/(clinic)',
  admin: '/(main)/(admin)',
};

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { accountDeleted } = useLocalSearchParams<{ accountDeleted?: string }>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeletedModal, setShowDeletedModal] = useState(accountDeleted === '1');

  const handleLogin = async () => {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(email.trim(), password);
      if (!result.success) {
        if (result.requiresVerification) {
          router.replace({
            pathname: '/(auth)/verify-email',
            params: { email: result.email ?? email.trim() },
          });
          return;
        }
        setError(result.error ?? 'Error al iniciar sesión');
        return;
      }
      router.replace(ROLE_HOME[result.role ?? 'patient'] as any);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <Modal
      visible={showDeletedModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowDeletedModal(false)}>
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm items-center gap-4">
          <View className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 items-center justify-center">
            <CheckCircle2 size={32} color="#10b981" />
          </View>
          <View className="items-center gap-1">
            <Text className="text-lg font-bold text-slate-900 dark:text-white text-center">
              Cuenta eliminada
            </Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400 text-center leading-5">
              Tu cuenta ha sido eliminada correctamente. Lamentamos verte partir.
            </Text>
          </View>
          <Pressable
            onPress={() => setShowDeletedModal(false)}
            className="w-full bg-emerald-600 active:bg-emerald-700 rounded-2xl py-3 items-center">
            <Text className="text-white font-semibold text-base">Entendido</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
    <AuthLayout>
      <AuthCard>
        {/* Logo + header */}
        <View className="items-center mb-6">
          <View className="w-14 h-14 rounded-2xl bg-blue-600 items-center justify-center mb-3">
            <Stethoscope size={26} color="#fff" />
          </View>
          <Text className="text-xl font-bold text-slate-800 dark:text-white">
            Bienvenido a MedicGet
          </Text>
          <Text className="text-sm text-slate-400 mt-1">Accede a tu cuenta</Text>
        </View>

        {error ? (
          <View className="mb-4">
            <Alert variant="error">{error}</Alert>
          </View>
        ) : null}

        <View className="gap-3">
          <FormField>
            <Input
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="tu@correo.com"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setError(null);
              }}
            />
          </FormField>

          <FormField>
            <Input
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              placeholder="Contraseña"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                setError(null);
              }}
              rightIcon={
                showPassword ? (
                  <EyeOff size={18} color="#94a3b8" />
                ) : (
                  <Eye size={18} color="#94a3b8" />
                )
              }
              onRightIconPress={() => setShowPassword((v) => !v)}
              onSubmitEditing={handleLogin}
            />
          </FormField>
        </View>

        <View className="mt-6">
          <Button onPress={handleLogin} loading={submitting} fullWidth>
            Iniciar sesión
          </Button>
        </View>

        <Pressable
          onPress={() => router.push('/(auth)/forgot-password')}
          className="mt-4">
          <Text className="text-sm text-center text-blue-600">
            He olvidado mi contraseña
          </Text>
        </Pressable>

        <View className="h-px bg-slate-200 dark:bg-slate-700 my-5" />

        <Text className="text-sm text-center text-slate-500">
          ¿Todavía sin cuenta?{' '}
          <Text
            onPress={() => router.push('/(auth)/register')}
            className="text-blue-600 font-semibold">
            Quiero registrarme
          </Text>
        </Text>
      </AuthCard>
    </AuthLayout>
    </>
  );
}
