/**
 * Registro de clínica — paso 2 de 3. Datos del responsable (admin de la
 * clínica) — nombre, correo, teléfono y contraseña.
 */

import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ArrowLeft, Eye, EyeOff, UserCog } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { AuthCard } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { useRegistrationDraft } from '@/features/auth/registration-draft';
import {
  isClean,
  validateEmail,
  validateEmailMatch,
  validatePassword,
  validatePasswordMatch,
  validatePhone,
  validateRequired,
} from '@/features/auth/validation';

export default function RegisterClinicDetailsScreen() {
  const router = useRouter();
  const [draft, setDraft] = useRegistrationDraft('clinic');
  const [showPassword, setShowPassword] = useState(false);

  const errors = useMemo(
    () => ({
      name: validateRequired(draft.name, 'El nombre'),
      lastname: validateRequired(draft.lastname, 'El apellido'),
      role: validateRequired(draft.role, 'El cargo'),
      email: validateEmail(draft.email),
      confirmEmail: validateEmailMatch(draft.email, draft.confirmEmail),
      phone: validatePhone(draft.phone),
      password: validatePassword(draft.password),
      confirmPassword: validatePasswordMatch(draft.password, draft.confirmPassword),
      acceptTerms: draft.acceptTerms ? null : 'Debes aceptar los términos',
      confirmAuthorization: draft.confirmAuthorization
        ? null
        : 'Confirma que estás autorizado para registrar esta clínica',
    }),
    [draft],
  );

  const canContinue = isClean(errors);

  return (
    <AuthLayout>
      <AuthCard>
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center gap-1 mb-3"
          hitSlop={8}>
          <ArrowLeft size={14} color="#64748b" />
          <Text className="text-sm text-slate-500">Volver</Text>
        </Pressable>

        <View className="mb-4">
          <Text className="text-indigo-600 font-semibold uppercase text-xs tracking-wider">
            Paso 2 de 3 · Datos del responsable
          </Text>
          <View className="flex-row items-center mt-2 gap-2">
            <View className="w-9 h-9 rounded-xl bg-indigo-50 items-center justify-center">
              <UserCog size={18} color="#6366f1" />
            </View>
            <Text className="text-xl font-bold text-slate-900 dark:text-white flex-1">
              ¿Quién gestiona la clínica?
            </Text>
          </View>
        </View>

        <View className="gap-3">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormField label="Nombre" error={draft.name !== '' ? errors.name : null}>
                <Input
                  placeholder="Carlos"
                  value={draft.name}
                  onChangeText={(v) => setDraft({ name: v })}
                />
              </FormField>
            </View>
            <View className="flex-1">
              <FormField label="Apellido" error={draft.lastname !== '' ? errors.lastname : null}>
                <Input
                  placeholder="Pérez"
                  value={draft.lastname}
                  onChangeText={(v) => setDraft({ lastname: v })}
                />
              </FormField>
            </View>
          </View>

          <FormField label="Cargo" error={draft.role !== '' ? errors.role : null}>
            <Input
              placeholder="Gerente, Director Médico…"
              value={draft.role}
              onChangeText={(v) => setDraft({ role: v })}
            />
          </FormField>

          <FormField
            label="Correo electrónico"
            error={draft.email !== '' ? errors.email : null}>
            <Input
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="admin@clinica.com"
              value={draft.email}
              onChangeText={(v) => setDraft({ email: v })}
            />
          </FormField>

          <FormField
            label="Confirmar correo"
            error={draft.confirmEmail !== '' ? errors.confirmEmail : null}>
            <Input
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="Repite el correo"
              value={draft.confirmEmail}
              onChangeText={(v) => setDraft({ confirmEmail: v })}
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

          <FormField
            label="Repetir contraseña"
            error={draft.confirmPassword !== '' ? errors.confirmPassword : null}>
            <Input
              secureTextEntry={!showPassword}
              placeholder="Repite tu contraseña"
              value={draft.confirmPassword}
              onChangeText={(v) => setDraft({ confirmPassword: v })}
            />
          </FormField>

          <Checkbox
            checked={draft.acceptTerms}
            onChange={(v) => setDraft({ acceptTerms: v })}>
            Acepto los Términos y la Política de Privacidad.
          </Checkbox>
          <Checkbox
            checked={draft.confirmAuthorization}
            onChange={(v) => setDraft({ confirmAuthorization: v })}>
            Confirmo que estoy autorizado para registrar esta clínica.
          </Checkbox>
        </View>

        <View className="mt-6">
          <Button
            onPress={() => router.push('/(auth)/register/clinic-address')}
            disabled={!canContinue}
            fullWidth>
            Continuar
          </Button>
        </View>
      </AuthCard>
    </AuthLayout>
  );
}
