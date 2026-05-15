/**
 * AppointmentCalendar — vista de calendario mensual para mobile.
 *
 * Espejo simplificado del `react-big-calendar` que usa el frontend web.
 * En vez de portar esa librería pesada (DOM-only, no soportada en RN),
 * dibujamos a mano:
 *
 *   ┌──────────────────────────────────────────┐
 *   │     ‹  Mayo 2026  ›                       │   ← header con nav
 *   │  L   M   M   J   V   S   D                │   ← días de semana
 *   │  29  30  ●1  ●2  ●3  ●4  ●5               │   ← dots = citas
 *   │ ●6  ●7   8   9  10  11  12               │
 *   │ ...                                       │
 *   ├──────────────────────────────────────────┤
 *   │ Citas del 15 de mayo                      │   ← lista del día
 *   │ 09:00 — Juan Pérez (Pendiente)            │      seleccionado
 *   │ 14:30 — Carla Gómez (Próxima)             │
 *   └──────────────────────────────────────────┘
 *
 * Cada día con citas muestra hasta 3 puntos de color según el status
 * de cada cita. Al tap, se selecciona y aparecen los detalles abajo.
 * El día seleccionado por default es hoy.
 */

import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { appointmentStatusMap } from '@/lib/statusConfig';
import { combineDateTime, profileInitials } from '@/lib/format';
import type { AppointmentDto } from '@/lib/api';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const STATUS_DOT: Record<string, string> = {
  PENDING: '#f59e0b',
  UPCOMING: '#3b82f6',
  ONGOING: '#2563eb',
  COMPLETED: '#10b981',
  CANCELLED: '#f43f5e',
  NO_SHOW: '#64748b',
};

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface AppointmentCalendarProps {
  appointments: AppointmentDto[];
  role: 'patient' | 'doctor' | 'clinic';
  onAppointmentPress?: (appointment: AppointmentDto) => void;
}

