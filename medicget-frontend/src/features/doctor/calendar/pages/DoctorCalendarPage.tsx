import { useEffect, useMemo, useState } from 'react';
import { Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { PageHeader }  from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { doctorsApi, type AvailabilityDto } from '@/lib/api';

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
      // Upsert each ACTIVE day. We submit them sequentially to keep error
      // messages tied to the failing day (a Promise.all would mask which one).
      for (const { key } of DAYS) {
        const d = days[key];
        if (!d.active) continue;
        await doctorsApi.upsertAvailability(doctorId, {
          dayOfWeek: key as AvailabilityDto['dayOfWeek'],
          startTime: d.startTime,
          endTime:   d.endTime,
          isActive:  true,
        });
      }
      setSaveSuccess(true);
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
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-sm text-slate-400">a</span>
                  <input
                    type="time"
                    value={d.endTime}
                    onChange={(e) => updateDay(key, { endTime: e.target.value })}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
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
    </div>
  );
}
