import { useState } from 'react';
import {
  Loader2, Save, X, Edit3, EyeOff, Eye, Users, DollarSign, BadgeCheck,
} from 'lucide-react';
import { toast }       from 'sonner';
import { PageHeader }  from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { Alert }       from '@/components/ui/Alert';
import { useApi }      from '@/hooks/useApi';
import { adminApi, type PlanDto } from '@/lib/api';

/**
 * Catalogo de modulos agrupado por categoria. Hace que la edicion sea
 * mas legible que tener 9 chips sueltos. MULTI_LOCATION fue removido —
 * el dominio no tiene sedes secundarias.
 */
const MODULE_GROUPS: Array<{
  title: string;
  modules: Array<{ key: string; label: string; description: string }>;
}> = [
  {
    title: 'Modalidades de atencion',
    modules: [
      { key: 'ONLINE',     label: 'Videollamada',  description: 'Consulta remota por video.' },
      { key: 'PRESENCIAL', label: 'Presencial',    description: 'Consulta en el consultorio fisico.' },
      { key: 'CHAT',       label: 'Chat en vivo',  description: 'Mensajeria bidireccional con el paciente.' },
    ],
  },
  {
    title: 'Funcionalidades',
    modules: [
      { key: 'REPORTS',            label: 'Reportes avanzados',   description: 'Bloquea /reports si no esta incluido. Dashboards + exportacion CSV.' },
      { key: 'PAYMENTS_DASHBOARD', label: 'Panel de pagos',        description: 'Bloquea /payments si no esta incluido. Conciliacion de cobros y comisiones.' },
    ],
  },
  {
    title: 'Visibilidad',
    modules: [
      { key: 'PRIORITY_SEARCH',  label: 'Prioridad en directorio', description: 'Los medicos con este modulo aparecen primero en /medicos.' },
    ],
  },
  // NOTA: removimos los modulos "fantasma" del catalogo:
  //  - BRANDING: no hay implementacion de logo/colores custom.
  //  - PRIORITY_SUPPORT: no hay sistema de tickets diferenciado.
  //  - MULTI_LOCATION: el dominio no modela sedes secundarias.
  // Cuando se construyan esas features se agregan de nuevo aca.
];

export function AdminPlansPage() {
  const { state, refetch } = useApi(() => adminApi.listPlans(), []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft,     setDraft]     = useState<Partial<PlanDto>>({});
  const [saving,    setSaving]    = useState(false);

  const startEdit = (p: PlanDto) => {
    setEditingId(p.id);
    setDraft(p);
  };

  const save = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await adminApi.updatePlan(editingId, {
        name:         draft.name,
        description:  draft.description,
        monthlyPrice: draft.monthlyPrice,
        modules:      draft.modules,
        maxDoctors:   draft.audience === 'CLINIC' ? (draft.maxDoctors ?? null) : null,
        isActive:     draft.isActive,
      });
      toast.success('Plan guardado');
      setEditingId(null);
      refetch();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Error al guardar';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: PlanDto) => {
    try {
      await adminApi.updatePlan(p.id, { isActive: !p.isActive });
      refetch();
    } catch {
      toast.error('No se pudo actualizar');
    }
  };

  const toggleModule = (mod: string) => {
    const list = draft.modules ?? [];
    setDraft({
      ...draft,
      modules: list.includes(mod) ? list.filter((m) => m !== mod) : [...list, mod],
    });
  };

  if (state.status === 'loading') {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }
  if (state.status === 'error') {
    return <Alert variant="error" action={
      <button onClick={refetch} className="text-sm font-medium underline">Reintentar</button>
    }>{state.error.message}</Alert>;
  }

  const doctorPlans = state.data.filter((p) => p.audience === 'DOCTOR');
  const clinicPlans = state.data.filter((p) => p.audience === 'CLINIC');

  const blockProps = {
    editingId, draft, setDraft, startEdit,
    cancel: () => setEditingId(null), save, saving, toggleModule, toggleActive,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planes"
        subtitle="Configura precios, cupos de medicos y modulos por plan"
      />

      <PlansBlock
        title="Medicos independientes"
        subtitle="Profesionales sin clinica asociada. Aplican a cada medico individualmente."
        plans={doctorPlans}
        {...blockProps}
      />

      <PlansBlock
        title="Clinicas"
        subtitle="Aplican a la clinica completa. Los medicos asociados heredan estas funciones."
        plans={clinicPlans}
        {...blockProps}
      />
    </div>
  );
}

interface BlockProps {
  title:        string;
  subtitle?:    string;
  plans:        PlanDto[];
  editingId:    string | null;
  draft:        Partial<PlanDto>;
  setDraft:     (d: Partial<PlanDto>) => void;
  startEdit:    (p: PlanDto) => void;
  cancel:       () => void;
  save:         () => void;
  saving:       boolean;
  toggleModule: (mod: string) => void;
  toggleActive: (p: PlanDto) => void;
}

function PlansBlock(props: BlockProps) {
  return (
    <SectionCard title={props.title} subtitle={props.subtitle}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {props.plans.map((p) => (
          <PlanCard
            key={p.id}
            plan={p}
            isEditing={props.editingId === p.id}
            draft={props.draft}
            setDraft={props.setDraft}
            startEdit={props.startEdit}
            cancel={props.cancel}
            save={props.save}
            saving={props.saving}
            toggleModule={props.toggleModule}
            toggleActive={props.toggleActive}
          />
        ))}
      </div>
    </SectionCard>
  );
}

