/**
 * api.ts — centralised Axios instance for MedicGet.
 *
 * All traffic goes through nginx at http://localhost:8080 which routes:
 *   /api/v1/auth/*         → svc-auth        :4001
 *   /api/v1/users/*        → svc-users       :4002
 *   /api/v1/clinics/*      → svc-clinic      :4003
 *   /api/v1/doctors/*      → svc-doctor      :4004
 *   /api/v1/patients/*     → svc-patient     :4005
 *   /api/v1/appointments/* → svc-appointment :4006
 *   /api/v1/dashboard/*    → svc-dashboard   :4007
 *
 * For local dev without Docker set VITE_API_URL in .env.local, e.g.:
 *   VITE_API_URL=http://localhost:4001/api/v1   (hit a single service directly)
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

// ─── Constants ───────────────────────────────────────────────────────────────

export const TOKEN_KEY = 'medicget_token';

/** Single nginx gateway — all routes go through port 8080 */
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1';

// ─── Axios instance ───────────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// ─── Request interceptor — attach JWT ────────────────────────────────────────

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor — handle errors globally ───────────────────────────

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ ok: false; error: { code: string; message: string } }>) => {
    if (!error.response) {
      toast.error('No se puede conectar con el servidor. Comprueba tu conexión.');
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    if (status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      toast.error('Sesión expirada. Por favor, inicia sesión de nuevo.');
      window.location.replace('/login');
      return Promise.reject(error);
    }

    const message =
      data?.error?.message ??
      (status === 403 ? 'No tienes permiso para realizar esta acción.' :
       status === 404 ? 'El recurso solicitado no existe.' :
       status >= 500  ? 'Error interno del servidor. Inténtalo más tarde.' :
                        'Ocurrió un error inesperado.');

    toast.error(message);
    return Promise.reject(error);
  },
);

// ─── Typed helpers ────────────────────────────────────────────────────────────

export interface ApiOk<T> {
  ok:       true;
  data:     T;
  message?: string;
}

export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<ApiOk<T>> {
  const res = await api.get<ApiOk<T>>(url, { params });
  return res.data;
}
export async function apiPost<T>(url: string, body?: unknown): Promise<ApiOk<T>> {
  const res = await api.post<ApiOk<T>>(url, body);
  return res.data;
}
export async function apiPatch<T>(url: string, body?: unknown): Promise<ApiOk<T>> {
  const res = await api.patch<ApiOk<T>>(url, body);
  return res.data;
}
export async function apiDelete<T>(url: string): Promise<ApiOk<T>> {
  const res = await api.delete<ApiOk<T>>(url);
  return res.data;
}

// ─── Pagination envelope ──────────────────────────────────────────────────────

export interface PaginatedData<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

// ─── DTO types ────────────────────────────────────────────────────────────────

export interface UserDto {
  id:        string;
  email:     string;
  role:      'CLINIC' | 'DOCTOR' | 'PATIENT';
  status:    string;
  createdAt: string;
  updatedAt: string;
  profile:   ProfileDto | null;
  clinic?:   { id: string; name: string } | null;
  doctor?:   { id: string; specialty: string } | null;
  patient?:  { id: string } | null;
}

export interface ProfileDto {
  firstName: string;
  lastName:  string;
  phone?:    string;
  avatarUrl?: string;
  address?:  string;
  city?:     string;
  country?:  string;
}

export interface ClinicDto {
  id:          string;
  name:        string;
  address?:    string;
  city?:       string;
  country?:    string;
  description?: string;
  phone?:      string;
  email?:      string;
  website?:    string;
  logoUrl?:    string;
  status:      string;
}

export interface DoctorDto {
  id:              string;
  specialty:       string;
  licenseNumber?:  string;
  experience:      number;
  pricePerConsult: number;
  bio?:            string;
  consultDuration: number;
  languages:       string[];
  rating:          number;
  reviewCount:     number;
  available:       boolean;
  user:            { profile: ProfileDto };
  clinic:          { id: string; name: string };
}

export interface AvailabilityDto {
  id:        string;
  dayOfWeek: string;
  startTime: string;
  endTime:   string;
  isActive:  boolean;
}

export interface SlotDto {
  id:       string;
  date:     string;
  time:     string;
  isBooked: boolean;
}

