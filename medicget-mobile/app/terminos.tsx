/**
 * Pantalla "Términos y Condiciones" móvil — renderiza el documento
 * oficial apuntando a https://medicget.io/terminos.
 * En nativo usa WebView; en web usa un iframe (react-native-webview
 * no tiene soporte web).
 */

import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

const URL = 'https://medicget.io/terminos';

export default function TerminosScreen() {
  const router = useRouter();
  return (
    <View className="flex-1 bg-white dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center gap-3 px-4 pt-12 pb-3 border-b border-slate-100 dark:border-slate-800">
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={22} color="#475569" />
        </Pressable>
        <Text className="text-base font-semibold text-slate-800 dark:text-white">
          Términos y Condiciones
        </Text>
      </View>
      {Platform.OS === 'web' ? (
        <iframe
          src={URL}
          style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
          title="Términos y Condiciones"
        />
      ) : (
        <NativeWebView url={URL} />
      )}
    </View>
  );
}

function NativeWebView({ url }: { url: string }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { WebView } = require('react-native-webview');
  return (
    <WebView
      source={{ uri: url }}
      startInLoadingState
      renderLoading={() => (
        <View className="absolute inset-0 items-center justify-center bg-white dark:bg-slate-950">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      )}
    />
  );
}
