import { useEffect, useMemo, useState } from 'react';
import { Save, CheckCircle2, AlertCircle, Loader2, Copy, Ban, Lock, Unlock } from 'lucide-react';
import { PageHeader }  from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { doctorsApi, slotsApi, type AvailabilityDto, type SlotDto } from '@/lib/api';

/**
 * Doctor — weekly availability editor.
 *
 * The Prisma `DoctorAvailability` table uses one row per (doctorId, dayOfWeek)
 * with `startTime`, `endTime`, `isActive`. This page renders one row per day
 * of the week and lets the doctor toggle each on/off and pick start/end times.
 *
 * Save persists each ACTIVE day via `doctorsApi.upsertAvailability(...)`.
 * Inactive days are intentionally NOT removed from the backend; the schema's
 * `isActive` flag is what disables them. Removing rows would require a delete
 * call per row, which we can wire later if/when the doctor wants to fully
 * forget a day.
 *
 * Slot generation is automatic on the backend: when a patient queries
 * `GET /doctors/:id/slots?date=YYYY-MM-DD`, the doctor service:
 *   1. checks for existing AppointmentSlot rows for that date
 *   2. if none, looks up the DoctorAvailability for that day-of-week
 *   3. generates 30-min (or `consultDuration`) slots from start to end
 *   4. persists them, then returns them
 *
 * So the doctor doesn't need a "generate slots" button — saving availability
 * is enough.
 */

const DAYS: { key: AvailabilityDto['dayOfWeek']; label: string }[] = [
  { key: 'MONDAY',    label: 'Lunes'     },
  { key: 'TUESDAY',   label: 'Martes'    },
  { key: 'WEDNESDAY', label: 'Miércoles' },
  { key: 'THURSDAY',  label: 'Jueves'    },
  { key: 'FRIDAY',    label: 'Viernes'   },
  { key: 'SATURDAY',  label: 'Sábado'    },
  { key: 'SUNDAY',    label: 'Domingo'   },
];

interface DayState {
  active:    boolean;
  startTime: string;  // "HH:MM"
  endTime:   string;
}

const DEFAULT_DAY: DayState = { active: false, startTime: '09:00', endTime: '17:00' };

