import { PageHeader } from '@/components/ui/PageHeader';
import { PaymentsHistoryTable } from '@/features/shared/payments/PaymentsHistoryTable';

/**
 * Superadmin · Historial de pagos.
 * Lista todos los pagos del sistema (todos los pacientes/médicos/clínicas).
 */
export function AdminPaymentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de pagos"
        subtitle="Todos los cobros de consultas procesados a través de la plataforma"
      />
      <PaymentsHistoryTable />
    </div>
  );
}
