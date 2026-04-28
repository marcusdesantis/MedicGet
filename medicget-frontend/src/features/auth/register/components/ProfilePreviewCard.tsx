import { MapPin, User } from "lucide-react";
import { MapPreview } from "./MapPreview";

export const ProfilePreviewCard = ({ form }: any) => {
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-sm w-full">

      {/* USER */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
          <User size={18} />
        </div>
        <div>
          <p className="font-semibold dark:text-slate-50">Juan Montalvo</p>
          <p className="text-sm text-slate-500">Especialista</p>
        </div>
      </div>

      {/* ADDRESS */}
      <div className="border-t pt-3 text-sm dark:text-slate-300 text-slate-600">
        <div className="flex items-start gap-2 mb-2">
          <MapPin size={16} />
          <div>
            <p className="font-medium">
              {form.name || "Nombre de tu consulta"}
            </p>
            <p>
              {form.address || "Dirección de tu consulta"}
            </p>
            <p>
              {form.city || "Ciudad"} {form.zip || ""}
            </p>
          </div>
        </div>

        {/* MAP REAL */}
        <div className="mt-3">
          <MapPreview lat={form.lat} lng={form.lng} />
        </div>

        <button className="mt-4 w-full bg-blue-100 text-blue-600 py-2 rounded-lg text-sm">
          Reservar cita
        </button>
      </div>
    </div>
  );
};