export interface PatientDto {
  id:           string;
  dateOfBirth?: string;
  bloodType?:   string;
  allergies:    string[];
  notes?:       string;
  user:         { profile: ProfileDto; email: string };
}

export interface AppointmentDto {
  id:           string;
  date:         string;
  time:         string;
  status:       string;
  price:        number;
  notes?:       string;
  cancelReason?: string;
  createdAt:    string;
  patient:      { id: string; user: { profile: ProfileDto } };
  doctor:       { id: string; specialty: string; user: { profile: ProfileDto } };
  clinic:       { id: string; name: string };
  payment?:     PaymentDto | null;
  review?:      ReviewDto  | null;
}

export interface PaymentDto {
  id:            string;
  amount:        number;
  method:        string;
  status:        string;
  transactionId?: string;
  paidAt?:       string;
}

export interface ReviewDto {
  id:        string;
  rating:    number;
  comment?:  string;
  isPublic:  boolean;
  createdAt: string;
}

export interface NotificationDto {
  id:        string;
  type:      string;
  title:     string;
  message:   string;
  isRead:    boolean;
  createdAt: string;
}

export interface RegisterBody {
  email:     string;
  password:  string;
  role:      'CLINIC' | 'DOCTOR' | 'PATIENT';
  firstName: string;
  lastName:  string;
  phone?:    string;
}

// ─── Domain API objects ───────────────────────────────────────────────────────

/** svc-auth :4001 → /api/v1/auth/ */
export const authApi = {
  login:    (email: string, password: string) =>
    apiPost<{ token: string; user: UserDto }>('/auth/login', { email, password }),
  register: (body: RegisterBody) =>
    apiPost<{ token: string; user: UserDto }>('/auth/register', body),
  me:       () => apiGet<UserDto>('/auth/me'),
};

/** svc-users :4002 → /api/v1/users/ */
export const usersApi = {
  list:          (params?: Record<string, unknown>) => apiGet<PaginatedData<UserDto>>('/users', params),
  getById:       (id: string)                       => apiGet<UserDto>(`/users/${id}`),
  update:        (id: string, body: Partial<UserDto>) => apiPatch<UserDto>(`/users/${id}`, body),
  delete:        (id: string)                       => apiDelete<UserDto>(`/users/${id}`),
  getProfile:    (id: string)                       => apiGet<ProfileDto>(`/users/${id}/profile`),
  updateProfile: (id: string, body: Partial<ProfileDto>) => apiPatch<ProfileDto>(`/users/${id}/profile`, body),
};

/** svc-clinic :4003 → /api/v1/clinics/ */
export const clinicsApi = {
  list:       (params?: Record<string, unknown>) => apiGet<PaginatedData<ClinicDto>>('/clinics', params),
  getById:    (id: string)                       => apiGet<ClinicDto>(`/clinics/${id}`),
  create:     (body: Partial<ClinicDto>)         => apiPost<ClinicDto>('/clinics', body),
  update:     (id: string, body: Partial<ClinicDto>) => apiPatch<ClinicDto>(`/clinics/${id}`, body),
  delete:     (id: string)                       => apiDelete<ClinicDto>(`/clinics/${id}`),
  getDoctors: (id: string, params?: Record<string, unknown>) => apiGet<PaginatedData<DoctorDto>>(`/clinics/${id}/doctors`, params),
};

/** svc-doctor :4004 → /api/v1/doctors/ */
export const doctorsApi = {
  list:               (params?: Record<string, unknown>) => apiGet<PaginatedData<DoctorDto>>('/doctors', params),
  getById:            (id: string)                       => apiGet<DoctorDto>(`/doctors/${id}`),
  update:             (id: string, body: Partial<DoctorDto>) => apiPatch<DoctorDto>(`/doctors/${id}`, body),
  dashboard:          ()                                 => apiGet<DoctorDashboardDto>('/doctors/dashboard'),
  getAvailability:    (id: string)                       => apiGet<AvailabilityDto[]>(`/doctors/${id}/availability`),
  upsertAvailability: (id: string, body: Partial<AvailabilityDto>) => apiPost<AvailabilityDto>(`/doctors/${id}/availability`, body),
  deleteAvailability: (id: string, availId: string)     => apiDelete(`/doctors/${id}/availability/${availId}`),
  getSlots:           (id: string, date: string)         => apiGet<SlotDto[]>(`/doctors/${id}/slots`, { date }),
  getReviews:         (id: string, params?: Record<string, unknown>) => apiGet<PaginatedData<ReviewDto>>(`/doctors/${id}/reviews`, params),
};

