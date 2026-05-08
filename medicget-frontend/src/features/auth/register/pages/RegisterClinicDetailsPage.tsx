import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { ClinicDetailsForm } from "../components/ClinicDetailsForm";
import { Button } from "@/components/ui/Button";
import { AuthCard } from "@/components/ui/AuthCard";
import { Alert } from "@/components/ui/Alert";
import { LocationPicker, type LocationValue } from "@/components/ui/LocationPicker";
import { useAuth } from "@/context/AuthContext";
import { useRegistrationDraft } from "../state";
import {
    isClean,
    validateEmail,
    validateEmailMatch,
    validatePassword,
    validatePasswordMatch,
    validatePhone,
    validateRequired,
} from "../validation";

/** Fields rendered in step 2 — used to decide between inline error vs alert. */
const PAGE_FIELDS = new Set([
    "name", "lastname", "role", "email", "confirmEmail", "phone",
    "password", "confirmPassword",
]);

/**
 * Clinic flow — step 2 of 2 (final submit).
 *
 * Combina la información de la clínica del paso 1 con los datos del
 * representante (paso 2) y la ubicación física (LocationPicker, OBLIGATORIA)
 * en un único `register` payload.
 *
 * El email de contacto vive en este formulario, así que un conflicto de
 * duplicado se renderiza inline al lado del input.
 */