export function AppointmentCalendar({
  appointments,
  role,
  onAppointmentPress,
}: AppointmentCalendarProps) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());

  // Construimos la grilla del mes: ~42 celdas (6 semanas) empezando
  // desde el lunes anterior al día 1 del mes.
  const grid = useMemo(() => {
    const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    // getDay() devuelve 0=Dom..6=Sab. Queremos lunes-first.
    const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
    const start = new Date(firstOfMonth);
    start.setDate(start.getDate() - firstWeekday);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [cursor]);

  // Indexamos las citas por YYYY-MM-DD para lookups O(1) en cada celda.
  const apptsByDay = useMemo(() => {
    const map = new Map<string, AppointmentDto[]>();
    for (const a of appointments) {
      const day = a.date.length > 10 ? a.date.slice(0, 10) : a.date;
      const list = map.get(day) ?? [];
      list.push(a);
      map.set(day, list);
    }
    // Ordenamos cada día por hora.
    for (const [, list] of map) {
      list.sort((x, y) => x.time.localeCompare(y.time));
    }
    return map;
  }, [appointments]);

  const selectedKey = ymd(selectedDay);
  const selectedAppts = apptsByDay.get(selectedKey) ?? [];

  const goPrev = () => {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  };
  const goNext = () => {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  };
  const goToday = () => {
    const now = new Date();
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDay(now);
  };

  const today = new Date();

  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
      {/* Header con navegación */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <Pressable
          onPress={goPrev}
          hitSlop={6}
          className="w-9 h-9 rounded-lg items-center justify-center active:bg-slate-100 dark:active:bg-slate-800">
          <ChevronLeft size={18} color="#475569" />
        </Pressable>
        <Pressable onPress={goToday} hitSlop={6}>
          <Text className="text-base font-semibold text-slate-800 dark:text-white">
            {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
          </Text>
        </Pressable>
        <Pressable
          onPress={goNext}
          hitSlop={6}
          className="w-9 h-9 rounded-lg items-center justify-center active:bg-slate-100 dark:active:bg-slate-800">
          <ChevronRight size={18} color="#475569" />
        </Pressable>
      </View>

      {/* Días de la semana */}
      <View className="flex-row px-2 pt-2">
        {WEEKDAYS.map((d, i) => (
          <View key={i} className="flex-1 items-center pb-1">
            <Text className="text-[10px] font-semibold text-slate-400 uppercase">
              {d}
            </Text>
          </View>
        ))}
      </View>

      {/* Grilla 6×7 */}
      <View className="px-1 pb-2">
        {Array.from({ length: 6 }).map((_, weekIdx) => (
          <View key={weekIdx} className="flex-row">
            {grid.slice(weekIdx * 7, weekIdx * 7 + 7).map((day, dayIdx) => {
              const inMonth = day.getMonth() === cursor.getMonth();
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDay);
              const dayAppts = apptsByDay.get(ymd(day)) ?? [];

              return (
                <Pressable
                  key={dayIdx}
                  onPress={() => setSelectedDay(day)}
                  className="flex-1 aspect-square items-center justify-center p-1">
                  <View
                    className={`w-9 h-9 rounded-full items-center justify-center ${
                      isSelected
                        ? 'bg-teal-600'
                        : isToday
                          ? 'bg-teal-100 dark:bg-teal-900/40'
                          : ''
                    }`}>
                    <Text
                      className={`text-sm ${
                        isSelected
                          ? 'text-white font-bold'
                          : isToday
                            ? 'text-teal-700 dark:text-teal-300 font-bold'
                            : inMonth
                              ? 'text-slate-800 dark:text-slate-200'
                              : 'text-slate-300 dark:text-slate-700'
                      }`}>
                      {day.getDate()}
                    </Text>
                  </View>
                  {/* Dots de citas (máx 3) */}
                  {dayAppts.length > 0 ? (
                    <View className="flex-row gap-0.5 mt-0.5 h-1.5">
                      {dayAppts.slice(0, 3).map((a, i) => (
                        <View
                          key={i}
                          className="w-1 h-1 rounded-full"
                          style={{
                            backgroundColor:
                              STATUS_DOT[a.status] ?? '#94a3b8',
                          }}
                        />
                      ))}
                      {dayAppts.length > 3 ? (
                        <Text className="text-[8px] text-slate-400 ml-0.5">
                          +
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    <View className="h-1.5" />
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {/* Lista del día seleccionado */}
      <View className="border-t border-slate-100 dark:border-slate-800 px-4 py-3">
        <Text className="text-sm font-semibold text-slate-800 dark:text-white">
          {selectedDay.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
          })}
        </Text>
        {selectedAppts.length === 0 ? (
          <EmptyState
            title="Sin citas este día"
            description="Probá con otro día o cambiá a vista de lista."
          />
        ) : (
          <View className="gap-2 mt-2">
            {selectedAppts.map((a) => (
              <DayAppointmentRow
                key={a.id}
                appointment={a}
                role={role}
                onPress={() => onAppointmentPress?.(a)}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function DayAppointmentRow({
  appointment: a,
  role,
  onPress,
}: {
  appointment: AppointmentDto;
  role: 'patient' | 'doctor' | 'clinic';
  onPress?: () => void;
}) {
  // Para el médico, mostramos el paciente. Para el paciente, el médico.
  const peerProfile =
    role === 'doctor' ? a.patient?.user?.profile : a.doctor?.user?.profile;
  const peerName =
    role === 'doctor'
      ? `${peerProfile?.firstName ?? ''} ${peerProfile?.lastName ?? ''}`.trim() || 'Paciente'
      : `Dr. ${peerProfile?.firstName ?? ''} ${peerProfile?.lastName ?? ''}`.trim();
  const dateTime = combineDateTime(a.date, a.time);
  void dateTime;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800">
      <View className="items-center">
        <Text className="text-sm font-bold text-slate-700 dark:text-slate-200">
          {a.time}
        </Text>
      </View>
      <Avatar
        initials={profileInitials(peerProfile, role === 'doctor' ? 'PT' : 'DR')}
        imageUrl={peerProfile?.avatarUrl ?? null}
        size="sm"
        variant={role === 'doctor' ? 'indigo' : 'blue'}
      />
      <View className="flex-1 min-w-0">
        <Text
          numberOfLines={1}
          className="text-sm font-semibold text-slate-800 dark:text-white">
          {peerName}
        </Text>
        {role !== 'doctor' && a.doctor?.specialty ? (
          <Text className="text-xs text-blue-600 dark:text-blue-400">
            {a.doctor.specialty}
          </Text>
        ) : null}
        <Text className="text-[11px] text-slate-500 mt-0.5 capitalize">
          {a.modality.toLowerCase()}
        </Text>
      </View>
      <StatusBadge
        status={a.status.toLowerCase()}
        statusMap={appointmentStatusMap}
        size="sm"
      />
    </Pressable>
  );
}
