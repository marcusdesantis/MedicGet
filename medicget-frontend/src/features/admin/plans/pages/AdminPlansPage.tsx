import { useState } from 'react';
import { Loader2, Plus, Save, X, Edit3, EyeOff, Eye } from 'lucide-react';
import { toast }       from 'sonner';
import { PageHeader }  from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { Alert }       from '@/components/ui/Alert';
import { useApi }      from '@/hooks/useApi';
import { adminApi, type PlanDto } from '@/lib/api';

const KNOWN_MODULES: { key: string; label: string }[] = [
  { key: 'ONLINE',             label: 'Videollamada' },
  { key: 'PRESENCIAL',         label: 'Cita presencial' },
  { key: 'CHAT',               label: 'Chat en vivo' },
  { key: 'REPORTS',            label: 'Reportes avanzados' },
  { key: 'PRIORITY_SEARCH',    label: 'Prioridad en búsqueda' },
  { key: 'BRANDING',           label: 'Branding propio' },
  { key: 'PAYMENTS_DASHBOARD', label: 'Panel de pagos (clínica)' },
  { key: 'MULTI_LOCATION',     label: 'Multi-sede (clínica)' },
  { key: 'PRIORITY_SUPPORT',   label: 'Soporte prioritario' },
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
    setDraft({ ...draft, modules: list.includes(mod) ? list.filter((m) => m !== mod) : [...list, mod] });
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

  return (
    <div className="space-y-6">
      <PageHeader title="Planes" subtitle="Configura los planes y precios visibles en la landing y en el flujo de suscripción" />

      <PlansAudienceBlock title="Médicos"   plans={doctorPlans} editingId={editingId} draft={draft} setDraft={setDraft} startEdit={startEdit} cancel={() => setEditingId(null)} save={save} saving={saving} toggleModule={toggleModule} toggleActive={toggleActive} />
      <PlansAudienceBlock title="Clínicas"  plans={clinicPlans} editingId={editingId} draft={draft} setDraft={setDraft} startEdit={startEdit} cancel={() => setEditingId(null)} save={save} saving={saving} toggleModule={toggleModule} toggleActive={toggleActive} />
    </div>
  );

  function PlansAudienceBlock(props: {
    title:     string;
    plans:     PlanDto[];
    editingId: string | null;
    draft:     Partial<PlanDto>;
    setDraft:  (d: Partial<PlanDto>) => void;
    startEdit: (p: PlanDto) => void;
    cancel:    () => void;
    save:      () => void;
    saving:    boolean;
    toggleModule: (mod: string) => void;
    toggleActive: (p: PlanDto) => void;
  }) {
    return (
      <SectionCard title={props.title}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {props.plans.map((p) => {
            const isEditing = props.editingId === p.id;
            return (
              <div key={p.id} className={`rounded-xl border ${isEditing ? 'border-blue-400 ring-2 ring-blue-100 dark:ring-blue-900/40' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-900 p-5 ${!p.isActive ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    {isEditing ? (
                      <input
                        value={props.draft.name ?? ''}
                        onChange={(e) => props.setDraft({ ...props.draft, name: e.target.value })}
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
                    onClick={() => props.toggleActive(p)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title={p.isActive ? 'Desactivar' : 'Reactivar'}
                  >
                    {p.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>

                <div className="mb-3">
                  {isEditing ? (
                    <input
                      type="number"
                      step="1"
                      value={props.draft.monthlyPrice ?? 0}
                      onChange={(e) => props.setDraft({ ...props.draft, monthlyPrice: Number(e.target.value) })}
                      className="w-32 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-2xl font-bold"
                    />
                  ) : (
                    <p className="text-3xl font-bold text-slate-800 dark:text-white">${p.monthlyPrice.toFixed(2)}</p>
                  )}
                  <p className="text-xs text-slate-400">por mes</p>
                </div>

                {isEditing ? (
                  <textarea
                    value={props.draft.description ?? ''}
                    onChange={(e) => props.setDraft({ ...props.draft, description: e.target.value })}
                    placeholder="Descripción visible en el pricing…"
                    rows={2}
                    className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm mb-3"
                  />
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 min-h-[3em]">{p.description}</p>
                )}

                <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Módulos incluidos</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {KNOWN_MODULES.map((m) => {
                    const list = isEditing ? (props.draft.modules ?? []) : p.modules;
                    const on = list.includes(m.key);
                    return (
                      <button
                        key={m.key}
                        onClick={() => isEditing && props.toggleModule(m.key)}
                        disabled={!isEditing}
                        className={`text-[11px] px-2 py-1 rounded-full transition ${
                          on
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                            : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                        } ${isEditing ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={props.save}
                        disabled={props.saving}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2 rounded-lg transition disabled:opacity-50"
                      >
                        {props.saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Guardar
                      </button>
                      <button onClick={props.cancel} className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => props.startEdit(p)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300 px-3 py-2 rounded-lg transition"
                    >
                      <Edit3 size={14} /> Editar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    );
  }
}
