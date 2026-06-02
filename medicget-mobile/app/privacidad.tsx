/**
 * Pantalla "Política de Privacidad" móvil — WebView apuntando a
 * https://medicget.io/privacidad. Misma estrategia que /terminos.
 */

import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { WebView } from 'react-native-webview';

export default function PrivacidadScreen() {
  const router = useRouter();
  return (
    <View className="flex-1 bg-white dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center gap-3 px-4 pt-12 pb-3 border-b border-slate-100 dark:border-slate-800">
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={22} color="#475569" />
        </Pressable>
        <Text className="text-base font-semibold text-slate-800 dark:text-white">
          Política de Privacidad
        </Text>
      </View>
      <WebView
        source={{ uri: 'https://medicget.io/privacidad' }}
        startInLoadingState
        renderLoading={() => (
          <View className="absolute inset-0 items-center justify-center bg-white dark:bg-slate-950">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        )}
      />
    </View>
  );
}
