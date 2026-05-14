/**
 * Registro de especialista (médico) — paso 1 de 2. Captura información
 * personal y profesional básica. El paso 2 (`professional-address`)
 * pide la ubicación del consultorio antes de enviar al backend.
 */

import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Eye, EyeOff, Stethoscope } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { AuthCard } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Alert } from '@/components/ui/Alert';
import { useRegistrationDraft } from '@/features/auth/registration-draft';
import {
  isClean,
  validateEmail,
  validatePassword,
  validatePhone,
  validateRequired,
} from '@/features/auth/validation';

export default function RegisterProfessionalScreen() {
  const router = useRouter();
  const [draft, setDraft] = useRegistrationDraft('doctor');
  const [showPassword, setShowPassword] = useState(false);

  const errors = useMemo(
    () => ({
      name: validateRequired(draft.name, 'El nombre'),
      lastname: validateRequired(draft.lastname, 'El apellido'),
      specialty: validateRequired(draft.specialty, 'La especialidad'),
      phone: validatePhone(draft.phone),
      email: validateEmail(draft.email),
      password: validatePassword(draft.password),
      terms: draft.terms ? null : 'Debes aceptar los términos y condiciones',
    }),
    [draft],
  );

  const canContinue = isClean(errors);

  const onNext = () => {
    if (!canContinue) return;
    router.push('/(auth)/register/professional-address');
  };

  return (
    <AuthLayout>
      <AuthCard>
        <View className="mb-4">
          <Text className="text-blue-600 font-semibold uppercase text-xs tracking-wider">
            Paso 1 de 2 · Información básica
          </Text>
          <View className="flex-row items-center mt-2 gap-2">
            <View className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center">
              <Stethoscope size={18} color="#1A82FE" />
            </View>
            <Text className="text-xl font-bold text-slate-900 dark:text-white flex-1">
              Crea tu perfil profesional
            </Text>
          </View>
        </View>

        <Alert variant="info" className="mb-4">
          Tras este paso te pediremos la ubicación de tu consultorio.
        </Alert>

        <View className="gap-3">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormField
                label="Nombre"
                error={draft.name !== '' ? errors.name : null}>
                <Input
                  placeholder="María"
                  value={draft.name}
                  onChangeText={(v) => setDraft({ name: v })}
                />
              </FormField>
            </View>
            <View className="flex-1">
              <FormField
                label="Apellido"
                error={draft.lastname !== '' ? errors.lastname : null}>
                <Input
                  placeholder="González"
                  value={draft.lastname}
                  onChangeText={(v) => setDraft({ lastname: v })}
                />
              </FormField>
            </View>
          </View>

          <FormField
            label="Especialidad"
            error={draft.specialty !== '' ? errors.specialty : null}>
            <Input
              placeholder="Cardiología, Pediatría…"
              value={draft.specialty}
              onChangeText={(v) => setDraft({ specialty: v })}
            />
          </FormField>

          <FormField
            label="Teléfono"
            error={draft.phone !== '' ? errors.phone : null}>
            <Input
              keyboardType="phone-pad"
              placeholder="+593 99 999 9999"
              value={draft.phone}
              onChangeText={(v) => setDraft({ phone: v })}
            />
          </FormField>

          <FormField
            label="Correo electrónico"
            error={draft.email !== '' ? errors.email : null}>
            <Input
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="dr.maria@correo.com"
              value={draft.email}
              onChangeText={(v) => setDraft({ email: v })}
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
            />
          </FormField>

          <Checkbox
            checked={draft.terms}
            onChange={(v) => setDraft({ terms: v })}>
            Acepto los Términos y la Política de Privacidad de MedicGet.
          </Checkbox>
        </View>

        <View className="mt-6">
          <Button onPress={onNext} disabled={!canContinue} fullWidth>
            Continuar
          </Button>
        </View>

        <Text className="text-sm text-center mt-4 text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Text
            onPress={() => router.replace('/(auth)/login')}
            className="text-blue-600 font-semibold">
            Inicia sesión
          </Text>
        </Text>
      </AuthCard>
    </AuthLayout>
  );
}
