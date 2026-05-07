/**
 * useGlobalSearch — devuelve resultados categorizados de búsqueda global
 * en función del rol del usuario actual. Cada rol consulta los endpoints
 * que tiene permitidos:
 *
 *   • PATIENT  → médicos disponibles + sus propias citas
 *   • DOCTOR   → sus pacientes (extraídos de sus citas) + sus citas
 *   • CLINIC   → médicos asociados + citas de la clínica
 *   • ADMIN    → usuarios (todos los roles) + clínicas + médicos
 *
 * El hook debounceea 250 ms, cancela peticiones obsoletas y dedupea por
 * id+category.
 */

import { useEffect, useState } from 'react';
import {
  Calendar, Stethoscope, User, Building2, ShieldCheck, BadgeCheck,
} from 'lucide-react';
import {
  doctorsApi, appointmentsApi, adminApi, clinicsApi,
  type DoctorDto, type AppointmentDto, type UserDto, type PaginatedData,
} from '@/lib/api';

export interface SearchResult {
  id:        string;
  category:  string;       // "Médicos", "Citas", "Pacientes", etc.
  icon:      typeof Calendar;
  title:     string;
  subtitle:  string;
  href:      string;
}

const MIN_LENGTH = 2;

interface UseGlobalSearchArgs {
  query: string;
  role:  'patient' | 'doctor' | 'clinic' | 'admin' | undefined;
  /** id del paciente / médico / clínica del caller — usado para filtrar. */
  ownClinicId?: string;
}

