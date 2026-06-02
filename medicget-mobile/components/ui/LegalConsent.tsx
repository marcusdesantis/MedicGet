/**
 * LegalConsent (mobile) — checkbox unificado de Términos + Privacidad
 * para los 3 formularios finales de registro. Espejo del componente web.
 *
 * Los links abren las pantallas in-app `/terminos` y `/privacidad` que
 * renderizan el contenido via WebView desde el dominio público.
 */

import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';

interface LegalConsentProps {
  accepted: boolean;
  onChange: (next: boolean) => void;
  /** Mensaje de error inline (cuando intentaron enviar sin aceptar). */
  error?: string | null;
  /** Color del check para combinar con el flujo del rol. */
  tint?: 'blue' | 'teal' | 'indigo';
}

const TINT: Record<NonNullable<LegalConsentProps['tint']>, string> = {
  blue:   'bg-blue-600 border-blue-600',
  teal:   'bg-teal-600 border-teal-600',
  indigo: 'bg-indigo-600 border-indigo-600',
};

export function LegalConsent({ accepted, onChange, error, tint = 'blue' }: LegalConsentProps) {
  const router = useRouter();
  return (
    <View>
      <Pressable
        onPress={() => onChange(!accepted)}
        className="flex-row items-start gap-3 py-2">
        <View
          className={`w-5 h-5 rounded border items-center justify-center mt-0.5 ${
            accepted
              ? TINT[tint]
              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
          }`}>
          {accepted ? <Check size={14} color="#fff" /> : null}
        </View>
        <Text className="flex-1 text-sm text-slate-600 dark:text-slate-300 leading-5">
          Declaro que leí y acepto los{' '}
          <Text
            onPress={() => router.push('/terminos' as never)}
            className="text-blue-600 font-semibold">
            Términos y Condiciones
          </Text>{' '}
          y la{' '}
          <Text
            onPress={() => router.push('/privacidad' as never)}
            className="text-blue-600 font-semibold">
            Política de Privacidad
          </Text>{' '}
          de MedicGet.
        </Text>
      </Pressable>
      {error ? (
        <Text className="text-xs text-rose-600 mt-1 ml-8">{error}</Text>
      ) : null}
    </View>
  );
}
