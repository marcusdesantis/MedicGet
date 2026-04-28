import { createBrowserRouter } from 'react-router-dom';
import { HomePage } from '@/features/home/pages/HomePage';
import { RegisterProfilePage } from '@/features/auth/register/pages/RegisterProfilePage';
import { RegisterAddressPage } from '@/features/auth/register/pages/RegisterAddressPage';
import { RegisterProfessionalPage } from '@/features/auth/register/pages/RegisterProfessionalPage';
import { RegisterPatientPage } from '@/features/auth/register/pages/RegisterPatientPage';
import { RegisterClinicDetailsPage } from '@/features/auth/register/pages/RegisterClinicDetailsPage';
import { RegisterClinicPage } from '@/features/auth/register/pages/RegisterClinicPage';
import { LoginPage } from '@/features/auth/login/pages/LoginPage';
import { ForgotPasswordPage } from '@/features/auth/forgot-password/pages/ForgotPasswordPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPasswordPage />,
  },
  {
    path: "/register",
    element: <RegisterProfilePage />,
  },
  {
    path: "/register/address",
    element: <RegisterAddressPage />,
  },
  {
    path: "/register/professional",
    element: <RegisterProfessionalPage />,
  },
  {
    path: "/register/patient",
    element: <RegisterPatientPage />,
  },
  {
    path: "/register/clinic",
    element: <RegisterClinicPage />,
  },
  {
    path: "/register/clinic/details",
    element: <RegisterClinicDetailsPage />,
  }
]);
