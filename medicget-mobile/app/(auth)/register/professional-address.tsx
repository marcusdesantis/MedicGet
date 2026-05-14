/**
 * Registro de especialista — paso 2 de 2. Captura ubicación del
 * consultorio y envía el formulario completo al backend.
 *
 * Notas:
 *  - En la web, este paso usa LocationPicker (Leaflet). En móvil
 *    arrancamos con campos planos para no introducir dependencia
 *    de mapas en este sprint. Una siguiente iteración puede
 *    integrar react-native-maps + reverse-geocoding.
 *  - Si el backend responde con un conflicto de campo (p. ej.
 *    `email` ya registrado), volvemos al paso 1 con el campo
 *    señalado.
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

const STEP1_FIELDS = new Set([
  'name',
  'lastname',
  'specialty',
  'phone',
  'email',
  'password',
]);

export default function RegisterProfessionalAddressScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [draft, setDraft] = useRegistrationDraft('doctor');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{
    message: string;
    field?: string;
  } | null>(null);

  const errors = useMemo(
    () => ({
      country: validateRequired(draft.country, 'El país'),
      province: validateRequired(draft.province, 'La provincia/estado'),
      city: validateRequired(draft.city, 'La ciudad'),
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
      role: 'DOCTOR',
      email: draft.email.trim().toLowerCase(),
      password: draft.password,
      firstName: draft.name.trim(),
      lastName: draft.lastname.trim(),
      phone: draft.phone.trim(),
      specialty: draft.specialty.trim(),
      country: draft.country.trim(),
      province: draft.province.trim(),
      city: draft.city.trim(),
      address: draft.address.trim(),
      latitude: draft.lat ?? undefined,
      longitude: draft.lng ?? undefined,
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

    // Si el backend señala un campo del paso 1 → volver atrás.
    if (result.field && STEP1_FIELDS.has(result.field)) {
      setSubmitError({ message: result.error ?? '', field: result.field });
      router.replace({
        pathname: '/(auth)/register/professional',
        params: { focusField: result.field },
      });
      return;
    }
    setSubmitError({ message: result.error ?? 'No se pudo crear la cuenta', field: result.field });
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
          <Text className="text-blue-600 font-semibold uppercase text-xs tracking-wider">
            Paso 2 de 2 · Consultorio
          </Text>
          <View className="flex-row items-center mt-2 gap-2">
            <View className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center">
              <MapPin size={18} color="#1A82FE" />
            </View>
            <Text className="text-xl font-bold text-slate-900 dark:text-white flex-1">
              Ubicación de tu consultorio
            </Text>
          </View>
        </View>

        {submitError && (!submitError.field || !STEP1_FIELDS.has(submitError.field)) ? (
          <Alert variant="error" className="mb-3">
            {submitError.message}
          </Alert>
        ) : null}

        <View className="gap-3">
          <FormField label="Nombre del consultorio (opcional)">
            <Input
              placeholder="Consultorio Cardiología Dr. González"
              value={draft.consultName}
              onChangeText={(v) => setDraft({ consultName: v })}
            />
          </FormField>

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
            error={draft.city !== '' ? errors.city : null}>
            <Input
              placeholder="Quito"
              value={draft.city}
              onChangeText={(v) => setDraft({ city: v })}
            />
          </FormField>

          <FormField
            label="Dirección"
            error={draft.address !== '' ? errors.address : null}>
            <Input
              placeholder="Av. República 234 y Eloy Alfaro"
              value={draft.address}
              onChangeText={(v) => setDraft({ address: v })}
            />
          </FormField>

          <FormField label="Código postal (opcional)">
            <Input
              placeholder="170135"
              keyboardType="number-pad"
              value={draft.zip}
              onChangeText={(v) => setDraft({ zip: v })}
            />
          </FormField>
        </View>

        <View className="mt-6">
          <Button onPress={onSubmit} loading={submitting} disabled={!canSubmit} fullWidth>
            Crear cuenta profesional
          </Button>
        </View>
      </AuthCard>
    </AuthLayout>
  );
}
