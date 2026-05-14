/**
 * Registro de paciente — pantalla única. Replica
 * `RegisterPatientPage.tsx` del web. Al enviar, el backend pide
 * verificación de email y redirige a /verify-email.
 */

import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { AuthCard } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Checkbox } from '@/components/ui/Checkbox';
import { useAuth } from '@/context/AuthContext';
import { useRegistrationDraft } from '@/features/auth/registration-draft';
import {
  isClean,
  validateEmail,
  validateEmailMatch,
  validatePassword,
  validateRequired,
} from '@/features/auth/validation';
import { clearRegistrationDraft } from '@/features/auth/registration-draft';

const PAGE_FIELDS = new Set([
  'firstName',
  'lastName',
  'email',
  'confirmEmail',
  'password',
]);

export default function RegisterPatientScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [draft, setDraft] = useRegistrationDraft('patient');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{
    message: string;
    field?: string;
  } | null>(null);

  const clientErrors = useMemo(
    () => ({
      firstName: validateRequired(draft.firstName, 'El nombre'),
      lastName: validateRequired(draft.lastName, 'El apellido'),
      email: validateEmail(draft.email),
      confirmEmail: validateEmailMatch(draft.email, draft.confirmEmail),
      password: validatePassword(draft.password),
    }),
    [draft],
  );

  const errors = useMemo(() => {
    const merged: Record<string, string | null> = { ...clientErrors };
    if (submitError?.field && PAGE_FIELDS.has(submitError.field)) {
      merged[submitError.field] = submitError.message;
    }
    return merged;
  }, [clientErrors, submitError]);

  const canSubmit = isClean(clientErrors) && !submitting;
  const generalError =
    submitError && (!submitError.field || !PAGE_FIELDS.has(submitError.field))
      ? submitError.message
      : null;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    const result = await register({
      role: 'PATIENT',
      email: draft.email.trim().toLowerCase(),
      password: draft.password,
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
    });
    setSubmitting(false);
    if (result.success) {
      await clearRegistrationDraft();
      router.replace({
        pathname: '/(auth)/verify-email',
        params: { email: result.email ?? draft.email },
      });
    } else {
      setSubmitError({
        message: result.error ?? 'No se pudo crear la cuenta',
        field: result.field,
      });
    }
  };

  return (
    <AuthLayout>
      <AuthCard>
        <View className="items-center mb-5">
          <View className="w-12 h-12 rounded-full bg-emerald-50 items-center justify-center mb-2">
            <ShieldCheck size={22} color="#059669" />
          </View>
          <Text className="text-xl font-bold text-slate-800 dark:text-white text-center">
            Crea tu perfil de salud
          </Text>
          <Text className="text-sm text-slate-500 text-center mt-1">
            Únete a MedicGet y gestiona tus citas fácilmente.
          </Text>
        </View>

        {generalError ? (
          <View className="mb-3">
            <Alert variant="error">{generalError}</Alert>
          </View>
        ) : null}

        <View className="gap-3">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormField
                label="Nombre"
                error={draft.firstName !== '' || submitError?.field === 'firstName' ? errors.firstName : null}>
                <Input
                  placeholder="María"
                  value={draft.firstName}
                  onChangeText={(v) => {
                    setDraft({ firstName: v });
                    if (submitError?.field === 'firstName') setSubmitError(null);
                  }}
                  error={!!errors.firstName && draft.firstName !== ''}
                />
              </FormField>
            </View>
            <View className="flex-1">
              <FormField
                label="Apellidos"
                error={draft.lastName !== '' || submitError?.field === 'lastName' ? errors.lastName : null}>
                <Input
                  placeholder="González"
                  value={draft.lastName}
                  onChangeText={(v) => {
                    setDraft({ lastName: v });
                    if (submitError?.field === 'lastName') setSubmitError(null);
                  }}
                  error={!!errors.lastName && draft.lastName !== ''}
                />
              </FormField>
            </View>
          </View>

          <FormField
            label="Correo electrónico"
            error={draft.email !== '' || submitError?.field === 'email' ? errors.email : null}>
            <Input
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="ejemplo@correo.com"
              value={draft.email}
              onChangeText={(v) => {
                setDraft({ email: v });
                if (submitError?.field === 'email') setSubmitError(null);
              }}
              error={!!errors.email && draft.email !== ''}
            />
          </FormField>

          <FormField
            label="Confirmar correo"
            error={draft.confirmEmail !== '' ? errors.confirmEmail : null}>
            <Input
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="Repite tu correo"
              value={draft.confirmEmail}
              onChangeText={(v) => setDraft({ confirmEmail: v })}
              error={!!errors.confirmEmail && draft.confirmEmail !== ''}
            />
          </FormField>

          <FormField
            label="Contraseña"
            error={draft.password !== '' ? errors.password : null}>
            <Input
              secureTextEntry={!showPassword}
              placeholder="Mínimo 6 caracteres"
              value={draft.password}
              onChangeText={(v) => setDraft({ password: v })}
              rightIcon={
                showPassword ? (
                  <EyeOff size={18} color="#94a3b8" />
                ) : (
                  <Eye size={18} color="#94a3b8" />
                )
              }
              onRightIconPress={() => setShowPassword((v) => !v)}
              error={!!errors.password && draft.password !== ''}
            />
          </FormField>

          <Checkbox
            checked={draft.marketing}
            onChange={(v) => setDraft({ marketing: v })}>
            Quiero recibir consejos de salud y ofertas exclusivas.
          </Checkbox>
        </View>

        <View className="mt-6">
          <Button
            onPress={onSubmit}
            loading={submitting}
            disabled={!canSubmit}
            variant="success"
            fullWidth>
            Crear mi cuenta
          </Button>
        </View>

        <Text className="text-xs text-slate-400 text-center mt-5">
          Al registrarte aceptas los Términos de Servicio y la Política de
          Privacidad.
        </Text>

        <Text className="text-sm text-center mt-3 text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Text
            onPress={() => router.replace('/(auth)/login')}
            className="text-emerald-700 font-semibold">
            Inicia sesión
          </Text>
        </Text>
      </AuthCard>
    </AuthLayout>
  );
}
