import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, Pill, Heart, FileText, Plus, X, Loader2, CheckCircle2,
  Save, Edit3, Calendar as CalendarIcon,
} from 'lucide-react';
import { PageHeader }   from '@/components/ui/PageHeader';
import { SectionCard }  from '@/components/ui/SectionCard';
import { CardContainer } from '@/components/ui/CardContainer';
import { Alert }        from '@/components/ui/Alert';
import { EmptyState }   from '@/components/ui/EmptyState';
import { Button }       from '@/components/ui/Button';
import { Input }        from '@/components/ui/Input';
import { StatusBadge }  from '@/components/ui/StatusBadge';
import { Avatar }       from '@/components/ui/Avatar';
import { useApi }       from '@/hooks/useApi';
import { useAuth }      from '@/context/AuthContext';
import { appointmentStatusMap } from '@/lib/statusConfig';
import {
  patientsApi, appointmentsApi,
  type AppointmentDto, type PatientDto, type PaginatedData,
} from '@/lib/api';

/**
 * Combine YYYY-MM-DD date and HH:MM time into a Date in browser-local TZ.
 * Same convention as the booking page so all timestamps line up.
 */
function combineDateTime(date: string, time: string): Date {
  const datePart = date.length > 10 ? date.slice(0, 10) : date;
  return new Date(`${datePart}T${time}:00`);
}

function fmtLong(d: Date): string {
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

function calcAge(isoBirth?: string): number | null {
  if (!isoBirth) return null;
  const birth = new Date(isoBirth);
  if (isNaN(birth.getTime())) return null;
  const ms = Date.now() - birth.getTime();
  return Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000));
}

/**
 * Patient — Mi Historial Médico.
 *
 * Two sections:
 *   1. Datos clínicos (alergias / condiciones / medicamentos / tipo de sangre)
 *      — editable por el propio paciente. Cada lista es un panel con chips
 *      removibles + input para agregar.
 *   2. Historial de consultas — derivado de `appointmentsApi.list()` filtrando
 *      las completadas. Muestra doctor, especialidad, fecha, modalidad,
 *      notas del médico (si registró alguna).
 *
 * El doctor usa una vista similar pero read-only desde `/doctor/patients`.
 */
export function MedicalHistoryPage() {
  const { user } = useAuth();
  const patientId = user?.dto.patient?.id ?? null;

  const patientState = useApi<PatientDto>(
    () => patientsApi.getById(patientId!),
    [patientId],
  );
  const apptsState = useApi<PaginatedData<AppointmentDto>>(
    () => appointmentsApi.list({ status: 'COMPLETED', pageSize: 100 }),
    [],
  );

  if (!patientId) {
    return <Alert variant="error">No se encontró tu perfil de paciente. Vuelve a iniciar sesión.</Alert>;
  }
  if (patientState.state.status === 'loading') {
    return <div className="flex justify-center py-20 text-slate-400"><Loader2 className="animate-spin" /></div>;
  }
  if (patientState.state.status === 'error') {
    return (
      <Alert variant="error" action={
        <button onClick={patientState.refetch} className="text-sm font-medium underline">Reintentar</button>
      }>{patientState.state.error.message}</Alert>
    );
  }

  const patient = patientState.state.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial médico"
        subtitle="Tus datos clínicos y registro de consultas"
      />

      {/* ── Demographics card ─────────────────────────────────────────────── */}
      <CardContainer>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Demographic label="Edad"            value={calcAge(patient.dateOfBirth) ? `${calcAge(patient.dateOfBirth)} años` : '—'} />
          <Demographic label="Tipo de sangre"  value={patient.bloodType ?? '—'} />
          <Demographic label="Consultas"       value={String(apptsState.state.status === 'ready' ? apptsState.state.data.meta.total : 0)} />
        </div>
      </CardContainer>

      {/* ── Editable clinical lists ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ClinicalList
          patientId={patient.id}
          field="allergies"
          label="Alergias"
          icon={<AlertCircle size={16} />}
          accent="rose"
          values={patient.allergies}
          placeholder="Ej. Penicilina"
          onSaved={patientState.refetch}
        />
        <ClinicalList
          patientId={patient.id}
          field="conditions"
          label="Condiciones"
          icon={<Heart size={16} />}
          accent="amber"
          values={patient.conditions}
          placeholder="Ej. Hipertensión"
          onSaved={patientState.refetch}
        />
        <ClinicalList
          patientId={patient.id}
          field="medications"
          label="Medicamentos activos"
          icon={<Pill size={16} />}
          accent="blue"
          values={patient.medications}
          placeholder="Ej. Enalapril 10mg"
          onSaved={patientState.refetch}
        />
      </div>

      {/* ── Consultation history ─────────────────────────────────────────── */}
      <SectionCard title="Historial de consultas" subtitle="Citas que ya fueron atendidas" noPadding>
        {apptsState.state.status === 'loading' && (
          <div className="flex justify-center py-12 text-slate-400"><Loader2 className="animate-spin" /></div>
        )}
        {apptsState.state.status === 'error' && (
          <div className="p-6"><Alert variant="error">{apptsState.state.error.message}</Alert></div>
        )}
        {apptsState.state.status === 'ready' && (
          apptsState.state.data.data.length === 0 ? (
            <EmptyState
              title="Aún no tenés consultas registradas"
              description="Cuando completes tu primera consulta, las notas y el resumen aparecerán acá."
              icon={FileText}
              action={
                <Link to="/patient/search" className="text-sm text-blue-600 font-medium hover:underline">
                  Buscar médicos →
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {apptsState.state.data.data
                .slice()
                .sort((a, b) => combineDateTime(b.date, b.time).getTime() - combineDateTime(a.date, a.time).getTime())
                .map((appt) => <ConsultationItem key={appt.id} appt={appt} />)}
            </div>
          )
        )}
      </SectionCard>
    </div>
  );
}

