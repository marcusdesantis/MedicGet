import { useState } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { AddressForm } from "../components/AddressForm";
import { ProfilePreviewCard } from "../components/ProfilePreviewCard";
import { Button } from "@/components/ui/Button";
import { MapPin, ChevronLeft } from "lucide-react"; // Iconos para dar contexto
import { useNavigate } from "react-router-dom";

export const RegisterAddressPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    zip: "",
    lat: null,
    lng: null,
  });

  return (
    <AuthLayout>
      <div className="grid lg:grid-cols-12 gap-12 items-start max-w-7xl w-full px-4 py-8">

        <div className="lg:col-span-7 space-y-8">
          
          <div>
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center text-sm text-slate-500 hover:text-[#1A82FE] mb-4 transition-colors"
            >
              <ChevronLeft size={16} />
              Volver al paso anterior
            </button>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPin className="text-[#1A82FE]" size={24} />
              </div>
              <span className="text-[#1A82FE] font-bold text-sm uppercase tracking-widest">
                Paso Final
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
              ¿Dónde está tu consulta?
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Ayuda a tus pacientes a encontrarte fácilmente en el mapa.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6">
              <AddressForm form={form} setForm={setForm} />
            </div>

            {/* ACCIONES */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 flex flex-col sm:flex-row items-center gap-4">
              <Button 
                className="bg-[#1A82FE] hover:bg-[#156cd4] text-white px-8 py-2 rounded-xl text-lg font-bold w-full sm:w-auto shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-[0.98]"
              >
                Finalizar registro
              </Button>

              <Button 
                onClick={() => navigate("/dashboard")}
                className="text-slate-400 hover:text-slate-600 font-medium text-sm transition-colors py-2 px-4"
              >
                Omitir por ahora
              </Button>
            </div>
          </div>
        </div>


        <div className="lg:col-span-5 lg:sticky lg:top-10">
          <div className="relative">
            <div className="bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 rounded-3xl">
              <h3 className="text-center text-slate-400 text-sm font-medium mb-6 uppercase tracking-wider">
                Vista previa de ubicación
              </h3>
              
              <div className="transform transition-all duration-500">
                <ProfilePreviewCard form={form} />
              </div>

              <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed text-center italic">
                  "Los perfiles con dirección exacta reciben hasta un 40% más de reservas directas."
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </AuthLayout>
  );
};