/**
 * Verifica el correo con un código de 6 dígitos (o token). Al verificar
 * con éxito, el backend devuelve token JWT y user → auto-login.
 */

import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MailCheck } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { AuthCard } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useAuth, UserRole } from '@/context/AuthContext';
import { authApi } from '@/lib/api';
import { extractApiError } from '@/services/http';

const ROLE_HOME: Record<UserRole, string> = {
  patient: '/(main)/(patient)',
  doctor: '/(main)/(doctor)',
  clinic: '/(main)/(clinic)',
  admin: '/(main)/(admin)',
};

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; token?: string }>();
  const { verifyEmail } = useAuth();

  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  // Si llegamos con un token (deep link), intentamos verificar al instante.
  useEffect(() => {
    if (params.token) {
      (async () => {
        setSubmitting(true);
        const result = await verifyEmail({ token: params.token });
        setSubmitting(false);
        if (result.success) {
          router.replace(ROLE_HOME[result.role ?? 'patient'] as any);
        } else {
          setError(result.error ?? 'No se pudo verificar el correo');
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async () => {
    if (submitting) return;
    if (code.trim().length === 0) {
      setError('Ingresa el código de 6 dígitos');
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await verifyEmail({ code: code.trim(), email: email.trim() });
    setSubmitting(false);
    if (result.success) {
      router.replace(ROLE_HOME[result.role ?? 'patient'] as any);
    } else {
      setError(result.error ?? 'Código inválido');
    }
  };

  const onResend = async () => {
    if (!email.trim()) {
      setError('Ingresa tu correo para reenviar el código');
      return;
    }
    setResending(true);
    try {
      await authApi.resendVerification(email.trim().toLowerCase());
      setResent(true);
    } catch (err) {
      const { message } = extractApiError(err, 'No se pudo reenviar el código');
      setError(message);
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard>
        <View className="items-center mb-5">
          <View className="w-12 h-12 rounded-2xl bg-emerald-50 items-center justify-center mb-2">
            <MailCheck size={22} color="#059669" />
          </View>
          <Text className="text-xl font-bold text-slate-800 dark:text-white text-center">
            Verifica tu correo
          </Text>
          <Text className="text-sm text-slate-500 text-center mt-1">
            Te enviamos un código de 6 dígitos a tu correo. Ingrésalo para
            activar tu cuenta.
          </Text>
        </View>

        {error ? (
          <View className="mb-3">
            <Alert variant="error">{error}</Alert>
          </View>
        ) : null}
        {resent ? (
          <View className="mb-3">
            <Alert variant="success">Te reenviamos un nuevo código.</Alert>
          </View>
        ) : null}

        <FormField label="Correo">
          <Input
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="tu@correo.com"
            value={email}
            onChangeText={setEmail}
          />
        </FormField>

        <View className="mt-3">
          <FormField label="Código de verificación">
            <Input
              keyboardType="number-pad"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChangeText={setCode}
            />
          </FormField>
        </View>

        <View className="mt-5">
          <Button onPress={onSubmit} loading={submitting} fullWidth>
            Verificar y entrar
          </Button>
        </View>

        <Pressable onPress={onResend} disabled={resending} className="mt-4">
          <Text className="text-sm text-center text-blue-600">
            {resending ? 'Reenviando…' : '¿No recibiste el código? Reenviar'}
          </Text>
        </Pressable>
      </AuthCard>
    </AuthLayout>
  );
}
