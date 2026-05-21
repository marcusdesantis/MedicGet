/**
 * Superadmin - Historial de pagos.
 *
 * Una sola tabla con TODOS los pagos de cita procesados por la
 * plataforma (paciente -> medico/clinica). El modelo de planes /
 * suscripciones fue eliminado, asi que ya no hay tabs por audiencia:
 * todos los pagos del sistema son de consulta.
 */

import { PageHeader }           from '@/components/ui/PageHeader';
import { PaymentsHistoryTable } from '@/features/shared/payments/PaymentsHistoryTable';

export function AdminPaymentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de pagos"
        subtitle="Todos los cobros de consulta procesados a traves de la plataforma."
      />
      <PaymentsHistoryTable />
    </div>
  );
}
