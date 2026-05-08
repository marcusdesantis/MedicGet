import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, ChevronLeft } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { ProfilePreviewCard } from "../components/ProfilePreviewCard";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { LocationPicker, type LocationValue } from "@/components/ui/LocationPicker";
import { useAuth } from "@/context/AuthContext";
import { useRegistrationDraft } from "../state";
import {
    isClean,
    validateEmail,
    validatePassword,
    validatePhone,
    validateRequired,
} from "../validation";

/**
 * Doctor flow — step 2 of 2 (final submit).
 *
 * Step 1 collects email/password/etc.; step 2 captures the consult location.
 * El médico debe seleccionar país + provincia + marcar el punto en el mapa
 * (obligatorio); ese dato alimenta el filtro "cerca de mí" del directorio
 * público y el detalle del perfil.
 *
 * Un conflicto del backend sobre `email` no puede editarse desde ESTA
 * página — necesitamos mandar al usuario al paso 1. La alerta inferior se
 * renderiza con un CTA "Volver al paso 1" cuando el campo fallido pertenece
 * al paso 1.
 */

/** Map server-side field name → user-friendly Spanish label. Used inside
 *  the "go back to step 1" alert message. */
const STEP_ONE_FIELD_LABELS: Record<string, string> = {
    email:     "el correo electrónico",
    password:  "la contraseña",
    phone:     "el teléfono",
    firstName: "el nombre",
    lastName:  "el apellido",
    specialty: "la especialidad",
};

