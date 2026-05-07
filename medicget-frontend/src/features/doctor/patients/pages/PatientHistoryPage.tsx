import { useMemo, useState } from 'react';
import { ChevronRight, FileText, Calendar, Loader2, Users, AlertCircle, Heart, Pill } from 'lucide-react';
import { PageHeader }   from '@/components/ui/PageHeader';
import { SearchInput }  from '@/components/ui/SearchInput';
import { SectionCard }  from '@/components/ui/SectionCard';
import { Avatar }       from '@/components/ui/Avatar';
import { StatusBadge }  from '@/components/ui/StatusBadge';
import { EmptyState }   from '@/components/ui/EmptyState';
import { Alert }        from '@/components/ui/Alert';
import { useApi }       from '@/hooks/useApi';
import { appointmentStatusMap } from '@/lib/statusConfig';
import { appointmentsApi, patientsApi, type AppointmentDto, type PatientDto, type PaginatedData } from '@/lib/api';

/**
 * Summary built per patient from the doctor's full appointment list.
 * Prisma doesn't have a "patient summary per doctor" endpoint yet, so we
 * derive these aggregates client-side. If the volume grows, we can add a
 * dedicated endpoint that returns this shape directly.
 */
interface PatientSummary {
  patientId:    string;
  fullName:     string;
  email?:       string;
  initials:     string;
  visits:       number;
  completed:    number;
  lastVisit:    Date | null;
  nextVisit:    Date | null;
  appointments: AppointmentDto[];
}

function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function combineDateTime(date: string, time: string): Date {
  const datePart = date.length > 10 ? date.slice(0, 10) : date;
  return new Date(`${datePart}T${time}:00`);
}

function summariseByPatient(list: AppointmentDto[]): PatientSummary[] {
  const map = new Map<string, PatientSummary>();
  const now = Date.now();

  for (const appt of list) {
    const id = appt.patient?.id;
    if (!id) continue;
    const profile = appt.patient.user?.profile;
    const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Paciente';
    const initials = ((profile?.firstName?.[0] ?? '') + (profile?.lastName?.[0] ?? '')).toUpperCase() || 'PT';
    const apptDate = combineDateTime(appt.date, appt.time);

    const summary = map.get(id) ?? {
      patientId:    id,
      fullName:     name,
      email:        (appt.patient as { user?: { email?: string } }).user?.email,
      initials,
      visits:       0,
      completed:    0,
      lastVisit:    null,
      nextVisit:    null,
      appointments: [],
    };

    summary.visits += 1;
    if (appt.status === 'COMPLETED') summary.completed += 1;
    if (apptDate.getTime() <= now && (!summary.lastVisit || apptDate > summary.lastVisit)) {
      summary.lastVisit = apptDate;
    }
    if (apptDate.getTime() > now && appt.status !== 'CANCELLED' && (!summary.nextVisit || apptDate < summary.nextVisit)) {
      summary.nextVisit = apptDate;
    }
    summary.appointments.push(appt);

    map.set(id, summary);
  }

  return Array.from(map.values()).sort((a, b) => {
    // Most recent activity first
    const aTime = Math.max(a.lastVisit?.getTime() ?? 0, a.nextVisit?.getTime() ?? 0);
    const bTime = Math.max(b.lastVisit?.getTime() ?? 0, b.nextVisit?.getTime() ?? 0);
    return bTime - aTime;
  });
}

