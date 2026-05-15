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

// ─── Doctor / Patient / Appointment ──────────────────────────────────────────

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

export interface AvailabilityDto {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface SlotDto {
  id: string;
  date: string;
  time: string;
  isBooked: boolean;
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

export interface PaymentDto {
  id: string;
  amount: number;
  platformFee: number;
  doctorAmount: number;
  method: string;
  status: string;
  transactionId?: string;
  paymentUrl?: string | null;
  payphonePaymentId?: string | null;
  expiresAt?: string | null;
  paidAt?: string;
  refundedAt?: string;
  notes?: string;
}

export interface ReviewDto {
  id: string;
  rating: number;
  comment?: string;
  isPublic: boolean;
  createdAt: string;
}

export interface MedicalRecordDto {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  reason: string;
  symptoms?: string;
  existingConditions?: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageDto {
  id: string;
  appointmentId: string;
  senderId: string;
  content: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
  readAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
}

export interface ChatPeerDto {
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: 'DOCTOR' | 'PATIENT';
  specialty: string | null;
}

export interface ChatThreadDto {
  appointment: {
    id: string;
    date: string;
    time: string;
    status: string;
    modality: AppointmentModality;
  };
  peer: ChatPeerDto;
  myUserId: string;
  canSend: boolean;
  messages: ChatMessageDto[];
}

export interface CheckoutSessionDto {
  token: string;
  storeId: string;
  amount: number;
  amountWithoutTax: number;
  amountWithTax: number;
  tax: number;
  service: number;
  tip: number;
  currency: string;
  clientTransactionId: string;
  reference: string;
  responseUrl: string;
  stubMode: boolean;
  expiresAt: string;
  /** Desglose honorarios + comisión + total. El backend lo agrega a la
   *  respuesta del checkout aunque no esté en el shape oficial de la
   *  Cajita. */
  breakdown?: PaymentBreakdownDto;
}

export interface PaymentBreakdownDto {
  baseAmount: number;
  platformFee: number;
  totalAmount: number;
  feePct: number;
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
  payment?: PaymentDto | null;
  review?: ReviewDto | null;
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
  recentReviews: ReviewDto[];
}

export interface MedicalRecordInput {
  reason: string;
  symptoms?: string;
  existingConditions?: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
}

export interface PaymentRowDto {
  id: string;
  appointmentId: string;
  amount: number;
  platformFee?: number | null;
  doctorAmount?: number | null;
  method: string;
  status: 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';
  paidAt?: string | null;
  refundedAt?: string | null;
  transactionId?: string | null;
  notes?: string | null;
  createdAt: string;
  appointment: {
    id: string;
    date: string;
    time: string;
    modality: string;
    price: number;
    patient: { id: string; user: { email: string; profile?: ProfileDto } };
    doctor: { id: string; specialty: string; user: { profile?: ProfileDto } };
    clinic: { id: string; name: string } | null;
  };
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

