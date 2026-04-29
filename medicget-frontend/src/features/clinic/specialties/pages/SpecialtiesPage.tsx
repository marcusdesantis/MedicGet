import { useState }     from 'react';
import { Plus, Pencil, Trash2, Stethoscope } from 'lucide-react';
import { PageHeader }   from '@/components/ui/PageHeader';
import { CardContainer } from '@/components/ui/CardContainer';
import { StatusBadge }  from '@/components/ui/StatusBadge';
import { IconButton }   from '@/components/ui/IconButton';
import { specialtyStatusMap } from '@/lib/statusConfig';
import { initialSpecialties, type MockSpecialty } from '@/lib/mockData';

const DEFAULT_COLOR = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';

export function SpecialtiesPage() {
  const [specialties, setSpecialties] = useState(initialSpecialties);
  const [showAdd,     setShowAdd]     = useState(false);
  const [newName,     setNewName]     = useState('');

  const remove = (id: number) => setSpecialties((prev) => prev.filter((s) => s.id !== id));

  const add = () => {
    if (!newName.trim()) return;
    const newEntry: MockSpecialty = {
      id:           Date.now(),
      name:         newName.trim(),
      doctors:      0,
      appointments: 0,
      color:        DEFAULT_COLOR,
      active:       true,
    };
    setSpecialties((prev) => [...prev, newEntry]);
    setNewName('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Especialidades"
        subtitle="Gestiona las especialidades médicas de la clínica"
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700
                       text-white text-sm font-medium rounded-xl transition shadow-sm"
          >
            <Plus size={15} /> Nueva especialidad
          </button>
        }
      />

      {/* Inline add form */}
      {showAdd && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-indigo-200 dark:border-indigo-800
                        shadow-sm p-4 flex items-center gap-3">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Nombre de la especialidad..."
            className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700
                       bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button onClick={add}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition">
            Añadir
          </button>
          <button onClick={() => setShowAdd(false)}
            className="px-4 py-2.5 border border-slate-200 dark:border-slate-700
                       bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300
                       hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-medium transition">
            Cancelar
          </button>
        </div>
      )}

      {/* Specialty cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {specialties.map((s) => (
          <CardContainer
            key={s.id}
            variant={s.active ? 'default' : 'dashed'}
            className={`hover:shadow-md transition-shadow ${!s.active ? 'opacity-70' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.color}`}>
                  <Stethoscope size={20} />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">{s.name}</p>
                  <div className="mt-1">
                    <StatusBadge status={s.active ? 'active' : 'inactive'} statusMap={specialtyStatusMap} size="sm" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <IconButton icon={Pencil} title="Editar"    variant="primary" size={14} />
                <IconButton icon={Trash2} title="Eliminar"  variant="danger"  size={14} onClick={() => remove(s.id)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              {[
                { label: 'Médicos',      value: s.doctors      },
                { label: 'Citas totales', value: s.appointments },
              ].map((stat) => (
                <div key={stat.label} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-slate-800 dark:text-white">{stat.value}</p>
                  <p className="text-xs text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </CardContainer>
        ))}
      </div>
    </div>
  );
}
