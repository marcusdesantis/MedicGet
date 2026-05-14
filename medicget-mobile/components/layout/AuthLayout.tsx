/**
 * AuthLayout — wrapper visual de todas las pantallas de auth/registro.
 * Centra el contenido vertical/horizontalmente y aplica el fondo gradiente
 * tenue del web (azul muy claro → slate-50).
 */

import { ReactNode } from 'react';
import { View } from 'react-native';
import { Screen } from '@/components/ui/Screen';

interface AuthLayoutProps {
  children: ReactNode;
  /** Si es true el contenido se alinea al top en lugar de centrarse. Útil
   *  para pantallas largas como el wizard de registro de clínica. */
  topAligned?: boolean;
}

export function AuthLayout({ children, topAligned }: AuthLayoutProps) {
  return (
    <Screen contentClassName={topAligned ? '' : 'justify-center'}>
      <View className={topAligned ? '' : 'py-4'}>{children}</View>
    </Screen>
  );
}