export function PatientHistoryPage() {
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  // The backend's `appointmentsApi.list()` is auto-scoped to the doctor when
  // the caller has DOCTOR role — so we simply ask for everything and group
  // by patient on the client.
  const { state, refetch } = useApi<PaginatedData<AppointmentDto>>(
    () => appointmentsApi.list({ pageSize: 200 }),
    [],
  );

  const patients = useMemo(
    () => state.status === 'ready' ? summariseByPatient(state.data.data) : [],
    [state],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => p.fullName.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q));
  }, [patients, search]);

  const selectedPatient = patients.find((p) => p.patientId === selected) ?? null;

  if (state.status === 'loading') {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <Alert variant="error" action={
        <button onClick={refetch} className="text-sm font-medium underline">Reintentar</button>
      }>{state.error.message}</Alert>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Historial de pacientes" subtitle="Pacientes que has atendido" />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Patient list */}
        <SectionCard
          className="xl:col-span-2"
          noPadding
          title={`Pacientes (${patients.length})`}
          action={
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar..." className="w-44" />
          }
        >
          {filtered.length === 0 ? (
            <EmptyState
              title={patients.length === 0 ? 'Aún no atendiste a ningún paciente' : 'Sin coincidencias'}
              description={patients.length === 0
                ? 'Cuando un paciente reserve y completes una consulta, aparecerá acá.'
                : 'Probá con otro término de búsqueda.'}
              icon={Users}
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((p) => (
                <button
                  key={p.patientId}
                  onClick={() => setSelected(p.patientId)}
                  className={`w-full flex items-center gap-4 px-5 py-4 text-left transition ${
                    selected === p.patientId
                      ? 'bg-teal-50 dark:bg-teal-900/10'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Avatar initials={p.initials} size="md" variant="indigo" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{p.fullName}</p>
                    {p.email && <p className="text-xs text-slate-400 truncate">{p.email}</p>}
                  </div>
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{p.visits} visita{p.visits === 1 ? '' : 's'}</p>
                    <p className="text-xs text-slate-400">Última: {fmtDate(p.lastVisit)}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Detail panel */}
        <SectionCard noPadding>
          {selectedPatient ? (
            <>
              <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar initials={selectedPatient.initials} size="lg" shape="rounded" variant="indigo" />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-white truncate">{selectedPatient.fullName}</p>
                    {selectedPatient.email && <p className="text-xs text-slate-400 truncate">{selectedPatient.email}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Stat label="Visitas totales" value={selectedPatient.visits} />
                  <Stat label="Completadas"     value={selectedPatient.completed} />
                </div>

                {selectedPatient.nextVisit && (
                  <div className="mt-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <Calendar size={12} />
                    Próxima cita: <strong>{fmtDate(selectedPatient.nextVisit)}</strong>
                  </div>
                )}

                {/* Clinical info — fetched from PatientDto. Read-only here;
                    the patient owns the editing of these lists from
                    `/patient/history`. */}
                <ClinicalInfo patientId={selectedPatient.patientId} />
              </div>

              <div className="p-5 space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                  Historial de citas
                </h4>
                {selectedPatient.appointments
                  .slice()
                  .sort((a, b) => combineDateTime(b.date, b.time).getTime() - combineDateTime(a.date, a.time).getTime())
                  .map((appt) => (
                    <div key={appt.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                      <FileText size={14} className="text-teal-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {fmtDate(combineDateTime(appt.date, appt.time))} · {appt.time}
                          </p>
                          <StatusBadge status={appt.status.toLowerCase()} statusMap={appointmentStatusMap} size="sm" />
                        </div>
                        {appt.notes && <p className="text-xs text-slate-500 mt-1">{appt.notes}</p>}
                      </div>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <EmptyState
              icon={FileText}
              title="Selecciona un paciente"
              description="A la izquierda elegí un paciente para ver su historial completo de citas contigo."
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
      <p className="text-xl font-bold text-slate-800 dark:text-white">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

/**
 * ClinicalInfo — read-only cards with the patient's allergies, conditions
 * and active medications. Lazily fetches `patientsApi.getById(patientId)`
 * because the appointment list doesn't carry these fields. Cached per
 * patientId via useApi's deps.
 */
function ClinicalInfo({ patientId }: { patientId: string }) {
  const { state } = useApi<PatientDto>(
    () => patientsApi.getById(patientId),
    [patientId],
  );

  if (state.status === 'loading') {
    return (
      <div className="mt-4 flex items-center justify-center py-3 text-slate-400">
        <Loader2 size={14} className="animate-spin" />
      </div>
    );
  }
  if (state.status === 'error') {
    // Silent fail — clinical info is supplementary, the visit history above
    // is the primary data.
    return null;
  }

  const p = state.data;
  const lists: { label: string; icon: React.ReactNode; items: string[]; chipCls: string }[] = [
    { label: 'Alergias',            icon: <AlertCircle size={11} />, items: p.allergies,   chipCls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
    { label: 'Condiciones crónicas', icon: <Heart size={11} />,       items: p.conditions,  chipCls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    { label: 'Medicamentos',         icon: <Pill size={11} />,        items: p.medications, chipCls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  ];

  const hasAny = p.allergies.length || p.conditions.length || p.medications.length || p.bloodType;
  if (!hasAny) {
    return (
      <p className="mt-4 text-xs text-slate-400 italic">
        Este paciente todavía no completó su información clínica.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {p.bloodType && (
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500 uppercase tracking-wider">Tipo de sangre:</span>
          <span className="inline-flex h-6 px-2 items-center rounded-md bg-rose-600 text-white text-xs font-bold">{p.bloodType}</span>
        </div>
      )}
      {lists.map((l) => l.items.length > 0 && (
        <div key={l.label}>
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            {l.icon} {l.label}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {l.items.map((item) => (
              <span key={item} className={`text-xs px-2 py-0.5 rounded-md font-medium ${l.chipCls}`}>{item}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
