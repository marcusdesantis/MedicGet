/**
 * lib/api.ts — DTOs + colecciones de endpoints. Espejo del cliente del
 * frontend web, recortado a lo que la app móvil consume hoy. Comparte
 * exactamente las mismas formas de payload con el backend (svc-auth,
 * svc-dashboard, svc-appointment, etc.) para que la lógica de pantallas
 * sea idéntica a la del web.
 */

import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
} from '@/services/http';

// ─── Generic ──────────────────────────────────────────────────────────────────

export interface PaginatedData<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

// ─── Profile / User ───────────────────────────────────────────────────────────

export interface ProfileDto {
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export type UserBackendRole = 'CLINIC' | 'DOCTOR' | 'PATIENT' | 'ADMIN';

export interface UserDto {
  id: string;
  email: string;
  role: UserBackendRole;
  status: string;
  createdAt: string;
  updatedAt: string;
  profile: ProfileDto | null;
  clinic?: { id: string; name: string } | null;
  doctor?: { id: string; specialty: string } | null;
  patient?: { id: string } | null;
}

// ─── Doctor / Patient / Appointment (resumen) ────────────────────────────────

export type AppointmentModality = 'ONLINE' | 'PRESENCIAL' | 'CHAT';

export interface DoctorDto {
  id: string;
  specialty: string;
  licenseNumber?: string;
  experience: number;
  pricePerConsult: number;
  bio?: string;
  consultDuration: number;
  languages: string[];
  modalities: AppointmentModality[];
  rating: number;
  reviewCount: number;
  available: boolean;
  user: { profile: ProfileDto };
  clinic: { id: string; name: string } | null;
}

export interface PatientDto {
  id: string;
  dateOfBirth?: string;
  bloodType?: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
  notes?: string;
  user: { profile: ProfileDto; email: string };
}

export interface AppointmentDto {
  id: string;
  date: string;
  time: string;
  status: string;
  modality: AppointmentModality;
  price: number;
  notes?: string;
  cancelReason?: string;
  createdAt: string;
  patient: { id: string; user: { profile: ProfileDto } };
  doctor: { id: string; specialty: string; user: { profile: ProfileDto } };
  clinic: {
    id: string;
    name: string;
    address?: string;
    city?: string;
    province?: string;
    country?: string;
    phone?: string;
    email?: string;
  } | null;
  meetingUrl?: string | null;
  patientArrivedAt?: string | null;
  doctorCheckedInAt?: string | null;
  doctorCompletedAt?: string | null;
  patientConfirmedAt?: string | null;
}

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// ─── Dashboards ───────────────────────────────────────────────────────────────

export interface PatientDashboardDto {
  patient: PatientDto;
  stats: {
    upcoming: number;
    completed: number;
    cancelled: number;
    totalSpent: number;
  };
  nextAppointment: AppointmentDto | null;
  recentAppointments: AppointmentDto[];
  notifications: NotificationDto[];
}

export interface DoctorDashboardDto {
  doctor: DoctorDto;
  stats: {
    todayCount: number;
    weekCount: number;
    monthCount: number;
    pendingCount: number;
    completedCount: number;
    avgRating: number;
    totalRevenue: number;
  };
  todaySchedule: AppointmentDto[];
  weeklyChart: { label: string; value: number }[];
}

export interface ClinicDto {
  id: string;
  name: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  status: string;
}

export interface ClinicDashboardDto {
  clinic: ClinicDto;
  stats: {
    totalDoctors: number;
    totalPatients: number;
    todayAppointments: number;
    monthAppointments: number;
    pendingAppointments: number;
    totalRevenue: number;
    pendingRevenue: number;
  };
  recentAppointments: AppointmentDto[];
  weeklyChart: { label: string; value: number }[];
  topDoctors: { doctor: DoctorDto; appointmentCount: number }[];
}

// ─── Auth body shapes ─────────────────────────────────────────────────────────

export interface RegisterBody {
  email: string;
  password: string;
  role: 'CLINIC' | 'DOCTOR' | 'PATIENT';
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  province?: string;
  latitude?: number;
  longitude?: number;

  // CLINIC
  clinicName?: string;
  clinicDescription?: string;
  clinicPhone?: string;
  clinicEmail?: string;
  clinicWebsite?: string;

  // DOCTOR (la app llena profesionales más adelante en setup)
  specialty?: string;
  licenseNumber?: string;
  experience?: number;
  pricePerConsult?: number;
}

// ─── Auth API ────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    apiPost<{ token: string; user: UserDto }>('/auth/login', { email, password }),

  register: (body: RegisterBody) =>
    apiPost<{ requiresVerification: true; email: string; user: UserDto }>(
      '/auth/register',
      body,
    ),

  me: () => apiGet<UserDto>('/auth/me'),

  forgotPassword: (email: string) =>
    apiPost<{ ok: true; message: string }>('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    apiPost<{ ok: true; message: string }>('/auth/reset-password', { token, password }),

  verifyEmail: (body: { token?: string; code?: string; email?: string }) =>
    apiPost<{ token: string; user: UserDto }>('/auth/verify-email', body),

  resendVerification: (email: string) =>
    apiPost<{ ok: true }>('/auth/resend-verification', { email }),
};

// ─── Domain APIs (consumidas por dashboards / pantallas autenticadas) ────────

export const dashboardApi = {
  clinic: () => apiGet<ClinicDashboardDto>('/dashboard/clinic'),
  doctor: () => apiGet<DoctorDashboardDto>('/dashboard/doctor'),
  patient: () => apiGet<PatientDashboardDto>('/dashboard/patient'),
};

export const usersApi = {
  getById: (id: string) => apiGet<UserDto>(`/users/${id}`),
  updateProfile: (id: string, body: Partial<ProfileDto>) =>
    apiPatch<ProfileDto>(`/users/${id}/profile`, body),
};

export const appointmentsApi = {
  list: (params?: Record<string, unknown>) =>
    apiGet<PaginatedData<AppointmentDto>>('/appointments', params),
  getById: (id: string) => apiGet<AppointmentDto>(`/appointments/${id}`),
  cancel: (id: string) => apiDelete<AppointmentDto>(`/appointments/${id}`),
};

export const notificationsApi = {
  list: (params?: { limit?: number; onlyUnread?: 0 | 1 }) =>
    apiGet<{ items: NotificationDto[]; unreadCount: number }>(
      '/notifications',
      params,
    ),
  markRead: (id: string) =>
    apiPatch<NotificationDto>(`/notifications/${id}/read`, {}),
};
