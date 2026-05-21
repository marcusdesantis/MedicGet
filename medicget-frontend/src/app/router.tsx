import { createBrowserRouter, Navigate } from 'react-router-dom';

// Public pages
import { HomePage } from '@/features/home/pages/HomePage';
import { LoginPage } from '@/features/auth/login/pages/LoginPage';
import { ForgotPasswordPage } from '@/features/auth/forgot-password/pages/ForgotPasswordPage';
import { ResetPasswordPage }  from '@/features/auth/reset-password/pages/ResetPasswordPage';
import { VerifyEmailPage }    from '@/features/auth/verify-email/pages/VerifyEmailPage';
import { RegisterProfilePage } from '@/features/auth/register/pages/RegisterProfilePage';
import { RegisterAddressPage } from '@/features/auth/register/pages/RegisterAddressPage';
import { RegisterProfessionalPage } from '@/features/auth/register/pages/RegisterProfessionalPage';
import { RegisterPatientPage } from '@/features/auth/register/pages/RegisterPatientPage';
import { RegisterClinicDetailsPage } from '@/features/auth/register/pages/RegisterClinicDetailsPage';
import { RegisterClinicPage } from '@/features/auth/register/pages/RegisterClinicPage';

// Layout + guards
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

// Patient pages
import { PatientDashboardPage } from '@/features/patient/dashboard/pages/PatientDashboardPage';
import { SearchDoctorsPage } from '@/features/patient/search/pages/SearchDoctorsPage';
import { PatientDoctorDetailPage } from '@/features/patient/doctor/pages/PatientDoctorDetailPage';
import { PatientAppointmentsPage } from '@/features/patient/appointments/pages/PatientAppointmentsPage';
import { MedicalHistoryPage } from '@/features/patient/medical-history/pages/MedicalHistoryPage';
import { PatientProfilePage } from '@/features/patient/profile/pages/PatientProfilePage';

// Doctor pages
import { DoctorDashboardPage } from '@/features/doctor/dashboard/pages/DoctorDashboardPage';
import { DoctorProfilePage } from '@/features/doctor/profile/pages/DoctorProfilePage';
import { DoctorCalendarPage } from '@/features/doctor/calendar/pages/DoctorCalendarPage';
import { DoctorAppointmentsPage } from '@/features/doctor/appointments/pages/DoctorAppointmentsPage';
import { PatientHistoryPage } from '@/features/doctor/patients/pages/PatientHistoryPage';
import { DoctorSetupPage } from '@/features/doctor/setup/pages/DoctorSetupPage';
import { DoctorPaymentsPage } from '@/features/doctor/payments/pages/DoctorPaymentsPage';
import { DoctorReportsPage }  from '@/features/doctor/reports/pages/DoctorReportsPage';

// Admin pages
import { AdminDashboardPage }     from '@/features/admin/dashboard/pages/AdminDashboardPage';
import { AdminUsersPage }         from '@/features/admin/users/pages/AdminUsersPage';
import { AdminPaymentsPage }      from '@/features/admin/payments/pages/AdminPaymentsPage';
import { AdminSettingsPage }      from '@/features/admin/settings/pages/AdminSettingsPage';

// Shared (chat + presencial detail + payment) pages
import {
  PatientAppointmentChatPage, DoctorAppointmentChatPage,
} from '@/features/shared/chat/pages/AppointmentChatPage';
import {
  PatientAppointmentDetailPage, DoctorAppointmentDetailPage,
} from '@/features/shared/appointment/pages/AppointmentDetailPage';
import { PaymentCheckoutPage } from '@/features/shared/payment/pages/PaymentCheckoutPage';
import { PaymentReturnPage }   from '@/features/shared/payment/pages/PaymentReturnPage';
import { TermsPage } from '@/features/legal/terms/pages/TermsPage';

// Public directory + detail
import { PublicDoctorsDirectoryPage } from '@/features/public/doctors/pages/PublicDoctorsDirectoryPage';
import { PublicDoctorDetailPage }     from '@/features/public/doctors/pages/PublicDoctorDetailPage';

