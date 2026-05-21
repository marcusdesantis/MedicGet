/**
 * Doctor Setup - completar perfil profesional la primera vez.
 *
 * Espejo movil del DoctorSetupPage web. Se navega desde el dashboard
 * cuando el medico necesita completar especialidad, licencia, precio
 * de consulta, etc. para que sus datos aparezcan en busqueda de pacientes.
 *
 * Backend: PATCH /api/v1/doctors/{id} con los campos editables.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, Stethoscope } from 'lucide-react-native';

import { Screen } from '@/components/ui/Screen';
import { AuthCard } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/context/AuthContext';
import { doctorsApi } from '@/lib/api';
import { extractApiError } from '@/services/http';

export default function DoctorSetup() {
  const router = useRouter();
  const { user, loading, refreshMe } = useAuth();

  const doctorId = user?.dto.doctor?.id ?? null;
  const seededSpecialty = user?.dto.doctor?.specialty ?? '';

  const [form, setForm] = useState({
    specialty: seededSpecialty,
    licenseNumber: '',
    experience: '',
    pricePerConsult: '',
    bio: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Sincroniza specialty cuando AuthContext termina el bootstrap.
  useEffect(() => {
    if (!seededSpecialty) return;
    setForm((prev) =>
      prev.specialty ? prev : { ...prev, specialty: seededSpecialty },
    );
  }, [seededSpecialty]);

  // Bounce de roles equivocados.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/(auth)/login');
    } else if (user.role !== 'doctor') {
      router.replace('/(main)' as never);
    }
  }, [user, loading, router]);

  const errors = useMemo(
    () => ({
      specialty:
        form.specialty.trim().length === 0 ? 'La especialidad es obligatoria' : null,
      pricePerConsult:
        form.pricePerConsult === '' || Number(form.pricePerConsult) < 0
          ? 'El precio es obligatorio (puede ser 0 para consultas gratuitas)'
          : null,
      experience:
        form.experience !== '' && Number(form.experience) < 0
          ? 'Los anios de experiencia no pueden ser negativos'
          : null,
    }),
    [form],
  );

  const canSubmit =
    !errors.specialty &&
    !errors.pricePerConsult &&
    !errors.experience &&
    !submitting;

  const handleSubmit = async () => {
    if (!doctorId) {
      setSubmitError(
        'No encontramos tu perfil de medico. Volve a iniciar sesion.',
      );
      return;
    }
    if (!canSubmit) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await doctorsApi.update(doctorId, {
        specialty: form.specialty.trim() || 'Medico General',
        licenseNumber: form.licenseNumber.trim() || undefined,
        experience: form.experience === '' ? 0 : Number(form.experience),
        pricePerConsult:
          form.pricePerConsult === '' ? 0 : Number(form.pricePerConsult),
        bio: form.bio.trim() || undefined,
      });
      // Refrescamos el user del context para que el dashboard ya vea
      // los datos completos en el proximo render.
      await refreshMe();
      router.replace('/(main)/(doctor)');
    } catch (err) {
      const { message } = extractApiError(err, 'No se pudo guardar tu perfil');
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <Screen contentClassName="justify-center">
        <View className="items-center gap-2">
          <ActivityIndicator color="#0d9488" />
          <Text className="text-slate-500 text-sm">Cargando...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingVertical: 16 }}
        showsVerticalScrollIndicator={false}>
        <AuthCard>
          {/* Header */}
          <View className="items-center mb-5">
            <View className="w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-900/30 items-center justify-center mb-3">
              <Stethoscope size={22} color="#0d9488" />
            </View>
            <Text className="text-xl font-bold text-slate-800 dark:text-white text-center">
              Completa tu perfil profesional
            </Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400 text-center mt-1">
              Estos datos aparecen cuando los pacientes buscan especialistas.
              Podes editarlos cuando quieras desde tu panel.
            </Text>
          </View>

          {submitError ? (
            <View className="mb-4">
              <Alert variant="error">
                <Text className="text-rose-700 dark:text-rose-300 text-sm">
                  {submitError}
                </Text>
              </Alert>
            </View>
          ) : null}

          <View className="gap-4">
            {/* Especialidad: si vino del registro, mostrar chip read-only. */}
            {form.specialty.trim() ? (
              <FormField label="Especialidad">
                <View className="flex-row items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5">
                  <View className="flex-row items-center gap-2 flex-1">
                    <Stethoscope size={14} color="#0d9488" />
                    <Text
                      numberOfLines={1}
                      className="text-sm text-slate-700 dark:text-slate-200 flex-1">
                      {form.specialty}
                    </Text>
                  </View>
                  <Text className="text-[10px] text-slate-400">
                    Cambiar luego
                  </Text>
                </View>
              </FormField>
            ) : (
              <FormField label="Especialidad *" error={errors.specialty}>
                <Input
                  value={form.specialty}
                  onChangeText={(v) => setForm({ ...form, specialty: v })}
                  placeholder="Ej. Cardiologia"
                />
              </FormField>
            )}

            <FormField label="Numero de licencia / colegiatura">
              <Input
                value={form.licenseNumber}
                onChangeText={(v) => setForm({ ...form, licenseNumber: v })}
                placeholder="Ej. CMP-12345"
                autoCapitalize="characters"
              />
            </FormField>

            <FormField label="Anios de experiencia" error={errors.experience}>
              <Input
                value={form.experience}
                onChangeText={(v) => setForm({ ...form, experience: v })}
                placeholder="Ej. 5"
                keyboardType="numeric"
              />
            </FormField>

            <FormField
              label="Precio por consulta (USD) *"
              error={errors.pricePerConsult}>
              <Input
                value={form.pricePerConsult}
                onChangeText={(v) =>
                  setForm({ ...form, pricePerConsult: v.replace(',', '.') })
                }
                placeholder="Ej. 25.00"
                keyboardType="decimal-pad"
              />
            </FormField>

            <FormField label="Descripcion profesional / bio">
              <TextInput
                value={form.bio}
                onChangeText={(v) => setForm({ ...form, bio: v })}
                placeholder="Contales a tus pacientes sobre tu experiencia, enfoque clinico y formacion..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-white"
                style={{ minHeight: 90 }}
              />
            </FormField>
          </View>

          <View className="mt-4">
            <Alert variant="info">
              <Text className="text-sm text-blue-700 dark:text-blue-300">
                Los pacientes <Text className="font-bold">no podran reservar contigo</Text>{' '}
                hasta que completes este perfil y configures tus horarios desde el panel.
              </Text>
            </Alert>
          </View>

          <View className="mt-5 gap-3">
            <Button
              onPress={handleSubmit}
              disabled={!canSubmit}
              variant="primary">
              <View className="flex-row items-center justify-center gap-1.5">
                <Text className="text-white font-semibold">
                  {submitting ? 'Guardando...' : 'Guardar y continuar'}
                </Text>
                {!submitting ? (
                  <ArrowRight size={16} color="#ffffff" />
                ) : null}
              </View>
            </Button>

            <Pressable
              onPress={() => router.replace('/(main)/(doctor)')}
              disabled={submitting}
              className="py-3">
              <Text className="text-center text-slate-500 dark:text-slate-400 text-sm font-medium">
                Saltar por ahora
              </Text>
            </Pressable>
          </View>

          <Text className="text-[11px] text-center mt-3 text-slate-400">
            * Campos obligatorios
          </Text>
        </AuthCard>
      </ScrollView>
    </Screen>
  );
}
