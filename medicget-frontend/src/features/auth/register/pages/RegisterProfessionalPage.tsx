import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Alert } from "@/components/ui/Alert";
import { ProfessionalForm } from "../components/ProfessionalForm";
import { ProfessionalPreviewCard } from "../components/ProfessionalPreviewCard";
import { Button } from "@/components/ui/Button";
import { useRegistrationDraft } from "../state";
import {
    isClean,
    validateEmail,
    validatePassword,
    validatePhone,
    validateRequired,
} from "../validation";

/**
 * Doctor flow — step 1 of 2.
 *
 * If we got here via "Editar paso 1" from the address page (after a server
 * conflict like duplicate email), `location.state.focusField` carries the
 * field name to highlight. We surface a one-shot alert at the top so the
 * user immediately understands why they're back here.
 */
export const RegisterProfessionalPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [draft, setDraft] = useRegistrationDraft("doctor");

    /** One-shot alert sourced from the route state when we were sent here
     *  to fix a conflicting field. Cleared the moment the user changes the
     *  flagged field's value so the alert doesn't linger. */
    const [bounceBackField, setBounceBackField] = useState<string | null>(
        (location.state as { focusField?: string } | null)?.focusField ?? null,
    );

    // Drop the focus hint from history once consumed so refresh / back-nav
    // don't re-show the alert.
    useEffect(() => {
        if (bounceBackField) {
            navigate(location.pathname, { replace: true, state: null });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const errors = useMemo(() => {
        const e: Record<string, string | null> = {
            name:      validateRequired(draft.name,      "El nombre"),
            lastname:  validateRequired(draft.lastname,  "El apellido"),
            specialty: validateRequired(draft.specialty, "La especialidad"),
            phone:     validatePhone(draft.phone),
            email:     validateEmail(draft.email),
            password:  validatePassword(draft.password),
            terms:     draft.terms ? null : "Debes aceptar los términos y condiciones",
        };
        // Inject the bounced-back error into the matching field so it shows
        // inline with the existing client validation logic.
        if (bounceBackField === "email") e.email = "Este correo ya está registrado. Usa otro o inicia sesión.";
        return e;
    }, [draft, bounceBackField]);

    const canContinue = isClean(errors);

    const handleNext = () => {
        if (!canContinue) return;
        navigate("/register/address");
    };

    return (
        <AuthLayout>
            <div className="grid lg:grid-cols-12 gap-12 items-start w-full max-w-7xl px-4 py-10">

                {/* LEFT — form */}
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

                    {bounceBackField && (
                        <Alert variant="error">
                            Necesitas corregir un dato antes de continuar.
                            {bounceBackField === "email" && (
                                <> El correo ingresado ya está registrado — elige otro o <button
                                    type="button"
                                    className="underline font-medium"
                                    onClick={() => navigate("/login")}
                                >inicia sesión</button>.</>
                            )}
                        </Alert>
                    )}

                    <div className="bg-white dark:bg-slate-950 rounded-2xl">
                        <ProfessionalForm
                            form={draft}
                            setForm={(patch) => {
                                setDraft(patch);
                                // The user is editing — clear the bounce-back highlight
                                // when they touch the offending field.
                                if (bounceBackField && Object.prototype.hasOwnProperty.call(patch, bounceBackField)) {
                                    setBounceBackField(null);
                                }
                            }}
                            errors={errors}
                        />

                        <div className="border-t border-slate-50 dark:border-slate-800 mt-4">
                            <Button
                                onClick={handleNext}
                                disabled={!canContinue}
                                className="bg-[#1A82FE] hover:bg-[#156cd4] text-white w-full md:w-auto px-10 py-2 text-lg font-bold rounded-xl transition-all shadow-lg shadow-blue-100 dark:shadow-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Continuar
                            </Button>
                            <p className="text-slate-400 text-xs mt-4">
                                Podrás editar estos datos más adelante desde tu panel de configuración.
                            </p>
                        </div>
                    </div>
                </div>

                {/* RIGHT — preview */}
                <div className="lg:col-span-5 lg:sticky lg:top-10">
                    <div className="relative">
                        <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-50 dark:bg-slate-950 rounded-full blur-2xl"></div>

                        <div className="relative bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl overflow-hidden">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-slate-700 dark:text-slate-200">Tu tarjeta de visita</h3>
                                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                            </div>

                            <div className="transform transition-all duration-500 hover:scale-[1.02]">
                                <ProfessionalPreviewCard form={draft} />
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
