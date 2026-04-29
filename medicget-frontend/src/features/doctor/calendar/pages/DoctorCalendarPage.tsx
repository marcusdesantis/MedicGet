import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { PageHeader }  from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { timeSlotStatusMap } from '@/lib/statusConfig';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const BOOKED_DAYS: Record<string, { count: number; color: string }> = {
  '2026-04-28': { count: 5, color: 'bg-blue-500' },
  '2026-04-29': { count: 3, color: 'bg-teal-500' },
  '2026-04-30': { count: 7, color: 'bg-blue-500' },
  '2026-05-04': { count: 4, color: 'bg-teal-500' },
  '2026-05-05': { count: 2, color: 'bg-teal-500' },
  '2026-05-06': { count: 6, color: 'bg-blue-500' },
};

const TIME_SLOTS = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '16:00', '16:30', '17:00', '17:30', '18:00'];
const BLOCKED_SLOTS = ['12:00', '12:30'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function DoctorCalendarPage() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const dayKey = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const isToday = (day: number) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendario"
        subtitle="Gestiona tu disponibilidad y horario de citas"
        action={
          <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700
                             text-white text-sm font-medium rounded-xl transition shadow-sm">
            <Plus size={15} /> Bloquear horario
          </button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200
                        dark:border-slate-700 shadow-sm p-5">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-400">
              <ChevronLeft size={18} />
            </button>
            <h3 className="font-semibold text-slate-800 dark:text-white">
              {MONTHS[month]} {year}
            </h3>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-400">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const key = dayKey(day);
              const booked = BOOKED_DAYS[key];
              const selected = selectedDay === day;
              const todayFlag = isToday(day);

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium transition
                    ${selected ? 'bg-teal-600 text-white shadow-md' : todayFlag ? 'ring-2 ring-teal-500 text-teal-600 dark:text-teal-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  {day}
                  {booked && !selected && (
                    <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${booked.color}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Con citas
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full ring-2 ring-teal-500" /> Hoy
            </span>
          </div>
        </div>

        {/* Time slots */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200
                        dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-slate-800 dark:text-white">
              {selectedDay ? `${selectedDay} ${MONTHS[month]}` : 'Selecciona un día'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Horario de consultas</p>
          </div>
          <div className="p-3 space-y-1.5 overflow-y-auto max-h-[380px]">
            {TIME_SLOTS.map((slot) => {
              const blocked = BLOCKED_SLOTS.includes(slot);
              return (
                <div key={slot}
                     className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition
                       ${blocked
                         ? 'bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800'
                         : 'bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-900/20 cursor-pointer'}`}>
                  <span className={`font-medium ${blocked ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {slot}
                  </span>
                  <StatusBadge status={blocked ? 'blocked' : 'free'} statusMap={timeSlotStatusMap} size="sm" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
