/**
 * Stub - el sistema de planes fue eliminado; la clinica ya no tiene
 * que gestionar suscripcion. Redirige a su dashboard.
 */
import { Redirect } from 'expo-router';
export default function ClinicPlanRemoved() {
  return <Redirect href="/(main)/(clinic)" />;
}
