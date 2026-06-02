/**
 * useTabBarStyle — devuelve la configuración del tab bar adaptada al
 * esquema de color actual (light / dark).
 *
 * Mantiene paridad visual con el resto de la app:
 *   - light: fondo blanco, borde slate-200, texto slate-400 inactivo
 *   - dark:  fondo slate-900, borde slate-800, texto slate-500 inactivo
 *
 * NativeWind no llega al estilo nativo del bottom tab bar (es un
 * componente nativo de react-navigation), así que tenemos que pasarle
 * estilos JS hardcoded. Para evitar duplicar la paleta en cada layout
 * de rol, centralizamos acá.
 */

import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TabBarStyle {
  tabBarActiveTintColor: string;
  tabBarInactiveTintColor: string;
  tabBarStyle: {
    backgroundColor: string;
    borderTopColor: string;
    height: number;
    paddingBottom: number;
    paddingTop: number;
  };
  tabBarLabelStyle: { fontSize: number; fontWeight: '500' };
}

/**
 * @param activeColor color del tab activo (texto + icono). Cambia por rol.
 */
export function useTabBarStyle(activeColor: string): TabBarStyle {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { bottom } = useSafeAreaInsets();
  // `bottom` es el alto de la barra de navegación del sistema (botones
  // o gestos). Varía por dispositivo: ~0 en gesture nav oculta, ~24-48
  // en dispositivos con botones visibles. Sumamos 8 dp de padding propio.
  const paddingBottom = bottom + 8;
  return {
    tabBarActiveTintColor: activeColor,
    tabBarInactiveTintColor: isDark ? '#64748b' : '#94a3b8',
    tabBarStyle: {
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
      borderTopColor: isDark ? '#1e293b' : '#e2e8f0',
      height: 56 + paddingBottom,
      paddingBottom,
      paddingTop: 6,
    },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
  };
}
