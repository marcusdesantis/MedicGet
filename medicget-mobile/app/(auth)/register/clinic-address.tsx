/**
 * Registro de clínica — paso 3 de 3. Ubicación física de la clínica.
 * En el envío componemos el RegisterBody con los campos `clinic*`.
 */

import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { AuthCard } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/context/AuthContext';
import {
  clearRegistrationDraft,
  useRegistrationDraft,
} from '@/features/auth/registration-draft';
import { isClean, validateRequired } from '@/features/auth/validation';

const STEP1_FIELDS = new Set(['clinicName', 'specialists', 'city']);
const STEP2_FIELDS = new Set([
  'name',
  'lastname',
  'role',
  'email',
  'phone',
  'password',
]);

export default function RegisterClinicAddressScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [draft, setDraft] = useRegistrationDraft('clinic');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{
    message: string;
    field?: string;
  } | null>(null);

  const errors = useMemo(
    () => ({
      country: validateRequired(draft.country, 'El país'),
      province: validateRequired(draft.province, 'La provincia/estado'),
      cityLocation: validateRequired(draft.cityLocation, 'La ciudad'),
      address: validateRequired(draft.address, 'La dirección'),
    }),
    [draft],
  );
  const canSubmit = isClean(errors) && !submitting;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    const result = await register({
      role: 'CLINIC',
      email: draft.email.trim().toLowerCase(),
      password: draft.password,
      firstName: draft.name.trim(),
      lastName: draft.lastname.trim(),
      phone: draft.phone.trim(),
      country: draft.country.trim(),
      province: draft.province.trim(),
      city: draft.cityLocation.trim(),
      address: draft.address.trim(),
      latitude: draft.lat ?? undefined,
      longitude: draft.lng ?? undefined,
      clinicName: draft.clinicName.trim(),
    });
    setSubmitting(false);
    if (result.success) {
      await clearRegistrationDraft();
      router.replace({
        pathname: '/(auth)/verify-email',
        params: { email: result.email ?? draft.email },
      });
      return;
    }
    if (result.field && STEP1_FIELDS.has(result.field)) {
      router.replace('/(auth)/register/clinic');
      return;
    }
    if (result.field && STEP2_FIELDS.has(result.field)) {
      router.replace('/(auth)/register/clinic-details');
      return;
    }
    setSubmitError({ message: result.error ?? 'No se pudo crear la cuenta' });
  };

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
            Paso 3 de 3 · Ubicación
          </Text>
          <View className="flex-row items-center mt-2 gap-2">
            <View className="w-9 h-9 rounded-xl bg-indigo-50 items-center justify-center">
              <MapPin size={18} color="#6366f1" />
            </View>
            <Text className="text-xl font-bold text-slate-900 dark:text-white flex-1">
              ¿Dónde está la clínica?
            </Text>
          </View>
        </View>

        {submitError ? (
          <Alert variant="error" className="mb-3">
            {submitError.message}
          </Alert>
        ) : null}

        <View className="gap-3">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormField
                label="País"
                error={draft.country !== '' ? errors.country : null}>
                <Input
                  placeholder="Ecuador"
                  value={draft.country}
                  onChangeText={(v) => setDraft({ country: v })}
                />
              </FormField>
            </View>
            <View className="flex-1">
              <FormField
                label="Provincia"
                error={draft.province !== '' ? errors.province : null}>
                <Input
                  placeholder="Pichincha"
                  value={draft.province}
                  onChangeText={(v) => setDraft({ province: v })}
                />
              </FormField>
            </View>
          </View>

          <FormField
            label="Ciudad"
            error={draft.cityLocation !== '' ? errors.cityLocation : null}>
            <Input
              placeholder="Quito"
              value={draft.cityLocation}
              onChangeText={(v) => setDraft({ cityLocation: v })}
            />
          </FormField>

          <FormField
            label="Dirección"
            error={draft.address !== '' ? errors.address : null}>
            <Input
              placeholder="Av. Amazonas N42-100"
              value={draft.address}
              onChangeText={(v) => setDraft({ address: v })}
            />
          </FormField>
        </View>

        <View className="mt-6">
          <Button onPress={onSubmit} loading={submitting} disabled={!canSubmit} fullWidth>
            Crear cuenta de clínica
          </Button>
        </View>
      </AuthCard>
    </AuthLayout>
  );
}
