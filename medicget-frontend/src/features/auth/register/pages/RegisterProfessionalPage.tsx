import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { ProfessionalForm } from "../components/ProfessionalForm";
import { ProfessionalPreviewCard } from "../components/ProfessionalPreviewCard";
import { Button } from "@/components/ui/Button";

export const RegisterProfessionalPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    lastname: "",
    specialty: "",
    location: "",
    phone: "",
    email: "",
    password: "",
  });

  const handleNext = () => navigate("/register/address");

  return (
    <AuthLayout>
      <div className="grid lg:grid-cols-12 gap-12 items-start w-full max-w-7xl px-4 py-10">
        
        {/* COLUMNA IZQUIERDA: Formulario (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          <header>
            <span className="text-[#1A82FE] font-semibold text-sm uppercase tracking-wider">
              Paso 1: Información Básica
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mt-2">
              Crea tu perfil profesional
            </h1>
            <p className="text-slate-500 mt-4 text-lg max-w-md">
              Únete a la comunidad líder donde <span className="font-semibold text-slate-700">+4 millones de pacientes</span> buscan especialistas cada mes.
            </p>
          </header>

          <div className="bg-white dark:bg-slate-900 rounded-2xl">
            <ProfessionalForm form={form} setForm={setForm} />
            
            <div className="border-t border-slate-50 dark:border-slate-800 mt-4">
              <Button
                onClick={handleNext}
                className="bg-[#1A82FE] hover:bg-[#156cd4] text-white w-full md:w-auto px-10 py-2 text-lg font-bold rounded-xl transition-all shadow-lg shadow-blue-100 dark:shadow-none active:scale-[0.98]"
              >
                Continuar
              </Button>
              <p className="text-slate-400 text-xs mt-4">
                Podrás editar estos datos más adelante desde tu panel de configuración.
              </p>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Preview (5 cols) */}
        <div className="lg:col-span-5 lg:sticky lg:top-10">
          <div className="relative">
            {/* Elemento decorativo detrás de la tarjeta */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-full blur-2xl"></div>
            
            <div className="relative bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-700 dark:text-slate-200">Tu tarjeta de visita</h3>
                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              </div>
              
              <div className="transform transition-all duration-500 hover:scale-[1.02]">
                <ProfessionalPreviewCard form={form} />
              </div>

              <div className="mt-8 space-y-3">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest text-center">
                  Beneficios de tu suscripción
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1">✅ Visibilidad 24/7</div>
                  <div className="flex items-center gap-1">✅ Reserva Online</div>
                  <div className="flex items-center gap-1">✅ Perfil Verificado</div>
                  <div className="flex items-center gap-1">✅ Telemedicina</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </AuthLayout>
  );
};