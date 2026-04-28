import { useState } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { ClinicDetailsForm } from "../components/ClinicDetailsForm";
import { Button } from "@/components/ui/Button";
import { AuthCard } from "@/components/ui/AuthCard";

export const RegisterClinicDetailsPage = () => {
  const [form, setForm] = useState({
    name: "",
    lastname: "",
    role: "",
    email: "",
    confirmEmail: "",
    phone: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
    confirmAuthorization: false,
  });

  const isValid =
    form.acceptTerms &&
    form.confirmAuthorization &&
    form.password &&
    form.password === form.confirmPassword;

  return (
    <AuthLayout>
      <AuthCard>

        {/* HEADER */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-white">
            Complete los detalles
          </h1>

          <p className="text-sm text-slate-500 mt-2">
            Estos datos no serán visibles en su perfil.
          </p>
        </div>

        {/* DIVIDER */}
        <div className="border-t border-slate-200 dark:border-slate-700 mb-6" />

        {/* FORM */}
        <ClinicDetailsForm form={form} setForm={setForm} />

        {/* LEGAL INFO */}
        <div className="mt-8 text-xs text-slate-500 space-y-2">
          <p className="font-medium text-slate-600 dark:text-slate-300">
            INFORMACIÓN BÁSICA SOBRE PROTECCIÓN DE DATOS
          </p>

          <p>
            Responsable: DOCTORALIA INTERNET, S.L.
          </p>

          <p>
            Finalidad: Gestión de los servicios solicitados.
          </p>

          <p className="text-blue-500 cursor-pointer">
            Ver política completa
          </p>
        </div>

        {/* BUTTON */}
        <Button
          disabled={!isValid}
          className="
            mt-8 w-full py-3 rounded-full
            bg-green-600 hover:bg-green-700 text-white
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          Crear cuenta
        </Button>

        {/* FOOT NOTE */}
        <p className="text-xs text-center mt-3 text-slate-400">
          * Campo obligatorio
        </p>

      </AuthCard>
    </AuthLayout>
  );
};