export const RegisterClinicDetailsPage = () => {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [draft, setDraft] = useRegistrationDraft("clinic");
    const [submitting, setSubmitting]   = useState(false);
    const [submitError, setSubmitError] = useState<{ message: string; field?: string } | null>(null);
    const [showLocErrors, setShowLocErrors] = useState(false);

    // Mapeo entre el draft (sessionStorage) y el shape que entiende LocationPicker.
    const location: LocationValue = {
        country:   draft.country      || undefined,
        province:  draft.province     || undefined,
        city:      draft.cityLocation || undefined,
        address:   draft.address      || undefined,
        latitude:  draft.lat          ?? undefined,
        longitude: draft.lng          ?? undefined,
    };

    const handleLocationChange = (next: LocationValue) => {
        setDraft({
            country:      next.country  ?? "",
            province:     next.province ?? "",
            cityLocation: next.city     ?? "",
            address:      next.address  ?? "",
            lat:          next.latitude  ?? null,
            lng:          next.longitude ?? null,
        });
    };

    // Step 2 client-side errors (datos personales).
    const clientErrors = useMemo(() => ({
        name:                 validateRequired(draft.name,     "El nombre"),
        lastname:             validateRequired(draft.lastname, "El apellido"),
        role:                 validateRequired(draft.role,     "El cargo"),
        email:                validateEmail(draft.email),
        confirmEmail:         validateEmailMatch(draft.email, draft.confirmEmail),
        phone:                validatePhone(draft.phone),
        password:             validatePassword(draft.password),
        confirmPassword:      validatePasswordMatch(draft.password, draft.confirmPassword),
        acceptTerms:          draft.acceptTerms          ? null : "Debes aceptar los términos",
        confirmAuthorization: draft.confirmAuthorization ? null : "Debes confirmar la autorización",
    }), [draft]);

    // Validación de la ubicación — para clínicas TODO es obligatorio.
    const locationErrors = useMemo(() => ({
        country:  validateRequired(draft.country,  "El país"),
        province: validateRequired(draft.province, "La provincia"),
        marker:   draft.lat != null && draft.lng != null
            ? null
            : "Tocá el mapa para marcar la ubicación exacta",
    }), [draft.country, draft.province, draft.lat, draft.lng]);

    /** Server errors override client validation for the same field so the
     *  user sees the most actionable message (e.g. duplicate-email beats
     *  "introduce un correo válido"). */
    const errors = useMemo(() => {
        const merged = { ...clientErrors } as Record<string, string | null>;
        if (submitError?.field && PAGE_FIELDS.has(submitError.field)) {
            merged[submitError.field] = submitError.message;
        }
        return merged;
    }, [clientErrors, submitError]);

    // Step 1 must also be complete.
    const stepOneValid =
        draft.clinicName.trim().length > 0 &&
        draft.specialists.trim().length > 0 &&
        draft.city.trim().length        > 0;

    const personalValid = isClean(clientErrors);
    const locationValid = isClean(locationErrors);
    const canSubmit = personalValid && stepOneValid && !submitting;

    const firstLocationError = locationErrors.country
        ?? locationErrors.province
        ?? locationErrors.marker;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        if (!locationValid) {
            setShowLocErrors(true);
            return;
        }
        setSubmitting(true);
        setSubmitError(null);

        const result = await register({
            role:        "CLINIC",
            email:       draft.email.trim().toLowerCase(),
            password:    draft.password,
            firstName:   draft.name.trim(),
            lastName:    draft.lastname.trim(),
            phone:       draft.phone || undefined,
            clinicName:  draft.clinicName.trim(),
            // Ubicación física de la clínica (obligatoria)
            address:     draft.address      || undefined,
            city:        draft.cityLocation || draft.city.trim() || undefined,
            country:     draft.country      || undefined,
            province:    draft.province     || undefined,
            latitude:    draft.lat ?? undefined,
            longitude:   draft.lng ?? undefined,
        });

        setSubmitting(false);

        if (result.success) {
            navigate("/clinic", { replace: true });
        } else {
            setSubmitError({
                message: result.error ?? "No se pudo crear la cuenta",
                field:   result.field,
            });
        }
    };

    /** Server error that doesn't map to a field on this page (or has no
     *  field at all) — show as a plain alert. */
    const generalError = submitError && (!submitError.field || !PAGE_FIELDS.has(submitError.field))
        ? submitError.message
        : null;

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

                <div className="border-t border-slate-200 dark:border-slate-700 mb-6" />

                {!stepOneValid && (
                    <div className="mb-6">
                        <Alert variant="warning">
                            Faltan datos del paso anterior. <button
                                type="button"
                                className="underline font-medium"
                                onClick={() => navigate("/register/clinic")}
                            >
                                Completa el paso 1
                            </button> antes de continuar.
                        </Alert>
                    </div>
                )}

                {generalError && (
                    <div className="mb-6">
                        <Alert variant="error">{generalError}</Alert>
                    </div>
                )}

                {/* FORM — datos del representante */}
                <ClinicDetailsForm
                    form={draft}
                    setForm={(patch) => {
                        setDraft(patch);
                        // Clear the server error if the user is editing the offending field.
                        if (submitError?.field && Object.prototype.hasOwnProperty.call(patch, submitError.field)) {
                            setSubmitError(null);
                        }
                    }}
                    errors={errors}
                />

                {/* UBICACIÓN — obligatoria para clínicas */}
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <h2 className="text-base font-semibold text-slate-800 dark:text-white mb-1">
                        Ubicación de la clínica *
                    </h2>
                    <p className="text-xs text-slate-500 mb-4">
                        Seleccioná país, provincia y marcá el punto exacto en el mapa — los pacientes la usan para llegar y aparece en los filtros del directorio.
                    </p>
                    <LocationPicker
                        value={location}
                        onChange={handleLocationChange}
                        required
                    />
                    {showLocErrors && firstLocationError && (
                        <div className="mt-3">
                            <Alert variant="error">{firstLocationError}</Alert>
                        </div>
                    )}
                </div>

                {/* LEGAL INFO */}
                <div className="mt-8 text-xs text-slate-500 space-y-2">
                    <p className="font-medium text-slate-600 dark:text-slate-300">
                        INFORMACIÓN BÁSICA SOBRE PROTECCIÓN DE DATOS
                    </p>
                    <p>Responsable: MEDICGET, S.L.</p>
                    <p>Finalidad: Gestión de los servicios solicitados.</p>
                    <p className="text-blue-500 cursor-pointer">Ver política completa</p>
                </div>

                {/* SUBMIT */}
                <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="mt-8 w-full py-3 rounded-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? "Creando cuenta..." : "Crear cuenta"}
                </Button>

                <p className="text-xs text-center mt-3 text-slate-400">
                    * Campo obligatorio
                </p>
            </AuthCard>
        </AuthLayout>
    );
};