interface CardProps {
  plan:         PlanDto;
  isEditing:    boolean;
  draft:        Partial<PlanDto>;
  setDraft:     (d: Partial<PlanDto>) => void;
  startEdit:    (p: PlanDto) => void;
  cancel:       () => void;
  save:         () => void;
  saving:       boolean;
  toggleModule: (mod: string) => void;
  toggleActive: (p: PlanDto) => void;
}

function PlanCard({
  plan: p, isEditing, draft, setDraft,
  startEdit, cancel, save, saving, toggleModule, toggleActive,
}: CardProps) {
  const isClinic = p.audience === 'CLINIC';
  const modules    = isEditing ? (draft.modules ?? []) : p.modules;
  const maxDoctors = isEditing ? draft.maxDoctors : p.maxDoctors;

  return (
    <div className={`rounded-2xl border-2 transition ${
      isEditing
        ? 'border-blue-400 ring-2 ring-blue-100 dark:ring-blue-900/40'
        : 'border-slate-200 dark:border-slate-700'
    } bg-white dark:bg-slate-900 p-5 ${!p.isActive ? 'opacity-60' : ''}`}>

      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              value={draft.name ?? ''}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-base font-bold"
            />
          ) : (
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">{p.name}</h3>
          )}
          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500">
            {p.code}
          </span>
        </div>
        <button
          onClick={() => toggleActive(p)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex-shrink-0"
          title={p.isActive ? 'Desactivar plan' : 'Reactivar plan'}
        >
          {p.isActive ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
      </div>

      <FieldGroup icon={DollarSign} label="Precio mensual (USD)">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold text-slate-400">$</span>
            <input
              type="number"
              step="1"
              min="0"
              value={draft.monthlyPrice ?? 0}
              onChange={(e) => setDraft({ ...draft, monthlyPrice: Number(e.target.value) })}
              className="w-28 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-2xl font-bold"
            />
            <span className="text-xs text-slate-400 ml-2">/mes</span>
          </div>
        ) : (
          <p className="text-3xl font-bold text-slate-800 dark:text-white">
            ${p.monthlyPrice.toFixed(2)}
            <span className="text-xs font-normal text-slate-400 ml-1">/mes</span>
          </p>
        )}
      </FieldGroup>

      {isClinic && (
        <FieldGroup icon={Users} label="Cupo de medicos">
          {isEditing ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={maxDoctors == null ? '' : maxDoctors}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraft({ ...draft, maxDoctors: v === '' ? null : Number(v) });
                  }}
                  placeholder="Ej: 15"
                  disabled={maxDoctors == null}
                  className="w-28 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-lg font-bold disabled:opacity-50"
                />
                <span className="text-xs text-slate-400">medicos maximo</span>
              </div>
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={maxDoctors == null}
                  onChange={(e) => setDraft({
                    ...draft,
                    maxDoctors: e.target.checked ? null : 15,
                  })}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Sin limite (enterprise)
              </label>
            </div>
          ) : (
            <p className="text-lg font-bold text-slate-800 dark:text-white">
              {p.maxDoctors == null ? (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <BadgeCheck size={16} /> Ilimitado
                </span>
              ) : (
                <>
                  Hasta {p.maxDoctors} <span className="text-xs font-normal text-slate-400">medicos</span>
                </>
              )}
            </p>
          )}
        </FieldGroup>
      )}

      <div className="mb-4">
        <p className="text-xs uppercase tracking-wider text-slate-400 mb-1.5">Descripcion</p>
        {isEditing ? (
          <textarea
            value={draft.description ?? ''}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="Descripcion visible en el pricing..."
            rows={2}
            className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm"
          />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400 min-h-[3em]">
            {p.description || <span className="italic text-slate-400">Sin descripcion</span>}
          </p>
        )}
      </div>

      <div className="mb-4">
        <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Modulos incluidos</p>
        <div className="space-y-3">
          {MODULE_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                {group.title}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.modules.map((m) => {
                  const on = modules.includes(m.key);
                  return (
                    <button
                      key={m.key}
                      onClick={() => isEditing && toggleModule(m.key)}
                      disabled={!isEditing}
                      title={m.description}
                      className={`text-[11px] px-2.5 py-1 rounded-full transition ${
                        on
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium'
                          : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                      } ${isEditing ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        {isEditing ? (
          <>
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2.5 rounded-lg transition disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Guardar
            </button>
            <button
              onClick={cancel}
              className="inline-flex items-center justify-center px-3 py-2.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <button
            onClick={() => startEdit(p)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300 px-3 py-2.5 rounded-lg transition"
          >
            <Edit3 size={14} /> Editar plan
          </button>
        )}
      </div>
    </div>
  );
}

function FieldGroup({
  icon: Icon, label, children,
}: {
  icon: typeof Users;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <p className="text-xs uppercase tracking-wider text-slate-400 mb-1.5 inline-flex items-center gap-1">
        <Icon size={11} /> {label}
      </p>
      {children}
    </div>
  );
}
