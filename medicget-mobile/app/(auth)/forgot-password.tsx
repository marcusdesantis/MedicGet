/**
 * Solicita un correo de recuperación. Replica el flujo del web —
 * SIEMPRE responde con success aunque el correo no exista, para evitar
 * enumerar usuarios.
 */

import { useState } from 'react';
import { Pressable, View, Text } from 'react-native';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { AuthCard } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { authApi } from '@/lib/api';
import { extractApiError } from '@/services/http';
import { validateEmail } from '@/features/auth/validation';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    const v = validateEmail(email);
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      const { message } = extractApiError(err, 'No se pudo enviar el correo');
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard>
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center gap-1 mb-3"
          hitSlop={8}>
          <ArrowLeft size={14} color="#64748b" />
          <Text className="text-sm text-slate-500">Volver al login</Text>
        </Pressable>

        <View className="items-center mb-5">
          <View className="w-12 h-12 rounded-2xl bg-blue-50 items-center justify-center mb-2">
            <Mail size={22} color="#2563eb" />
          </View>
          <Text className="text-xl font-bold text-slate-800 dark:text-white">
            Recupera tu contraseña
          </Text>
          <Text className="text-sm text-slate-500 text-center mt-1">
            Te enviaremos un enlace para restablecerla.
          </Text>
        </View>

        {sent ? (
          <Alert variant="success">
            Si existe una cuenta con ese correo, te enviamos un enlace para
            restablecer la contraseña. Revisa tu bandeja de entrada.
          </Alert>
        ) : (
          <>
            {error ? (
              <View className="mb-3">
                <Alert variant="error">{error}</Alert>
              </View>
            ) : null}

            <FormField label="Correo electrónico">
              <Input
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="tu@correo.com"
                value={email}
                onChangeText={setEmail}
              />
            </FormField>

            <View className="mt-5">
              <Button onPress={onSubmit} loading={submitting} fullWidth>
                Enviar enlace
              </Button>
            </View>
          </>
        )}
      </AuthCard>
    </AuthLayout>
  );
}
