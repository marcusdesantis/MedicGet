import { useState }      from 'react';
import { Plus, Calendar, Clock, MoreHorizontal } from 'lucide-react';
import { PageHeader }    from '@/components/ui/PageHeader';
import { Tabs }          from '@/components/ui/Tabs';
import { Avatar }        from '@/components/ui/Avatar';
import { StatusBadge }   from '@/components/ui/StatusBadge';
import { SectionCard }   from '@/components/ui/SectionCard';
import { EmptyState }    from '@/components/ui/EmptyState';
import { IconButton }    from '@/components/ui/IconButton';
import { appointmentStatusMap } from '@/lib/statusConfig';
import { patientAllAppointments } from '@/lib/mockData';

const TABS = ['Próximas', 'Pasadas', 'Canceladas'];

const TAB_STATUS_MAP: Record<string, string[]> = {
  'Próximas':   ['upcoming', 'pending'],
  'Pasadas':    ['completed'],
  'Canceladas': ['cancelled'],
};

export function PatientAppointmentsPage() {
  const [activeTab, setActiveTab] = useState('Próximas');

  const visible = patientAllAppointments.filter((a) =>
    TAB_STATUS_MAP[activeTab]?.includes(a.status)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis citas"
        subtitle="Gestiona tus citas médicas"
        action={
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700
                             text-white text-sm font-medium rounded-xl transition shadow-sm">
            <Plus size={15} /> Nueva cita
          </button>
        }
      />

      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <SectionCard noPadding>
        {visible.length === 0
          ? <EmptyState message="No hay citas en esta categoría" />
          : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {visible.map((appt) => (
                <div key={appt.id}
                     className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <Avatar initials={appt.avatar} size="lg" shape="rounded" variant="blue" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 dark:text-white">{appt.doctor}</p>
                      <StatusBadge status={appt.status} statusMap={appointmentStatusMap} size="sm" />
                    </div>
                    <p className="text-sm text-blue-600 font-medium">{appt.specialty}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{appt.notes}</p>
                  </div>
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 justify-end">
                      <Calendar size={14} /> {appt.date}
                    </p>
                    <p className="flex items-center gap-1.5 text-sm text-slate-400 justify-end mt-1">
                      <Clock size={14} /> {appt.time}
                    </p>
                  </div>
                  <IconButton icon={MoreHorizontal} />
                </div>
              ))}
            </div>
          )
        }
      </SectionCard>
    </div>
  );
}
