import { Star, MapPin, User } from "lucide-react";

export const ProfessionalPreviewCard = ({ form }: any) => {
    const fullName = `${form.name || "Nombre"} ${form.lastname || "Apellido"}`;

    return (
        <div className="bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm w-full">

            {/* AVATAR */}
            <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center mb-3">
                    <User size={30} />
                </div>

                <h3 className="font-semibold text-lg text-slate-800 dark:text-white">
                    {fullName}
                </h3>

                <p className="text-sm text-slate-500">
                    {form.specialty || "Especialidad"}
                </p>
            </div>

            {/* RATING */}
            <div className="flex justify-center gap-1 my-3 text-yellow-400">
                {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" />
                ))}
            </div>

            {/* LOCATION */}
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <MapPin size={14} />
                {form.location || form.address || "Ubicación"}
            </div>

            {/* AVAILABILITY */}
            <div className="mt-5">
                <p className="text-sm text-slate-500 mb-2 text-center">
                    Disponible hoy
                </p>

                <div className="flex justify-center gap-2">
                    {["09:00", "11:30", "16:00"].map((t) => (
                        <span key={t} className="px-3 py-1 text-xs bg-slate-100 rounded-md">
                            {t}
                        </span>
                    ))}
                </div>
            </div>

            {/* BUTTON */}
            <button className="mt-5 w-full bg-blue-100 text-blue-600 py-2 rounded-lg text-sm">
                Ver perfil completo
            </button>

        </div>
    );
};