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

interface TabBarStyle {
  tabBarActiveTintColor: string;
  tabBarInactiveTintColor: string;
  tabBarStyle: {
    backgroundColor: string;
    borderTopColor: string;
  };
  tabBarLabelStyle: { fontSize: number; fontWeight: '500' };
}

/**
 * @param activeColor color del tab activo (texto + icono). Cambia por rol.
 */
export function useTabBarStyle(activeColor: string): TabBarStyle {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return {
    tabBarActiveTintColor: activeColor,
    // En dark, el "inactivo" tiene que tener más contraste contra el
    // fondo oscuro — slate-500 funciona mejor que slate-400.
    tabBarInactiveTintColor: isDark ? '#64748b' : '#94a3b8',
    tabBarStyle: {
      // slate-900 / white — mismas superficies que SectionCard.
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
      // slate-800 / slate-200 — bordes consistentes con el resto.
      borderTopColor: isDark ? '#1e293b' : '#e2e8f0',
    },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
  };
}
