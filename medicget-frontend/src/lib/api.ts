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

/**
 * Shape of a typed API error body. The `details` bag is optional; the auth
 * service uses `details.field` to point at the form field that triggered a
 * unique-violation conflict (e.g. `{ field: "email" }`).
 */
export interface ApiErrorBody {
  ok:    false;
  error: {
    code:     string;
    message:  string;
    details?: { field?: string } & Record<string, unknown>;
  };
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (!error.response) {
      toast.error('No se puede conectar con el servidor. Comprueba tu conexión.');
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    if (status === 401) {
      // Don't kick the user back to /login if the 401 is from a login or
      // register attempt — they're already on an auth screen and need to
      // see the inline error rather than being redirected mid-form.
      const url = error.config?.url ?? '';
      const isAuthForm = url.includes('/auth/login') || url.includes('/auth/register');
      if (!isAuthForm) {
        localStorage.removeItem(TOKEN_KEY);
        toast.error('Sesión expirada. Por favor, inicia sesión de nuevo.');
        window.location.replace('/login');
      }
      return Promise.reject(error);
    }

    const message =
      data?.error?.message ??
      (status === 403 ? 'No tienes permiso para realizar esta acción.' :
       status === 404 ? 'El recurso solicitado no existe.' :
       status >= 500  ? 'Error interno del servidor. Inténtalo más tarde.' :
                        'Ocurrió un error inesperado.');

    // For 4xx errors on auth forms we DON'T toast — the form will render the
    // error inline next to the relevant field. Toasts are only for
    // server/network problems the form can't visually represent.
    const url = error.config?.url ?? '';
    const isAuthForm = url.includes('/auth/login') || url.includes('/auth/register');
    if (!isAuthForm || status >= 500) {
      toast.error(message);
    }
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
  role:      'CLINIC' | 'DOCTOR' | 'PATIENT' | 'ADMIN';
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
  /**
   * Appointment modalities the doctor accepts. Backend enforces that at
   * least one is selected; defaults to `['ONLINE']` for new doctors. The
   * patient booking page filters its modality picker by this list.
   */
  modalities:      AppointmentModality[];
  rating:          number;
  reviewCount:     number;
  available:       boolean;
  user:            { profile: ProfileDto };
  /**
   * After the `Doctor.clinicId` optional migration, an independent doctor
   * (no clinic associated) returns `null` here. UI must guard against it
   * when offering booking — Appointment creation requires a clinicId.
   */
  clinic:          { id: string; name: string } | null;
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
  /** Active or chronic conditions — patient self-reports, doctor reviews. */
  conditions:   string[];
  /** Active medications. Free-form strings until we model dosage formally. */
  medications:  string[];
  notes?:       string;
  user:         { profile: ProfileDto; email: string };
}

export type AppointmentModality = 'ONLINE' | 'PRESENCIAL' | 'CHAT';

export interface AppointmentDto {
  id:           string;
  date:         string;
  time:         string;
  status:       string;
  /** ONLINE → videollamada, PRESENCIAL → en consultorio, CHAT → mensajería. */
  modality:     AppointmentModality;
  price:        number;
  notes?:       string;
  cancelReason?: string;
  createdAt:    string;
  patient:      { id: string; user: { profile: ProfileDto } };
  doctor:       { id: string; specialty: string; user: { profile: ProfileDto } };
  /**
   * Null when the doctor is independent (no clinic association). The
   * Appointment.clinicId column is optional after migration
   * `20260506100000_appointment_optional_clinic_modality`.
   */
  clinic:       { id: string; name: string } | null;
  /**
   * Auto-generated Jitsi Meet URL. Populated only when modality is ONLINE.
   * Sent to the patient by email at booking time and reused on both sides
   * to join the consult.
   */
  meetingUrl?:  string | null;
  /** PRESENCIAL only — set when the patient taps "He llegado". */
  patientArrivedAt?:  string | null;
  /** PRESENCIAL only — set when the doctor taps "Recibí al paciente". */
  doctorCheckedInAt?: string | null;
  payment?:     PaymentDto | null;
  review?:      ReviewDto  | null;
}

// ─── Chat (CHAT-modality appointments) ────────────────────────────────────────

/** A single message in the appointment chat thread. */
export interface ChatMessageDto {
  id:             string;
  appointmentId:  string;
  senderId:       string;
  content:        string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
  /** Set the moment the recipient first re-opens the thread after this msg. */
  readAt?:        string | null;
  /** Soft-delete marker — UI hides content when set ("Mensaje eliminado"). */
  deletedAt?:     string | null;
  createdAt:      string;
}

/** "Peer" descriptor — the other participant from the caller's perspective. */
export interface ChatPeerDto {
  userId:    string;
  firstName: string;
  lastName:  string;
  avatarUrl: string | null;
  role:      'DOCTOR' | 'PATIENT';
  /** Doctor specialty when peer.role === 'DOCTOR', otherwise null. */
  specialty: string | null;
}

/** Bundle returned by GET /appointments/:id/messages. */
export interface ChatThreadDto {
  appointment: {
    id:       string;
    date:     string;
    time:     string;
    status:   string;
    modality: AppointmentModality;
  };
  peer:     ChatPeerDto;
  myUserId: string;
  /**
   * Whether the input is enabled for the caller. Driven by the
   * appointment status — false once it's COMPLETED / CANCELLED / NO_SHOW.
   */
  canSend:  boolean;
  messages: ChatMessageDto[];
}

export interface PaymentDto {
  id:            string;
  amount:        number;
  /** Platform retention. Set to 0 until the payment is approved. */
  platformFee:   number;
  /** What the doctor/clinic actually receives (= amount - platformFee). */
  doctorAmount:  number;
  method:        string;
  status:        string;
  transactionId?: string;
  /**
   * URL to PayPhone's checkout. The frontend redirects the user here.
   * Cached for 15 minutes so the patient can re-open the same session
   * after closing the tab.
   */
  paymentUrl?:   string | null;
  payphonePaymentId?: string | null;
  /** ISO timestamp after which the unpaid Appointment is auto-cancelled. */
  expiresAt?:    string | null;
  paidAt?:       string;
  refundedAt?:   string;
  notes?:        string;
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

/**
 * Body accepted by `POST /api/v1/auth/register`. Common fields are required;
 * role-specific fields are optional and only consulted by the backend when
 * the matching role is selected. Mirrors the Zod schema in
 *   svc-auth/src/app/api/v1/auth/register/route.ts
 */
export interface RegisterBody {
  // Auth + Profile (every role)
  email:     string;
  password:  string;
  role:      'CLINIC' | 'DOCTOR' | 'PATIENT';
  firstName: string;
  lastName:  string;
  phone?:    string;
  address?:  string;
  city?:     string;
  country?:  string;