// Clinic pages
import { ClinicDashboardPage } from '@/features/clinic/dashboard/pages/ClinicDashboardPage';
import { ManageDoctorsPage } from '@/features/clinic/doctors/pages/ManageDoctorsPage';
import { ClinicProfilePage } from '@/features/clinic/profile/pages/ClinicProfilePage';
import { ClinicAppointmentsPage } from '@/features/clinic/appointments/pages/ClinicAppointmentsPage';
import { ClinicPatientsPage } from '@/features/clinic/patients/pages/ClinicPatientsPage';
import { PaymentsPage } from '@/features/clinic/payments/pages/PaymentsPage';
import { ReportsPage } from '@/features/clinic/reports/pages/ReportsPage';
import { SpecialtiesPage } from '@/features/clinic/specialties/pages/SpecialtiesPage';

// Nav configs
import {
  LayoutDashboard, Search, CalendarDays, FileText, User,
  Stethoscope, Calendar, Users, BarChart2, CreditCard, BookOpen,
  Settings as SettingsIcon, Building2,
} from 'lucide-react';
import type { NavItem } from '@/components/layout/Sidebar';

const patientNav: NavItem[] = [
  { label: 'Dashboard',       path: '/patient',              icon: LayoutDashboard },
  { label: 'Buscar médicos',  path: '/patient/search',       icon: Search },
  { label: 'Mis citas',       path: '/patient/appointments', icon: CalendarDays },
  { label: 'Historial',       path: '/patient/history',      icon: FileText },
  { label: 'Mi perfil',       path: '/patient/profile',      icon: User },
];

const doctorNav: NavItem[] = [
  { label: 'Dashboard',       path: '/doctor',               icon: LayoutDashboard },
  { label: 'Mi perfil',       path: '/doctor/profile',       icon: Stethoscope },
  { label: 'Calendario',      path: '/doctor/calendar',      icon: Calendar },
  { label: 'Citas',           path: '/doctor/appointments',  icon: CalendarDays },
  { label: 'Pacientes',       path: '/doctor/patients',      icon: Users },
  { label: 'Pagos',           path: '/doctor/payments',      icon: CreditCard },
  { label: 'Reportes',        path: '/doctor/reports',       icon: BarChart2 },
];

const clinicNav: NavItem[] = [
  { label: 'Dashboard',       path: '/clinic',               icon: LayoutDashboard },
  { label: 'Mi perfil',       path: '/clinic/profile',       icon: Building2 },
  { label: 'Médicos',         path: '/clinic/doctors',       icon: Stethoscope },
  { label: 'Citas',           path: '/clinic/appointments',  icon: CalendarDays },
  { label: 'Pacientes',       path: '/clinic/patients',      icon: Users },
  { label: 'Pagos',           path: '/clinic/payments',      icon: CreditCard },
  { label: 'Informes',        path: '/clinic/reports',       icon: BarChart2 },
  { label: 'Especialidades',  path: '/clinic/specialties',   icon: BookOpen },
];

const adminNav: NavItem[] = [
  { label: 'Panel general',  path: '/admin',               icon: LayoutDashboard },
  { label: 'Usuarios',       path: '/admin/users',         icon: Users },
  { label: 'Pagos',          path: '/admin/payments',      icon: CreditCard },
  { label: 'Configuración',  path: '/admin/settings',      icon: SettingsIcon },
];

