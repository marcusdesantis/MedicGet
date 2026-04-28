import { MapPin, Building2 } from "lucide-react";

export const ClinicPreviewCard = ({ form }: any) => {
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm">

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
          <Building2 size={20} />
        </div>

        <div>
          <p className="font-semibold dark:text-slate-200">
            {form.name || "Nombre del centro"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm dark:text-slate-300 text-slate-500">
        <MapPin size={14} />
        {form.city || "Ciudad"}
      </div>

    </div>
  );
};