/** svc-patient :4005 → /api/v1/patients/ */
export const patientsApi = {
  list:             (params?: Record<string, unknown>) => apiGet<PaginatedData<PatientDto>>('/patients', params),
  getById:          (id: string)                       => apiGet<PatientDto>(`/patients/${id}`),
  update:           (id: string, body: Partial<PatientDto>) => apiPatch<PatientDto>(`/patients/${id}`, body),
  dashboard:        ()                                 => apiGet<PatientDashboardDto>('/patients/dashboard'),
  getAppointments:  (id: string, params?: Record<string, unknown>) => apiGet<PaginatedData<AppointmentDto>>(`/patients/${id}/appointments`, params),
  getNotifications: (id: string)                       => apiGet<PaginatedData<NotificationDto>>(`/patients/${id}/notifications`),
  markNotifRead:    (id: string, notifId: string)      => apiPatch(`/patients/${id}/notifications/${notifId}`, {}),
};

/** svc-appointment :4006 → /api/v1/appointments/ */
export const appointmentsApi = {
  list:          (params?: Record<string, unknown>)         => apiGet<PaginatedData<AppointmentDto>>('/appointments', params),
  getById:       (id: string)                               => apiGet<AppointmentDto>(`/appointments/${id}`),
  create:        (body: CreateAppointmentBody)              => apiPost<AppointmentDto>('/appointments', body),
  update:        (id: string, body: UpdateAppointmentBody)  => apiPatch<AppointmentDto>(`/appointments/${id}`, body),
  cancel:        (id: string)                               => apiDelete<AppointmentDto>(`/appointments/${id}`),
  getPayment:    (id: string)                               => apiGet<PaymentDto>(`/appointments/${id}/payment`),
  updatePayment: (id: string, body: Partial<PaymentDto>)    => apiPatch<PaymentDto>(`/appointments/${id}/payment`, body),
  createReview:  (id: string, body: { rating: number; comment?: string; isPublic?: boolean }) =>
    apiPost<ReviewDto>(`/appointments/${id}/review`, body),
};

/** svc-dashboard :4007 → /api/v1/dashboard/ */
export const dashboardApi = {
  clinic:  () => apiGet<ClinicDashboardDto>('/dashboard/clinic'),
  doctor:  () => apiGet<DoctorDashboardDto>('/dashboard/doctor'),
  patient: () => apiGet<PatientDashboardDto>('/dashboard/patient'),
};

// ─── Dashboard DTO shapes ─────────────────────────────────────────────────────

export interface DoctorDashboardDto {
  doctor:        DoctorDto;
  stats:         { todayCount: number; weekCount: number; monthCount: number; pendingCount: number; completedCount: number; avgRating: number; totalRevenue: number };
  todaySchedule: AppointmentDto[];
  weeklyChart:   { label: string; value: number }[];
  recentReviews: ReviewDto[];
}

export interface PatientDashboardDto {
  patient:             PatientDto;
  stats:               { upcoming: number; completed: number; cancelled: number; totalSpent: number };
  nextAppointment:     AppointmentDto | null;
  recentAppointments:  AppointmentDto[];
  notifications:       NotificationDto[];
}

export interface ClinicDashboardDto {
  clinic:              ClinicDto;
  stats:               { totalDoctors: number; totalPatients: number; todayAppointments: number; monthAppointments: number; pendingAppointments: number; totalRevenue: number; pendingRevenue: number };
  recentAppointments:  AppointmentDto[];
  weeklyChart:         { label: string; value: number }[];
  topDoctors:          { doctor: DoctorDto; appointmentCount: number }[];
  revenueByMonth:      { label: string; amount: number }[];
}

// ─── Body types ───────────────────────────────────────────────────────────────

export interface CreateAppointmentBody {
  patientId: string;
  doctorId:  string;
  clinicId:  string;
  date:      string;
  time:      string;
  price:     number;
  notes?:    string;
}

export interface UpdateAppointmentBody {
  status?:       string;
  notes?:        string;
  cancelReason?: string;
}