export const router = createBrowserRouter([
  // Public
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password',  element: <ResetPasswordPage /> },
  { path: '/verify-email',    element: <VerifyEmailPage /> },
  { path: '/register', element: <RegisterProfilePage /> },
  { path: '/register/address', element: <RegisterAddressPage /> },
  { path: '/register/professional', element: <RegisterProfessionalPage /> },
  { path: '/register/patient', element: <RegisterPatientPage /> },
  { path: '/register/clinic', element: <RegisterClinicPage /> },
  { path: '/register/clinic/details', element: <RegisterClinicDetailsPage /> },

  // ── Pagina legal publica ──
  { path: '/terminos', element: <TermsPage /> },

  // ── Payment return (callback de PayPhone) ──
  // Endpoint compartido fuera del ProtectedRoute para que cualquier rol
  // que vuelva del PayPhone aterrice limpio. La pagina detecta el
  // payment id en query y confirma con el backend.
  { path: '/payment/return', element: <PaymentReturnPage /> },

  // ── Public directory ──
  { path: '/medicos',      element: <PublicDoctorsDirectoryPage /> },
  { path: '/medicos/:id',  element: <PublicDoctorDetailPage /> },

  // Doctor profile setup — first-time onboarding after registration. Lives
  // outside /doctor on purpose so it doesn't render the protected dashboard
  // shell while the doctor is still completing their data.
  { path: '/doctor/setup', element: <DoctorSetupPage /> },

  // Patient
  {
    path: '/patient',
    element: (
      <ProtectedRoute allowedRole="patient">
        <DashboardLayout navItems={patientNav} roleLabel="Portal Paciente" roleColor="bg-blue-600" />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <PatientDashboardPage /> },
      { path: 'search', element: <SearchDoctorsPage /> },
      { path: 'doctor/:id', element: <PatientDoctorDetailPage /> },
      { path: 'appointments', element: <PatientAppointmentsPage /> },
      { path: 'appointments/:id', element: <PatientAppointmentDetailPage /> },
      { path: 'appointments/:id/chat', element: <PatientAppointmentChatPage /> },
      { path: 'history', element: <MedicalHistoryPage /> },
      { path: 'profile', element: <PatientProfilePage /> },
    ],
  },

  // ── Payment checkout (PayPhone) ──────────────────────────────────────
  // Solo el paciente inicia un checkout de cita (los doctores/clínicas no
  // pagan citas). El /payment/return en cambio está afuera de este bloque
  // (ver arriba) para no bloquear el callback cuando es una suscripción.
  {
    path: '/payment',
    element: (
      <ProtectedRoute allowedRole="patient">
        <DashboardLayout navItems={patientNav} roleLabel="Portal Paciente" roleColor="bg-blue-600" />
      </ProtectedRoute>
    ),
    children: [
      { path: 'checkout/:id', element: <PaymentCheckoutPage /> },
    ],
  },

  // Doctor
  {
    path: '/doctor',
    element: (
      <ProtectedRoute allowedRole="doctor">
        <DashboardLayout navItems={doctorNav} roleLabel="Portal Médico" roleColor="bg-teal-600" />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DoctorDashboardPage /> },
      { path: 'profile', element: <DoctorProfilePage /> },
      { path: 'calendar', element: <DoctorCalendarPage /> },
      { path: 'appointments', element: <DoctorAppointmentsPage /> },
      { path: 'appointments/:id', element: <DoctorAppointmentDetailPage /> },
      { path: 'appointments/:id/chat', element: <DoctorAppointmentChatPage /> },
      { path: 'patients', element: <PatientHistoryPage /> },
      { path: 'payments', element: <DoctorPaymentsPage /> },
      { path: 'reports',  element: <DoctorReportsPage /> },
    ],
  },

  // ─── Admin (superadmin) ──────────────────────────────────────────────
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRole="admin">
        <DashboardLayout navItems={adminNav} roleLabel="Panel Admin" roleColor="bg-rose-600" />
      </ProtectedRoute>
    ),
    children: [
      { index: true,                 element: <AdminDashboardPage /> },
      { path:  'users',              element: <AdminUsersPage /> },
      { path:  'payments',           element: <AdminPaymentsPage /> },
      { path:  'settings',           element: <AdminSettingsPage /> },
    ],
  },

  // Clinic
  {
    path: '/clinic',
    element: (
      <ProtectedRoute allowedRole="clinic">
        <DashboardLayout navItems={clinicNav} roleLabel="Portal Clínica" roleColor="bg-indigo-600" />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <ClinicDashboardPage /> },
      { path: 'profile', element: <ClinicProfilePage /> },
      { path: 'doctors', element: <ManageDoctorsPage /> },
      { path: 'appointments', element: <ClinicAppointmentsPage /> },
      { path: 'patients', element: <ClinicPatientsPage /> },
      { path: 'payments', element: <PaymentsPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'specialties', element: <SpecialtiesPage /> },
    ],
  },

  // Fallback
  { path: '*', element: <Navigate to="/login" replace /> },
]);
