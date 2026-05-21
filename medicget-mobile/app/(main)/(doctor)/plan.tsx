/**
 * Stub - el sistema de planes fue eliminado; el medico ya no tiene
 * que gestionar suscripcion. Redirige a su dashboard.
 */
import { Redirect } from 'expo-router';
export default function DoctorPlanRemoved() {
  return <Redirect href="/(main)/(doctor)" />;
}
