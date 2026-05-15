/**
 * Screen — contenedor raíz de cada pantalla. Aplica SafeAreaView + scroll
 * + KeyboardAvoiding cuando se pide. Estandariza padding horizontal.
 */

import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  useColorScheme,
  View,
} from 'react-native';
import { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  /** Por defecto la pantalla evita el teclado en iOS. Desactivar en pantallas con bottom-sheet. */
  avoidKeyboard?: boolean;
  className?: string;
  contentClassName?: string;
}

export function Screen({
  children,
  scroll = true,
  avoidKeyboard = true,
  className = '',
  contentClassName = '',
}: ScreenProps) {
  const scheme = useColorScheme();
  // En dark mode el texto/iconos de la barra de estado tienen que ser
  // claros para contrastar con el fondo slate-950. Sin esto las horas
  // y el reloj se ven negros sobre negro.
  const statusBarStyle = scheme === 'dark' ? 'light-content' : 'dark-content';
  const Inner = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1 }}>
      <View
        className={['flex-grow px-5 pb-10 pt-4', contentClassName]
          .filter(Boolean)
          .join(' ')}>
        {children}
      </View>
    </ScrollView>
  ) : (
    <View className={['flex-1 px-5 py-4', contentClassName].filter(Boolean).join(' ')}>
      {children}
    </View>
  );

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      className={['flex-1 bg-slate-50 dark:bg-slate-950', className]
        .filter(Boolean)
        .join(' ')}>
      <StatusBar barStyle={statusBarStyle} />
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
          {Inner}
        </KeyboardAvoidingView>
      ) : (
        Inner
      )}
    </SafeAreaView>
  );
}