/* ─── Subcomponents ────────────────────────────────────────────────────── */

function Demographic({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-lg font-bold text-slate-800 dark:text-white">{value}</p>
    </div>
  );
}

const ACCENT_CLASSES = {
  rose:  { bg: 'bg-rose-50 dark:bg-rose-900/20',  border: 'border-rose-200 dark:border-rose-800',   text: 'text-rose-700 dark:text-rose-300',   icon: 'text-rose-600 dark:text-rose-400',   chip: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', icon: 'text-amber-600 dark:text-amber-400', chip: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  blue:  { bg: 'bg-blue-50 dark:bg-blue-900/20',   border: 'border-blue-200 dark:border-blue-800',   text: 'text-blue-700 dark:text-blue-300',   icon: 'text-blue-600 dark:text-blue-400',   chip: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
} as const;

interface ClinicalListProps {
  patientId:   string;
  field:       'allergies' | 'conditions' | 'medications';
  label:       string;
  icon:        React.ReactNode;
  accent:      keyof typeof ACCENT_CLASSES;
  values:      string[];
  placeholder: string;
  onSaved:     () => void;
}

/**
 * Editable chip list backed by `patientsApi.update(patientId, { [field]: [...] })`.
 *
 * Keeps a local `draft` while editing; saves the whole array on blur of the
 * "save" button or when the user adds/removes via Enter. Toggle between
 * read-only and edit mode so the lists are stable when not touched.
 */
function ClinicalList({ patientId, field, label, icon, accent, values, placeholder, onSaved }: ClinicalListProps) {
  const cls = ACCENT_CLASSES[accent];
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState<string[]>(values);
  const [input,   setInput]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  // Sync draft with parent when not editing (incoming refresh).
  useEffect(() => {
    if (!editing) setDraft(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.join('|'), editing]);

  const addItem = () => {
    const v = input.trim();
    if (!v || draft.includes(v)) { setInput(''); return; }
    setDraft([...draft, v]);
    setInput('');
  };
  const removeItem = (item: string) => setDraft(draft.filter((x) => x !== item));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await patientsApi.update(patientId, { [field]: draft } as Partial<PatientDto>);
      setSavedFlash(true);
      onSaved();
      setEditing(false);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo guardar';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft(values);
    setInput('');
    setError(null);
    setEditing(false);
  };

  return (
    <div className={`${cls.bg} border ${cls.border} rounded-2xl p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center gap-2 ${cls.text} font-semibold text-sm`}>
          <span className={cls.icon}>{icon}</span>
          {label}
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className={`inline-flex items-center gap-1 text-xs font-medium ${cls.icon} hover:underline`}
          >
            <Edit3 size={11} /> Editar
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={save}
              disabled={saving}
              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${cls.icon} hover:bg-white/50 dark:hover:bg-white/5 disabled:opacity-50`}
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
              Guardar
            </button>
            <button
              onClick={cancel}
              disabled={saving}
              className="text-xs font-medium px-2 py-1 rounded text-slate-500 hover:bg-white/50 dark:hover:bg-white/5"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {savedFlash && (
        <p className={`text-xs ${cls.icon} flex items-center gap-1 mb-2`}>
          <CheckCircle2 size={11} /> Guardado
        </p>
      )}
      {error && <p className="text-xs text-rose-600 mb-2">{error}</p>}

      {/* Chips */}
      <div className="flex flex-wrap gap-2">
        {(editing ? draft : values).length === 0 && (
          <p className="text-xs text-slate-400 italic">
            {editing ? 'Aún no agregaste nada.' : 'Sin registros.'}
          </p>
        )}
        {(editing ? draft : values).map((item) => (
          <span
            key={item}
            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium ${cls.chip}`}
          >
            {item}
            {editing && (
              <button
                onClick={() => removeItem(item)}
                className="hover:bg-black/10 rounded p-0.5 -mr-1"
                aria-label={`Eliminar ${item}`}
              >
                <X size={10} />
              </button>
            )}
          </span>
        ))}
      </div>

      {/* Add input — only in edit mode */}
      {editing && (
        <div className="mt-3 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
            placeholder={placeholder}
            className="text-xs"
          />
          <Button
            onClick={addItem}
            disabled={!input.trim()}
            className={`text-xs px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border ${cls.border} ${cls.icon} disabled:opacity-50`}
          >
            <Plus size={12} />
          </Button>
        </div>
      )}
    </div>
  );
}

function ConsultationItem({ appt }: { appt: AppointmentDto }) {
  const date = combineDateTime(appt.date, appt.time);
  const profile = appt.doctor?.user?.profile;
  const initials = ((profile?.firstName?.[0] ?? '') + (profile?.lastName?.[0] ?? '')).toUpperCase() || 'DR';
  const docName = `Dr. ${[profile?.firstName, profile?.lastName].filter(Boolean).join(' ')}`.trim();

  return (
    <div className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
      <Avatar initials={initials} size="md" variant="indigo" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-slate-800 dark:text-white">{docName}</p>
          <StatusBadge status={appt.status.toLowerCase()} statusMap={appointmentStatusMap} size="sm" />
        </div>
        <p className="text-xs text-blue-600 font-medium mt-0.5">{appt.doctor?.specialty ?? '—'}</p>
        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
          <CalendarIcon size={11} /> {fmtLong(date)} · {appt.time}
          {appt.clinic && <> · {appt.clinic.name}</>}
        </p>
        {appt.notes ? (
          <div className="mt-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
            <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Notas del médico</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{appt.notes}</p>
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-400 italic">El médico no dejó notas para esta consulta.</p>
        )}
      </div>
    </div>
  );
}
