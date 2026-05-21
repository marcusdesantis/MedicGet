/**
 * Stub - el sistema de suscripciones fue eliminado. Redirige al inicio.
 */
import { Redirect } from 'expo-router';
export default function SubscriptionsRemoved() {
  return <Redirect href="/(main)/(admin)" />;
}
