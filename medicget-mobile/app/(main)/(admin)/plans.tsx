/**
 * Stub - el sistema de planes fue eliminado. Esta pantalla solo
 * existe porque expo-router todavia escanea el directorio; redirige
 * automaticamente al inicio del admin.
 */
import { Redirect } from 'expo-router';
export default function PlansRemoved() {
  return <Redirect href="/(main)/(admin)" />;
}