  // CLINIC role
  clinicName?:        string;
  clinicDescription?: string;
  clinicPhone?:       string;
  clinicEmail?:       string;
  clinicWebsite?:     string;

  // DOCTOR role (accepted but currently not persisted to a Doctor row;
  // the doctor completes their professional profile after login)
  specialty?:       string;
  licenseNumber?:   string;
  experience?:      number;
  pricePerConsult?: number;
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
  /**
   * Crea un médico nuevo asociado a la clínica con credenciales
   * temporales. Devuelve { doctor, tempPassword } — el admin debe
   * compartir tempPassword con el médico (también se le manda por email).
   */
  createDoctor: (clinicId: string, body: {
    email: string; firstName: string; lastName: string;
    phone?: string; specialty: string; licenseNumber?: string;
    experience?: number; pricePerConsult?: number; bio?: string;
    consultDuration?: number; languages?: string[];
  }) => apiPost<{ doctor: DoctorDto; tempPassword: string }>(`/clinics/${clinicId}/doctors`, body),
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
  /**
   * PRESENCIAL check-in events. Patient taps `arrived`, doctor taps
   * `patient_received` (which also flips the cita to ONGOING) or
   * `no_show`. `undo` reverts the caller's own timestamp.
   */
  checkin:       (id: string, event: 'arrived' | 'patient_received' | 'no_show' | 'undo') =>
    apiPost<AppointmentDto>(`/appointments/${id}/checkin`, { event }),
};

/**
 * Chat endpoints for CHAT-modality appointments. Both the patient and
 * the assigned doctor can read/write while the appointment is active.
 *
 *   list(id)                 → fetch the entire thread + peer descriptor
 *   list(id, sinceIso)       → poll for messages newer than `since` only
 *   send(id, body)           → persist a new message
 *   remove(id, messageId)    → soft-delete a message (sender only)
 */
export const chatApi = {
  list:   (id: string, since?: string) =>
    apiGet<ChatThreadDto>(`/appointments/${id}/messages`, since ? { since } : undefined),
  send:   (id: string, body: { content: string; attachmentUrl?: string; attachmentName?: string; attachmentMime?: string }) =>
    apiPost<ChatMessageDto>(`/appointments/${id}/messages`, body),
  remove: (id: string, messageId: string) =>
    apiDelete<ChatMessageDto>(`/appointments/${id}/messages/${messageId}`),
};

/**
 * Payment endpoints driving the PayPhone integration.
 *
 *   checkout(id, body) → POSTs the responseUrl/cancellationUrl back to
 *                        the API and receives the PayPhone redirect URL.
 *                        The frontend then `window.location` redirects
 *                        the user there.
 *   confirm(id, body)  → invoked from /payment/return after PayPhone
 *                        sends the user back. Confirms with PayPhone and
 *                        flips the local Payment + Appointment state.
 *   refund(id)         → patient (>24h) or clinic-initiated refund.
 */
export const paymentApi = {
  checkout: (id: string, body: { responseUrl: string; cancellationUrl?: string }) =>
    apiPost<{ redirectUrl: string; expiresAt: string }>(`/appointments/${id}/payment/checkout`, body),
  confirm:  (id: string, body: { payphonePaymentId: string; fakeOk?: boolean }) =>
    apiPost<{ status: 'PAID' | 'FAILED' | 'PENDING' }>(`/appointments/${id}/payment/confirm`, body),
  refund:   (id: string) =>
    apiPost<{ refunded: boolean; reason: string }>(`/appointments/${id}/payment/refund`, {}),
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
  /** Optional — independent doctors don't have one. If provided, must be cuid. */
  clinicId?: string;
  date:      string;
  time:      string;
  /** Defaults to ONLINE on the backend if omitted. */
  modality?: AppointmentModality;
  price:     number;
  notes?:    string;
}

export interface UpdateAppointmentBody {
  status?:       string;
  notes?:        string;
  cancelReason?: string;
}

// ─── Plans / Subscriptions / Admin ────────────────────────────────────────────

export type PlanCode     = 'FREE' | 'PRO' | 'PREMIUM';
export type PlanAudience = 'DOCTOR' | 'CLINIC';

export interface PlanDto {
  id:           string;
  code:         PlanCode;
  audience:     PlanAudience;
  name:         string;
  description:  string | null;
  monthlyPrice: number;
  modules:      string[];
  limits:       Record<string, unknown> | null;
  isActive:     boolean;
  sortOrder:    number;
}

export interface SubscriptionDto {
  id:            string;
  userId:        string;
  planId:        string;
  status:        'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING_PAYMENT';
  startsAt:      string;
  expiresAt:     string;
  lastPaymentId: string | null;
  autoRenew:     boolean;
  cancelledAt:   string | null;
  plan?:         PlanDto;
  user?:         UserDto;
}

export interface AppSettingDto {
  id:        string;
  key:       string;
  value:     string | null;
  category:  string;
  isSecret:  boolean;
  updatedAt: string;
}

export interface AdminStatsDto {
  users:         { total: number; patients: number; doctors: number; clinics: number };
  appointments:  { total: number };
  revenue:       { gross: number; platformFees: number; paidCount: number };
  subscriptions: { active: number };
}

export const plansApi = {
  /** Public — used by the landing page. Optional `audience` filter. */
  list: (audience?: PlanAudience) =>
    apiGet<PlanDto[]>('/plans', audience ? { audience } : undefined),
};

export const subscriptionsApi = {
  /** Returns the caller's current active subscription + the FREE fallback plan. */
  me: () => apiGet<{ subscription: SubscriptionDto | null; freePlan: PlanDto | null }>('/subscriptions/me'),
  checkout: (body: { planId: string; responseUrl: string; cancellationUrl?: string }) =>
    apiPost<{ subscriptionId: string; redirectUrl: string; payphonePaymentId?: string }>('/subscriptions/checkout', body),
  confirm: (body: { subscriptionId: string; payphonePaymentId: string; fakeOk?: boolean }) =>
    apiPost<{ status: 'ACTIVE' | 'PENDING' | 'FAILED' }>('/subscriptions/confirm', body),
  /** Cancela el plan paga y vuelve a FREE inmediatamente. */
  cancel: () => apiPost<{ ok: true }>('/subscriptions/cancel', {}),
};

/** Public branding settings — used to paint the landing page header. */
export const publicSettingsApi = {
  get: () => apiGet<{ brandName: string; brandLogo: string | null }>('/app-settings/public'),
};

/** Superadmin-only API. All endpoints require `role === ADMIN`. */
export const adminApi = {
  stats:        () => apiGet<AdminStatsDto>('/admin/stats'),
  users:        (params?: Record<string, unknown>) => apiGet<PaginatedData<UserDto>>('/admin/users', params),
  setUserStatus:(id: string, status: 'ACTIVE' | 'INACTIVE' | 'DELETED') =>
    apiPatch<UserDto>(`/admin/users/${id}`, { status }),
  deleteUser:   (id: string) => apiDelete<UserDto>(`/admin/users/${id}`),

  listPlans:    () => apiGet<PlanDto[]>('/admin/plans'),
  createPlan:   (body: Partial<PlanDto>) => apiPost<PlanDto>('/admin/plans', body),
  updatePlan:   (id: string, body: Partial<PlanDto>) => apiPatch<PlanDto>(`/admin/plans/${id}`, body),
  deletePlan:   (id: string) => apiDelete<PlanDto>(`/admin/plans/${id}`),

  subscriptions: (params?: Record<string, unknown>) =>
    apiGet<PaginatedData<SubscriptionDto>>('/admin/subscriptions', params),
  extendSubscription: (id: string, days: number) =>
    apiPost<SubscriptionDto>(`/admin/subscriptions/${id}/extend`, { days }),

  settings:      () => apiGet<AppSettingDto[]>('/admin/settings'),
  saveSettings:  (values: Record<string, string | null>) =>
    apiPatch<AppSettingDto[]>('/admin/settings', { values }),
  /** Crea cualquier tipo de usuario manualmente. Devuelve la temp password. */
  createUser: (body: {
    email: string; firstName: string; lastName: string; phone?: string;
    role: 'PATIENT' | 'DOCTOR' | 'CLINIC' | 'ADMIN';
    clinicName?: string; specialty?: string;
  }) => apiPost<{ user: UserDto; tempPassword: string }>('/admin/users/create', body),
};