export const RegisterAddressPage = () => {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [draft, setDraft] = useRegistrationDraft("doctor");
    const [submitting, setSubmitting]   = useState(false);
    const [submitError, setSubmitError] = useState<{ message: string; field?: string } | null>(null);
    const [showLocErrors, setShowLocErrors] = useState(false);

    // Mapeo entre el draft (que vive en sessionStorage como strings + nullables)
    // y el shape `LocationValue` que entiende el LocationPicker.
    const location: LocationValue = {
        country:   draft.country  || undefined,
        province:  draft.province || undefined,
        city:      draft.city     || undefined,
        address:   draft.address  || undefined,
        latitude:  draft.lat      ?? undefined,
        longitude: draft.lng      ?? undefined,
    };

    const handleLocationChange = (next: LocationValue) => {
        setDraft({
            country:  next.country  ?? "",
            province: next.province ?? "",
            city:     next.city     ?? "",
            address:  next.address  ?? "",
            lat:      next.latitude  ?? null,
            lng:      next.longitude ?? null,
        });
    };

    // Re-valida step 1 por si el usuario lo saltó.
    const stepOneErrors = useMemo(() => ({
        name:      validateRequired(draft.name,      "El nombre"),
        lastname:  validateRequired(draft.lastname,  "El apellido"),
        specialty: validateRequired(draft.specialty, "La especialidad"),
        phone:     validatePhone(draft.phone),
        email:     validateEmail(draft.email),
        password:  validatePassword(draft.password),
        terms:     draft.terms ? null : "Debes aceptar los términos y condiciones",
    }), [draft]);

    // Validación de step 2 — country/province/lat/lng son OBLIGATORIOS.
    const locationErrors = useMemo(() => ({
        country:  validateRequired(draft.country,  "El país"),
        province: validateRequired(draft.province, "La provincia"),
        marker:   draft.lat != null && draft.lng != null
            ? null
            : "Tocá el mapa para marcar la ubicación exacta",
    }), [draft.country, draft.province, draft.lat, draft.lng]);

    const stepOneValid = isClean(stepOneErrors);
    const locationValid = isClean(locationErrors);

    const handleSubmit = async () => {
        if (!stepOneValid) {
            navigate("/register/professional");
            return;
        }
        if (!locationValid) {
            setShowLocErrors(true);
            return;
        }
        setSubmitting(true);
        setSubmitError(null);

        const result = await register({
            role:      "DOCTOR",
            email:     draft.email.trim().toLowerCase(),
            password:  draft.password,
            firstName: draft.name.trim(),
            lastName:  draft.lastname.trim(),
            phone:     draft.phone || undefined,
            address:   draft.address || undefined,
            city:      draft.city || undefined,
            country:   draft.country || undefined,
            province:  draft.province || undefined,
            latitude:  draft.lat  ?? undefined,
            longitude: draft.lng  ?? undefined,
            specialty: draft.specialty || undefined,
        });

        setSubmitting(false);

        if (result.success) {
            // Send fresh doctors to the professional-profile setup wizard so
            // they finish license/price/bio before landing on the dashboard.
            // They can skip and go straight to /doctor from there.
            navigate("/doctor/setup", { replace: true });
        } else {
            setSubmitError({
                message: result.error ?? "No se pudo crear la cuenta",
                field:   result.field,
            });
        }
    };

    /** Server error attached to a field that lives on STEP 1 — the user
     *  can't edit it from this page, so we render an alert with a button
     *  that navigates back. */
    const stepOneFieldError = submitError?.field && STEP_ONE_FIELD_LABELS[submitError.field]
        ? submitError
        : null;

    /** Server error that doesn't map to any specific field — show as plain alert. */
    const generalError = submitError && !submitError.field
        ? submitError.message
        : null;

    const goBackToStepOne = () => {
        navigate("/register/professional", { state: { focusField: submitError?.field } });
    };

    const firstLocationError = locationErrors.country
        ?? locationErrors.province
        ?? locationErrors.marker;

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
                            Seleccioná país, provincia y marcá el punto exacto en el mapa para que tus pacientes te encuentren.
                        </p>
                    </div>

                    {!stepOneValid && (
                        <Alert variant="warning">
                            Faltan datos del paso anterior. <button
                                type="button"
                                className="underline font-medium"
                                onClick={() => navigate("/register/professional")}
                            >
                                Completa el paso 1
                            </button> para continuar.
                        </Alert>
                    )}

                    {/* SERVER ERROR THAT POINTS AT A STEP-1 FIELD */}
                    {stepOneFieldError && (
                        <Alert
                            variant="error"
                            action={
                                <Button
                                    onClick={goBackToStepOne}
                                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-sm rounded-lg whitespace-nowrap"
                                >
                                    Editar paso 1
                                </Button>
                            }
                        >
                            <p className="font-semibold">{stepOneFieldError.message}</p>
                            <p className="text-xs mt-1 opacity-80">
                                Necesitas modificar {STEP_ONE_FIELD_LABELS[stepOneFieldError.field!]} en el paso anterior.
                            </p>
                        </Alert>
                    )}

                    {/* GENERIC SERVER ERROR */}
                    {generalError && (
                        <Alert variant="error">{generalError}</Alert>
                    )}

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-6 space-y-5">
                            <Alert>
                                Tocá el mapa para marcar la ubicación exacta de tu consulta — los pacientes la usan para llegar.
                            </Alert>

                            <FormField label="Nombre de tu consulta">
                                <Input
                                    placeholder="Ej: Clínica Dental Central"
                                    value={draft.consultName}
                                    onChange={(e) => setDraft({ consultName: e.target.value })}
                                />
                            </FormField>

                            <LocationPicker
                                value={location}
                                onChange={handleLocationChange}
                                required
                            />

                            <FormField label="Código postal">
                                <Input
                                    value={draft.zip}
                                    onChange={(e) => setDraft({ zip: e.target.value })}
                                />
                            </FormField>

                            {showLocErrors && firstLocationError && (
                                <Alert variant="error">{firstLocationError}</Alert>
                            )}
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 flex flex-col sm:flex-row items-center gap-4">
                            <Button
                                onClick={handleSubmit}
                                disabled={submitting || !stepOneValid}
                                className="bg-[#1A82FE] hover:bg-[#156cd4] text-white px-8 py-2 rounded-xl text-lg font-bold w-full sm:w-auto shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? "Creando cuenta..." : "Finalizar registro"}
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
                                <ProfilePreviewCard form={draft} />
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
