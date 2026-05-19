/**
 * Superadmin · Historial de pagos.
 *
 * Tres tabs:
 *   • Pacientes     → pagos de cita (paciente → médico/clínica)
 *   • Especialistas → pagos de suscripción de planes DOCTOR
 *   • Clínicas      → pagos de suscripción de planes CLINIC
 *
 * Cada tab pega al mismo endpoint /api/v1/payments con un query param
 * `?audience=PATIENT|DOCTOR|CLINIC` que el backend usa para filtrar.
 */

import { useState } from 'react';
import { Users, Stethoscope, Building2 } from 'lucide-react';
import { PageHeader }                  from '@/components/ui/PageHeader';
import { PaymentsHistoryTable }        from '@/features/shared/payments/PaymentsHistoryTable';
import { SubscriptionPaymentsTable }   from '@/features/shared/payments/SubscriptionPaymentsTable';

type Tab = 'PATIENT' | 'DOCTOR' | 'CLINIC';

const TABS: ReadonlyArray<{
  key:      Tab;
  label:    string;
  subtitle: string;
  icon:     typeof Users;
}> = [
  { key: 'PATIENT', label: 'Pacientes',     subtitle: 'Cobros de consultas',                icon: Users        },
  { key: 'DOCTOR',  label: 'Especialistas', subtitle: 'Suscripciones de planes profesionales', icon: Stethoscope },
  { key: 'CLINIC',  label: 'Clínicas',      subtitle: 'Suscripciones de planes para clínicas',  icon: Building2   },
];

export function AdminPaymentsPage() {
  const [tab, setTab] = useState<Tab>('PATIENT');

  const current = TABS.find((t) => t.key === tab)!;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de pagos"
        subtitle="Todos los cobros procesados a través de la plataforma — citas y suscripciones."
      />

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="-mb-px flex gap-2 sm:gap-4 overflow-x-auto" role="tablist" aria-label="Tipo de pago">
          {TABS.map((t) => {
            const Icon   = t.icon;
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={
                  'group inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap ' +
                  (active
                    ? 'border-blue-600 text-blue-700 dark:text-blue-300'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300')
                }
              >
                <Icon size={15} className={active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 group-hover:text-slate-500'} />
                {t.label}
              </button>
            );
          })}
        </nav>
        <p className="text-xs text-slate-400 mt-2 mb-3">{current.subtitle}</p>
      </div>

      {/* Tabla del tab activo. Forzamos remount con `key` para que cada
          tab arranque limpio (filtros, search y paginación independientes). */}
      {tab === 'PATIENT' && (
        <PaymentsHistoryTable key="patient" audience="PATIENT" />
      )}
      {tab === 'DOCTOR' && (
        <SubscriptionPaymentsTable key="doctor" audience="DOCTOR" />
      )}
      {tab === 'CLINIC' && (
        <SubscriptionPaymentsTable key="clinic" audience="CLINIC" />
      )}
    </div>
  );
}
