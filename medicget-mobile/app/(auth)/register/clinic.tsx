/**
 * Registro de clínica — paso 1 de 3. Captura datos básicos de la
 * clínica antes de pedir los datos del responsable y la ubicación.
 */

import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Building2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { AuthCard } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { useRegistrationDraft } from '@/features/auth/registration-draft';
import { isClean, validateRequired } from '@/features/auth/validation';

export default function RegisterClinicScreen() {
  const router = useRouter();
  const [draft, setDraft] = useRegistrationDraft('clinic');

  const errors = useMemo(
    () => ({
      clinicName: validateRequired(draft.clinicName, 'El nombre de la clínica'),
      specialists: validateRequired(draft.specialists, 'El número de especialistas'),
      city: validateRequired(draft.city, 'La ciudad'),
    }),
    [draft],
  );

  const canContinue = isClean(errors);

  return (
    <AuthLayout>
      <AuthCard>
        <View className="mb-4">
          <Text className="text-indigo-600 font-semibold uppercase text-xs tracking-wider">
            Paso 1 de 3 · Datos de la clínica
          </Text>
          <View className="flex-row items-center mt-2 gap-2">
            <View className="w-9 h-9 rounded-xl bg-indigo-50 items-center justify-center">
              <Building2 size={18} color="#6366f1" />
            </View>
            <Text className="text-xl font-bold text-slate-900 dark:text-white flex-1">
              Tu clínica en MedicGet
            </Text>
          </View>
        </View>

        <View className="gap-3">
          <FormField
            label="Nombre de la clínica"
            error={draft.clinicName !== '' ? errors.clinicName : null}>
            <Input
              placeholder="Centro Médico San José"
              value={draft.clinicName}
              onChangeText={(v) => setDraft({ clinicName: v })}
            />
          </FormField>

          <FormField
            label="N° de especialistas"
            error={draft.specialists !== '' ? errors.specialists : null}>
            <Input
              keyboardType="number-pad"
              placeholder="10"
              value={draft.specialists}
              onChangeText={(v) => setDraft({ specialists: v })}
            />
          </FormField>

          <FormField
            label="Ciudad"
            error={draft.city !== '' ? errors.city : null}>
            <Input
              placeholder="Quito"
              value={draft.city}
              onChangeText={(v) => setDraft({ city: v })}
            />
          </FormField>
        </View>

        <View className="mt-6">
          <Button
            onPress={() => router.push('/(auth)/register/clinic-details')}
            disabled={!canContinue}
            fullWidth>
            Continuar
          </Button>
        </View>

        <Text className="text-sm text-center mt-4 text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Text
            onPress={() => router.replace('/(auth)/login')}
            className="text-indigo-600 font-semibold">
            Inicia sesión
          </Text>
        </Text>
      </AuthCard>
    </AuthLayout>
  );
}
