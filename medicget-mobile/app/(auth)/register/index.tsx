/**
 * Selector de tipo de cuenta — primera pantalla del wizard. Replica
 * `RegisterProfilePage.tsx` del web. El usuario elige paciente,
 * especialista o clínica y continúa al siguiente paso.
 */

import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { RadioCard } from '@/components/ui/RadioCard';
import { Button } from '@/components/ui/Button';

type Choice = 'patient' | 'specialist' | 'clinic';

export default function RegisterIndex() {
  const router = useRouter();
  const [choice, setChoice] = useState<Choice>('specialist');

  const onContinue = () => {
    if (choice === 'patient') router.push('/(auth)/register/patient');
    if (choice === 'specialist') router.push('/(auth)/register/professional');
    if (choice === 'clinic') router.push('/(auth)/register/clinic');
  };

  return (
    <AuthLayout topAligned>
      <View className="items-center mb-6 mt-4">
        <Text className="text-2xl font-bold text-slate-900 dark:text-white text-center">
          Crear una cuenta gratuita
        </Text>
        <Text className="text-slate-500 text-center mt-2 text-sm leading-5">
          Selecciona el tipo de perfil que mejor se adapte a tus necesidades.
        </Text>
      </View>

      <View className="gap-3">
        <RadioCard
          title="Soy paciente"
          description="Reserva citas, gestiona tu historial y comunícate con tus médicos."
          type="patient"
          selected={choice === 'patient'}
          onPress={() => setChoice('patient')}
        />
        <RadioCard
          title="Soy especialista"
          description="Consigue que tus pacientes te conozcan, confíen en ti y reserven contigo."
          type="specialist"
          recommended
          selected={choice === 'specialist'}
          onPress={() => setChoice('specialist')}
        />
        <RadioCard
          title="Soy gerente de una clínica"
          description="Da mayor visibilidad a tu clínica y gestiona citas eficientemente."
          type="clinic"
          selected={choice === 'clinic'}
          onPress={() => setChoice('clinic')}
        />
      </View>

      <View className="mt-8">
        <Button onPress={onContinue} fullWidth>
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
    </AuthLayout>
  );
}