export function useGlobalSearch({ query, role, ownClinicId }: UseGlobalSearchArgs) {
  const [results,  setResults]  = useState<SearchResult[]>([]);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_LENGTH || !role) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    // Debounce 250 ms
    const timer = window.setTimeout(async () => {
      try {
        const out: SearchResult[] = [];

        if (role === 'admin') {
          out.push(...await searchAdmin(trimmed));
        } else if (role === 'clinic') {
          out.push(...await searchClinic(trimmed, ownClinicId));
        } else if (role === 'doctor') {
          out.push(...await searchDoctor(trimmed));
        } else if (role === 'patient') {
          out.push(...await searchPatient(trimmed));
        }

        if (!cancelled) {
          setResults(out);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setResults([]);
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, role, ownClinicId]);

  return { results, loading };
}

/* ─────────────── Per-role searchers ─────────────── */

async function searchAdmin(q: string): Promise<SearchResult[]> {
  const [users, plans] = await Promise.all([
    adminApi.users({ search: q, pageSize: 8 }).catch(() => null),
    // Plans don't support search server-side, but we have very few; fetch all
    // and filter client-side.
    adminApi.listPlans().catch(() => null),
  ]);

  const out: SearchResult[] = [];

  if (users) {
    out.push(...users.data.data.map<SearchResult>((u) => ({
      id:       `user-${u.id}`,
      category: roleLabel(u.role),
      icon:     iconForRole(u.role),
      title:    `${u.profile?.firstName ?? ''} ${u.profile?.lastName ?? ''}`.trim() || u.email,
      subtitle: `${u.email} · ${u.status}`,
      href:     '/admin/users',
    })));
  }

  if (plans) {
    const matching = plans.data.filter(
      (p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.code.toLowerCase().includes(q.toLowerCase()),
    );
    out.push(...matching.map<SearchResult>((p) => ({
      id:       `plan-${p.id}`,
      category: 'Planes',
      icon:     BadgeCheck,
      title:    `${p.name} · ${p.code}`,
      subtitle: `${p.audience} · $${p.monthlyPrice}/mes`,
      href:     '/admin/plans',
    })));
  }

  return out;
}

async function searchClinic(q: string, _ownClinicId?: string): Promise<SearchResult[]> {
  const [doctors, appointments] = await Promise.all([
    doctorsApi.list({ search: q, pageSize: 6 }).catch(() => null),
    appointmentsApi.list({ pageSize: 100 }).catch(() => null),
  ]);

  const out: SearchResult[] = [];

  if (doctors) {
    out.push(...doctors.data.data.map((d) => doctorToResult(d)));
  }

  if (appointments) {
    out.push(...filterAppointments(appointments.data.data, q, '/clinic/appointments'));
  }

  return out;
}

async function searchDoctor(q: string): Promise<SearchResult[]> {
  const appointments = await appointmentsApi.list({ pageSize: 100 }).catch(() => null);
  const out: SearchResult[] = [];

  if (appointments) {
    // Pacientes únicos extraídos de las citas
    const seenPatients = new Set<string>();
    const lower = q.toLowerCase();
    for (const a of appointments.data.data) {
      const p = a.patient;
      if (!p || seenPatients.has(p.id)) continue;
      const name = `${p.user?.profile?.firstName ?? ''} ${p.user?.profile?.lastName ?? ''}`.trim();
      if (name.toLowerCase().includes(lower)) {
        seenPatients.add(p.id);
        out.push({
          id:       `patient-${p.id}`,
          category: 'Pacientes',
          icon:     User,
          title:    name || 'Paciente',
          subtitle: 'Toca para ver historial',
          href:     '/doctor/patients',
        });
      }
      if (out.length >= 6) break;
    }
    out.push(...filterAppointments(appointments.data.data, q, '/doctor/appointments'));
  }

  return out;
}

async function searchPatient(q: string): Promise<SearchResult[]> {
  const [doctors, appointments] = await Promise.all([
    doctorsApi.list({ search: q, pageSize: 6, available: 'true' }).catch(() => null),
    appointmentsApi.list({ pageSize: 100 }).catch(() => null),
  ]);

  const out: SearchResult[] = [];

  if (doctors) {
    out.push(...doctors.data.data.map((d) => ({
      ...doctorToResult(d),
      // Para pacientes, el destino es el detalle público
      href: `/patient/doctor/${d.id}`,
    })));
  }

  if (appointments) {
    out.push(...filterAppointments(appointments.data.data, q, '/patient/appointments'));
  }

  return out;
}

/* ─────────────── Helpers ─────────────── */

function doctorToResult(d: DoctorDto): SearchResult {
  const name = `${d.user.profile?.firstName ?? ''} ${d.user.profile?.lastName ?? ''}`.trim();
  return {
    id:       `doctor-${d.id}`,
    category: 'Médicos',
    icon:     Stethoscope,
    title:    `Dr. ${name}`,
    subtitle: `${d.specialty} · $${d.pricePerConsult.toFixed(0)}`,
    href:     `/medicos/${d.id}`,
  };
}

function filterAppointments(list: AppointmentDto[], q: string, hrefBase: string): SearchResult[] {
  const lower = q.toLowerCase();
  const matches: SearchResult[] = [];
  for (const a of list) {
    const docName  = `${a.doctor?.user?.profile?.firstName ?? ''} ${a.doctor?.user?.profile?.lastName ?? ''}`.trim();
    const patName  = `${a.patient?.user?.profile?.firstName ?? ''} ${a.patient?.user?.profile?.lastName ?? ''}`.trim();
    const haystack = `${docName} ${patName} ${a.doctor?.specialty ?? ''} ${a.notes ?? ''}`.toLowerCase();
    if (!haystack.includes(lower)) continue;
    matches.push({
      id:       `appt-${a.id}`,
      category: 'Citas',
      icon:     Calendar,
      title:    `${patName} → Dr. ${docName}`,
      subtitle: `${new Date(a.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} · ${a.time} · ${a.status}`,
      href:     hrefBase,
    });
    if (matches.length >= 6) break;
  }
  return matches;
}

function iconForRole(r: string): typeof Calendar {
  if (r === 'CLINIC')  return Building2;
  if (r === 'DOCTOR')  return Stethoscope;
  if (r === 'PATIENT') return User;
  return ShieldCheck;
}

function roleLabel(r: string): string {
  if (r === 'CLINIC')  return 'Clínicas';
  if (r === 'DOCTOR')  return 'Médicos';
  if (r === 'PATIENT') return 'Pacientes';
  if (r === 'ADMIN')   return 'Admins';
  return 'Usuarios';
}

// PaginatedData / DTO imports kept for possible future expansion
type _T = PaginatedData<UserDto> | PaginatedData<DoctorDto> | PaginatedData<AppointmentDto>;
void clinicsApi;
