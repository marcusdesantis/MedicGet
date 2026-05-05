import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { ClinicForm } from "../components/ClinicForm";
import { ClinicPreviewCard } from "../components/ClinicPreviewCard";
import { Button } from "@/components/ui/Button";
import { useRegistrationDraft } from "../state";
import { isClean, validateRequired } from "../validation";

/**
 * Clinic flow — step 1 of 2. Collects clinic-level info; user details and
 * password come on step 2 (RegisterClinicDetailsPage).
 */
export const RegisterClinicPage = () => {
  const navigate = useNavigate();
  const [draft, setDraft] = useRegistrationDraft("clinic");

  const errors = useMemo(() => ({
    clinicName:  validateRequired(draft.clinicName,  "El nombre de la clínica"),
    specialists: validateRequired(draft.specialists, "El número de especialistas"),
    city:        validateRequired(draft.city,        "La ciudad"),
  }), [draft]);

  const canContinue = isClean(errors);

  return (
    <AuthLayout>
      <div className="grid lg:grid-cols-12 gap-12 items-start w-full max-w-7xl px-4 py-8">

        <div className="lg:col-span-7 space-y-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100">
              Impulsa tu centro médico
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Únete a la red de salud más grande y gestiona tus pacientes de forma eficiente.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-950 p-2 rounded-xl">
            <ClinicForm form={draft} setForm={setDraft} errors={errors} />

            <Button
              onClick={() => navigate("/register/clinic/details")}
              disabled={!canContinue}
              className="mt-8 bg-green-600 hover:bg-green-700 text-white w-full py-2 text-lg font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuar
            </Button>

            <p className="text-center text-sm text-slate-400 mt-4">
              Al continuar, aceptas nuestros términos y condiciones.
            </p>
          </div>
        </div>

        <div className="lg:col-span-5 sticky top-8">
          <div className="relative group">
            <div className="absolute -inset-1 dark:bg-slate-950 bg-gradient-to-r from-green-400 to-blue-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>

            <div className="relative bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-700 p-8 rounded-2xl shadow-sm">
              <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider text-green-700 uppercase bg-green-100 rounded-full">
                Vista Previa en Vivo
              </span>
              <ClinicPreviewCard form={{ name: draft.clinicName, specialists: draft.specialists, city: draft.city, software: draft.software }} />
              <p className="mt-6 text-center text-sm text-slate-500 italic">
                "Completa los datos para ver cómo lucirá tu perfil público"
              </p>
            </div>
          </div>
        </div>

      </div>
    </AuthLayout>
  );
};