  // DOCTOR
  specialty?: string;
  licenseNumber?: string;
  experience?: number;
  pricePerConsult?: number;
}

export interface CreateAppointmentBody {
  patientId: string;
  doctorId: string;
  clinicId?: string;
  date: string;
  time: string;
  modality?: AppointmentModality;
  price: number;
  notes?: string;
}

export interface UpdateAppointmentBody {
  status?: string;
  notes?: string;
  cancelReason?: string;
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

// ─── Domain APIs ──────────────────────────────────────────────────────────────

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

export const doctorsApi = {
  list: (params?: Record<string, unknown>) =>
    apiGet<PaginatedData<DoctorDto>>('/doctors', params),
  getById: (id: string) => apiGet<DoctorDto>(`/doctors/${id}`),
  update: (id: string, body: Partial<DoctorDto>) =>
    apiPatch<DoctorDto>(`/doctors/${id}`, body),
  getAvailability: (id: string) =>
    apiGet<AvailabilityDto[]>(`/doctors/${id}/availability`),
  upsertAvailability: (id: string, body: Partial<AvailabilityDto>) =>
    apiPost<AvailabilityDto>(`/doctors/${id}/availability`, body),
  deleteAvailability: (id: string, availId: string) =>
    apiDelete(`/doctors/${id}/availability/${availId}`),
  getSlots: (id: string, date: string) =>
    apiGet<SlotDto[]>(`/doctors/${id}/slots`, { date }),
  getReviews: (id: string, params?: Record<string, unknown>) =>
    apiGet<PaginatedData<ReviewDto>>(`/doctors/${id}/reviews`, params),
};

export const patientsApi = {
  list: (params?: Record<string, unknown>) =>
    apiGet<PaginatedData<PatientDto>>('/patients', params),
  getById: (id: string) => apiGet<PatientDto>(`/patients/${id}`),
  update: (id: string, body: Partial<PatientDto>) =>
    apiPatch<PatientDto>(`/patients/${id}`, body),
};

export const clinicsApi = {
  list: (params?: Record<string, unknown>) =>
    apiGet<PaginatedData<ClinicDto>>('/clinics', params),
  getById: (id: string) => apiGet<ClinicDto>(`/clinics/${id}`),
  update: (id: string, body: Partial<ClinicDto>) =>
    apiPatch<ClinicDto>(`/clinics/${id}`, body),
  getDoctors: (id: string, params?: Record<string, unknown>) =>
    apiGet<PaginatedData<DoctorDto>>(`/clinics/${id}/doctors`, params),
  /**
   * Crea un médico nuevo asociado a la clínica con credenciales temporales.
   * Devuelve { doctor, tempPassword } — el admin debe compartir tempPassword
   * con el médico (también se le manda por email).
   */
  createDoctor: (
    clinicId: string,
    body: {
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      specialty: string;
      licenseNumber?: string;
      experience?: number;
      pricePerConsult?: number;
      bio?: string;
      consultDuration?: number;
      languages?: string[];
    },
  ) =>
    apiPost<{ doctor: DoctorDto; tempPassword: string }>(
      `/clinics/${clinicId}/doctors`,
      body,
    ),
};

export const appointmentsApi = {
  list: (params?: Record<string, unknown>) =>
    apiGet<PaginatedData<AppointmentDto>>('/appointments', params),
  getById: (id: string) => apiGet<AppointmentDto>(`/appointments/${id}`),
  create: (body: CreateAppointmentBody) =>
    apiPost<AppointmentDto>('/appointments', body),
  update: (id: string, body: UpdateAppointmentBody) =>
    apiPatch<AppointmentDto>(`/appointments/${id}`, body),
  cancel: (id: string) => apiDelete<AppointmentDto>(`/appointments/${id}`),
  createReview: (id: string, body: { rating: number; comment?: string; isPublic?: boolean }) =>
    apiPost<ReviewDto>(`/appointments/${id}/review`, body),
  confirmCompletion: (id: string) =>
    apiPost<AppointmentDto>(`/appointments/${id}/confirm-completion`, {}),
  getMedicalRecord: (id: string) =>
    apiGet<MedicalRecordDto>(`/appointments/${id}/medical-record`),
  checkin: (id: string, event: 'arrived' | 'patient_received' | 'no_show' | 'undo') =>
    apiPost<AppointmentDto>(`/appointments/${id}/checkin`, { event }),
  getPayment: (id: string) =>
    apiGet<PaymentDto>(`/appointments/${id}/payment`),
  upsertMedicalRecord: (id: string, body: MedicalRecordInput) =>
    apiPost<MedicalRecordDto>(`/appointments/${id}/medical-record`, body),
};

export const chatApi = {
  list: (id: string, since?: string) =>
    apiGet<ChatThreadDto>(
      `/appointments/${id}/messages`,
      since ? { since } : undefined,
    ),
  send: (
    id: string,
    body: {
      content: string;
      attachmentUrl?: string;
      attachmentName?: string;
      attachmentMime?: string;
    },
  ) => apiPost<ChatMessageDto>(`/appointments/${id}/messages`, body),
  remove: (id: string, messageId: string) =>
    apiDelete<ChatMessageDto>(`/appointments/${id}/messages/${messageId}`),
};

export const paymentApi = {
  checkout: (id: string, body: { responseUrl: string }) =>
    apiPost<CheckoutSessionDto>(`/appointments/${id}/payment/checkout`, body),
  confirm: (id: string, body: { payphoneId?: string; fakeOk?: boolean }) =>
    apiPost<{ status: 'PAID' | 'FAILED' | 'PENDING' }>(
      `/appointments/${id}/payment/confirm`,
      body,
    ),
  list: (params?: Record<string, unknown>) =>
    apiGet<PaginatedData<PaymentRowDto>>('/payments', params),
};

export const notificationsApi = {
  list: (params?: { limit?: number; onlyUnread?: 0 | 1 }) =>
    apiGet<{ items: NotificationDto[]; unreadCount: number }>(
      '/notifications',
      params,
    ),
  markRead: (id: string) =>
    apiPatch<NotificationDto>(`/notifications/${id}/read`, {}),
  markAllRead: () =>
    apiPost<{ updated: number }>('/notifications/read-all', {}),
};

// ─── Admin / Superadmin ──────────────────────────────────────────────────────

export type PlanCode = 'FREE' | 'PRO' | 'PREMIUM';
export type PlanAudience = 'DOCTOR' | 'CLINIC';

export interface PlanDto {
  id: string;
  code: PlanCode;
  audience: PlanAudience;
  name: string;
  description: string | null;
  monthlyPrice: number;
  modules: string[];
  limits: Record<string, unknown> | null;
  isActive: boolean;
  sortOrder: number;
}

export interface SubscriptionDto {
  id: string;
  userId: string;
  planId: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING_PAYMENT';
  startsAt: string;
  expiresAt: string;
  lastPaymentId: string | null;
  autoRenew: boolean;
  cancelledAt: string | null;
  plan?: PlanDto;
  user?: UserDto;
}

export interface AppSettingDto {
  id: string;
  key: string;
  value: string | null;
  category: string;
  isSecret: boolean;
  updatedAt: string;
}

export interface AdminStatsDto {
  users: { total: number; patients: number; doctors: number; clinics: number };
  appointments: { total: number };
  revenue: { gross: number; platformFees: number; paidCount: number };
  subscriptions: { active: number };
}

export interface AdminUserPatch {
  email?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'DELETED' | 'PENDING_VERIFICATION';
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    city?: string;
    province?: string;
    country?: string;
    avatarUrl?: string;
  };
  clinic?: {
    name?: string;
    description?: string;
    address?: string;
    city?: string;
    province?: string;
    country?: string;
    phone?: string;
    email?: string;
    website?: string;
    logoUrl?: string;
  };
  doctor?: {
    specialty?: string;
    licenseNumber?: string;
    experience?: number;
    pricePerConsult?: number;
    bio?: string;
    consultDuration?: number;
    languages?: string[];
    modalities?: ('ONLINE' | 'PRESENCIAL' | 'CHAT')[];
    available?: boolean;
  };
  patient?: {
    dateOfBirth?: string;
    bloodType?: string;
    allergies?: string[];
    conditions?: string[];
    medications?: string[];
    notes?: string;
  };
}

export const adminApi = {
  stats: () => apiGet<AdminStatsDto>('/admin/stats'),
  users: (params?: Record<string, unknown>) =>
    apiGet<PaginatedData<UserDto>>('/admin/users', params),
  setUserStatus: (
    id: string,
    status: 'ACTIVE' | 'INACTIVE' | 'DELETED' | 'PENDING_VERIFICATION',
  ) => apiPatch<UserDto>(`/admin/users/${id}`, { status }),
  updateUserFull: (id: string, body: AdminUserPatch) =>
    apiPatch<UserDto>(`/admin/users/${id}`, body),
  deleteUser: (id: string) => apiDelete<UserDto>(`/admin/users/${id}`),
  impersonate: (id: string) =>
    apiPost<{ token: string; user: { id: string; email: string; role: string } }>(
      `/admin/users/${id}/impersonate`,
      {},
    ),
  createUser: (body: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: 'PATIENT' | 'DOCTOR' | 'CLINIC' | 'ADMIN';
    clinicName?: string;
    specialty?: string;
  }) =>
    apiPost<{ user: UserDto; tempPassword: string }>(
      '/admin/users/create',
      body,
    ),

  listPlans: () => apiGet<PlanDto[]>('/admin/plans'),
  createPlan: (body: Partial<PlanDto>) =>
    apiPost<PlanDto>('/admin/plans', body),
  updatePlan: (id: string, body: Partial<PlanDto>) =>
    apiPatch<PlanDto>(`/admin/plans/${id}`, body),
  deletePlan: (id: string) => apiDelete<PlanDto>(`/admin/plans/${id}`),

  subscriptions: (params?: Record<string, unknown>) =>
    apiGet<PaginatedData<SubscriptionDto>>('/admin/subscriptions', params),
  extendSubscription: (id: string, days: number) =>
    apiPost<SubscriptionDto>(`/admin/subscriptions/${id}/extend`, { days }),
  changeSubscriptionPlan: (id: string, planId: string) =>
    apiPost<SubscriptionDto>(
      `/admin/subscriptions/${id}/change-plan`,
      { planId },
    ),

  settings: () => apiGet<AppSettingDto[]>('/admin/settings'),
  saveSettings: (values: Record<string, string | null>) =>
    apiPatch<AppSettingDto[]>('/admin/settings', { values }),
};