export function DoctorCalendarPage() {
  const { user } = useAuth();
  const doctorId = user?.dto.doctor?.id ?? null;

  const initialState: Record<string, DayState> = useMemo(() =>
    DAYS.reduce((acc, d) => {
      acc[d.key] = { ...DEFAULT_DAY };
      return acc;
    }, {} as Record<string, DayState>), []);

  const [days,        setDays]        = useState<Record<string, DayState>>(initialState);
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  // Bumped on every successful save. SlotBlockingSection lo escucha como
  // dep del useApi → refetchea sus slots inmediatamente.
  const [reloadKey,   setReloadKey]   = useState(0);

  // "Plantilla rápida" — el médico ingresa un rango y lo replica a todos
  // los días que tenga marcados. Default igual al DEFAULT_DAY para que se
  // sienta como una continuación natural de los rows de abajo.
  const [tplStart, setTplStart] = useState<string>(DEFAULT_DAY.startTime);
  const [tplEnd,   setTplEnd]   = useState<string>(DEFAULT_DAY.endTime);

  const { state, refetch } = useApi<AvailabilityDto[]>(
    () => doctorsApi.getAvailability(doctorId!),
    [doctorId],
  );

  // Hydrate the form from the backend's current availability on first load.
  useEffect(() => {
    if (state.status !== 'ready') return;
    const next: Record<string, DayState> = { ...initialState };
    state.data.forEach((a) => {
      next[a.dayOfWeek] = {
        active:    a.isActive,
        startTime: a.startTime,
        endTime:   a.endTime,
      };
    });
    setDays(next);
  }, [state.status === 'ready' ? state.data : null]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!doctorId) {
    return (
      <Alert variant="error">
        No encontramos tu perfil de médico. Vuelve a iniciar sesión o completa tu registro.
      </Alert>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-slate-500 py-20 justify-center">
        <Loader2 className="animate-spin" size={20} /> Cargando disponibilidad…
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <Alert variant="error" action={
        <button onClick={refetch} className="text-sm font-medium underline whitespace-nowrap">Reintentar</button>
      }>
        {state.error.message}
      </Alert>
    );
  }

  const updateDay = (key: string, patch: Partial<DayState>) => {
    setDays((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    setSaveSuccess(false);
  };

  /**
   * Replica el rango `tplStart..tplEnd` a TODOS los días marcados (active).
   * Útil cuando el médico tiene el mismo horario todos los días que atiende
   * — evita configurar día por día. Si no hay ninguno marcado, no hace nada
   * (el botón se deshabilita visualmente).
   */
  const applyTemplateToActive = () => {
    if (tplStart >= tplEnd) return;
    setDays((prev) => {
      const next = { ...prev };
      for (const { key } of DAYS) {
        if (!next[key].active) continue;
        next[key] = { ...next[key], startTime: tplStart, endTime: tplEnd };
      }
      return next;
    });
    setSaveSuccess(false);
  };

  const activeCountForTpl = DAYS.filter(({ key }) => days[key].active).length;
  const tplValid = tplStart < tplEnd;

  const isValid = DAYS.every(({ key }) => {
    const d = days[key];
    if (!d.active) return true;
    return d.startTime < d.endTime;
  });

  const handleSave = async () => {
    if (!isValid || !doctorId) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Upsert TODOS los días (no solo los activos): para los desmarcados
      // mandamos `isActive: false` así el backend los apaga. Si solo
      // mandáramos los activos, desmarcar un día previamente guardado
      // no tendría efecto en la DB.
      for (const { key } of DAYS) {
        const d = days[key];
        await doctorsApi.upsertAvailability(doctorId, {
          dayOfWeek: key as AvailabilityDto['dayOfWeek'],
          startTime: d.startTime,
          endTime:   d.endTime,
          isActive:  d.active,
        });
      }
      setSaveSuccess(true);
      // Disparo refetch del SlotBlockingSection (slots dependen del horario).
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo guardar tu disponibilidad';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const activeDayCount = DAYS.filter(({ key }) => days[key].active).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi disponibilidad"
        subtitle="Configura los días y horarios en que aceptas consultas"
      />

      <Alert variant="info">
        <span className="text-sm">
          <strong>¿Cómo funciona?</strong> Activá los días de la semana y elegí el rango horario.
          El sistema genera automáticamente los espacios de {' '}
          <span className="font-semibold">{user?.dto.doctor?.specialty ? '30 min' : 'la duración configurada en tu perfil'}</span>{' '}
          cuando un paciente busca tus horarios.
        </span>
      </Alert>

      <SectionCard
        title="Horario semanal"
        subtitle={`${activeDayCount} ${activeDayCount === 1 ? 'día activo' : 'días activos'}`}
        noPadding
      >
        {/* Plantilla rápida — el médico ingresa una vez el rango y lo replica
            a todos los días que tenga marcados con el botón. Pedido por PM. */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Plantilla rápida
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Configurá un rango y aplicalo a todos los días que tengas marcados abajo.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={tplStart}
                onChange={(e) => setTplStart(e.target.value)}
                className="time-input rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-sm text-slate-400">a</span>
              <input
                type="time"
                value={tplEnd}
                onChange={(e) => setTplEnd(e.target.value)}
                className="time-input rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={applyTemplateToActive}
                disabled={!tplValid || activeCountForTpl === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  !tplValid
                    ? 'La hora de inicio debe ser anterior a la de fin'
                    : activeCountForTpl === 0
                      ? 'Marcá al menos un día abajo para aplicar la plantilla'
                      : `Replicar a ${activeCountForTpl} día${activeCountForTpl === 1 ? '' : 's'}`
                }
              >
                <Copy size={13} />
                Aplicar a {activeCountForTpl === 0 ? 'días marcados' : `${activeCountForTpl} día${activeCountForTpl === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
          {!tplValid && (
            <p className="mt-2 text-[11px] text-rose-600 flex items-center gap-1">
              <AlertCircle size={11} /> El horario de inicio debe ser anterior al de fin
            </p>
          )}
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {DAYS.map(({ key, label }) => {
            const d = days[key];
            const invalid = d.active && d.startTime >= d.endTime;
            return (
              <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4">
                {/* Day toggle */}
                <label className="flex items-center gap-3 sm:w-44 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={d.active}
                    onChange={(e) => updateDay(key, { active: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className={`font-medium ${d.active ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>
                    {label}
                  </span>
                </label>

                {/* Time range */}
                <div className={`flex items-center gap-3 flex-1 ${d.active ? '' : 'opacity-40 pointer-events-none'}`}>
                  <input
                    type="time"
                    value={d.startTime}
                    onChange={(e) => updateDay(key, { startTime: e.target.value })}
                    className="time-input rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-sm text-slate-400">a</span>
                  <input
                    type="time"
                    value={d.endTime}
                    onChange={(e) => updateDay(key, { endTime: e.target.value })}
                    className="time-input rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  {invalid && (
                    <span className="flex items-center gap-1 text-xs text-rose-600">
                      <AlertCircle size={12} /> El horario de inicio debe ser anterior al de fin
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {saveError && <Alert variant="error">{saveError}</Alert>}

      {saveSuccess && (
        <Alert variant="success">
          <CheckCircle2 size={14} className="inline mr-1.5" />
          Disponibilidad guardada. Los pacientes ya pueden ver tus horarios al buscarte.
        </Alert>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!isValid || saving}
          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-semibold shadow-sm shadow-teal-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Guardando...
            </>
          ) : (
            <>
              <Save size={16} /> Guardar cambios
            </>
          )}
        </Button>
      </div>

      <SlotBlockingSection doctorId={doctorId} reloadKey={reloadKey} />
    </div>
  );
}

// ─── Slot-level blocking (puntual) ──────────────────────────────────────────
// Lets the doctor block individual 30-min slots on a specific date when they
// have an external commitment that doesn't justify changing weekly hours.
function SlotBlockingSection({ doctorId, reloadKey }: { doctorId: string | null; reloadKey: number }) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [busyId, setBusyId] = useState<string | null>(null);

  // `reloadKey` viene del padre y se incrementa cada vez que se guarda
  // el horario semanal, así los slots de abajo reflejan la nueva
  // configuración sin que el médico tenga que recargar la página.
  const { state, refetch } = useApi<SlotDto[]>(
    () => doctorId ? doctorsApi.getSlots(doctorId, date) : Promise.resolve([]),
    [doctorId, date, reloadKey],
  );

  async function toggle(slot: SlotDto) {
    setBusyId(slot.id);
    try {
      await slotsApi.toggleBlock(slot.id, {
        blocked: !slot.isBlocked,
        reason: !slot.isBlocked ? 'Compromiso externo' : null,
      });
      await refetch();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <SectionCard
      title="Bloquear horarios puntuales"
      subtitle="Si tenés un compromiso externo en un día específico, podés bloquear los slots de ese día sin tocar tus horarios semanales."
    >
      <div className="flex items-center gap-3 mb-4">
        <input
          type="date"
          min={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {state.status === 'loading' && (
        <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" /> Cargando horarios...</div>
      )}
      {state.status === 'error' && (
        <Alert variant="error">{state.error.message}</Alert>
      )}
      {state.status === 'ready' && state.data.length === 0 && (
        <p className="text-sm text-slate-500">No hay horarios disponibles para esa fecha. Configurá tu disponibilidad semanal arriba.</p>
      )}
      {state.status === 'ready' && state.data.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {state.data.map((slot) => {
            const reserved = slot.isBooked;
            const blocked = slot.isBlocked;
            const busy = busyId === slot.id;
            const cls = reserved
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 cursor-not-allowed'
              : blocked
                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border-2 border-amber-300 dark:border-amber-700'
                : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40';
            return (
              <button
                key={slot.id}
                type="button"
                disabled={reserved || busy}
                onClick={() => toggle(slot)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition ${cls}`}
                title={reserved ? 'Reservado por un paciente' : blocked ? 'Bloqueado — clic para desbloquear' : 'Libre — clic para bloquear'}
              >
                {reserved ? null : blocked ? <Lock size={12} /> : <Unlock size={12} />}
                {slot.time}
              </button>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-400 mt-4 flex items-center gap-1.5">
        <Ban size={12} /> Los slots bloqueados no son visibles para los pacientes al buscarte.
      </p>
    </SectionCard>
  );
}
