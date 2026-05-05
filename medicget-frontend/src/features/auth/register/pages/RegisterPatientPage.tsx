import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { AuthCard } from "@/components/ui/AuthCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Alert } from "@/components/ui/Alert";
import { Checkbox } from "@/components/ui/Checkbox";
import { SocialButton } from "../components/SocialButton";
import { Divider } from "../components/Divider";
import { useAuth } from "@/context/AuthContext";
import { useRegistrationDraft } from "../state";
import {
    isClean,
    validateEmail,
    validateEmailMatch,
    validatePassword,
    validateRequired,
} from "../validation";

/** Field names rendered on this page — drives whether a server validation
 *  error can be shown inline or has to be a top-level alert. */
const PAGE_FIELDS = new Set([
    "firstName", "lastName", "email", "confirmEmail", "password",
]);

export const RegisterPatientPage = () => {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [draft, setDraft] = useRegistrationDraft("patient");
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting]     = useState(false);
    const [submitError, setSubmitError]   = useState<{ message: string; field?: string } | null>(null);

    const clientErrors = useMemo(() => ({
        firstName:    validateRequired(draft.firstName, "El nombre"),
        lastName:     validateRequired(draft.lastName,  "El apellido"),
        email:        validateEmail(draft.email),
        confirmEmail: validateEmailMatch(draft.email, draft.confirmEmail),
        password:     validatePassword(draft.password),
    }), [draft]);

    const errors = useMemo(() => {
        const merged = { ...clientErrors } as Record<string, string | null>;
        if (submitError?.field && PAGE_FIELDS.has(submitError.field)) {
            merged[submitError.field] = submitError.message;
        }
        return merged;
    }, [clientErrors, submitError]);

    const canSubmit = isClean(clientErrors) && !submitting;
    const emailsMatch = !!draft.email && draft.email === draft.confirmEmail;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        setSubmitError(null);

        const result = await register({
            role:      "PATIENT",
            email:     draft.email.trim().toLowerCase(),
            password:  draft.password,
            firstName: draft.firstName.trim(),
            lastName:  draft.lastName.trim(),
        });

        setSubmitting(false);

        if (result.success) {
            navigate("/patient", { replace: true });
        } else {
            setSubmitError({
                message: result.error ?? "No se pudo crear la cuenta",
                field:   result.field,
            });
        }
    };

    const generalError = submitError && (!submitError.field || !PAGE_FIELDS.has(submitError.field))
        ? submitError.message
        : null;

    return (
        <AuthLayout>
            <AuthCard className="shadow-2xl border-slate-100/50">
                {/* HEADER */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-green-50 rounded-full mb-4">
                        <ShieldCheck className="text-green-600" size={28} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                        Crea tu perfil de salud
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Únete a MedicGet y gestiona tus citas fácilmente.
                    </p>
                </div>

                <SocialButton
                    icon={<img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5" alt="Google" />}
                    text="Continuar con Google"
                />

                <Divider />

                {generalError && (
                    <div className="mb-4">
                        <Alert variant="error">{generalError}</Alert>
                    </div>
                )}

                {/* FORM */}
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Nombre">
                            <Input
                                placeholder="María"
                                value={draft.firstName}
                                onChange={(e) => {
                                    setDraft({ firstName: e.target.value });
                                    if (submitError?.field === "firstName") setSubmitError(null);
                                }}
                                className="rounded-xl border-slate-200 focus:ring-green-500"
                                aria-invalid={!!errors.firstName}
                            />
                            {errors.firstName && (draft.firstName !== "" || submitError?.field === "firstName") && (
                                <p className="text-xs text-rose-600 mt-1">{errors.firstName}</p>
                            )}
                        </FormField>

                        <FormField label="Apellidos">
                            <Input
                                placeholder="González"
                                value={draft.lastName}
                                onChange={(e) => {
                                    setDraft({ lastName: e.target.value });
                                    if (submitError?.field === "lastName") setSubmitError(null);
                                }}
                                className="rounded-xl border-slate-200 focus:ring-green-500"
                                aria-invalid={!!errors.lastName}
                            />
                            {errors.lastName && (draft.lastName !== "" || submitError?.field === "lastName") && (
                                <p className="text-xs text-rose-600 mt-1">{errors.lastName}</p>
                            )}
                        </FormField>
                    </div>

                    <FormField label="Correo electrónico">
                        <Input
                            type="email"
                            placeholder="ejemplo@correo.com"
                            value={draft.email}
                            onChange={(e) => {
                                setDraft({ email: e.target.value });
                                if (submitError?.field === "email") setSubmitError(null);
                            }}
                            className="rounded-xl border-slate-200 focus:ring-green-500"
                            aria-invalid={!!errors.email}
                        />
                        {errors.email && (draft.email !== "" || submitError?.field === "email") && (
                            <p className="text-xs text-rose-600 mt-1">{errors.email}</p>
                        )}
                    </FormField>

                    <FormField label="Confirmar correo">
                        <div className="relative">
                            <Input
                                type="email"
                                placeholder="Repite tu correo"
                                value={draft.confirmEmail}
                                onChange={(e) => setDraft({ confirmEmail: e.target.value })}
                                className={`rounded-xl border-slate-200 focus:ring-green-500 pr-10 ${emailsMatch ? "border-green-500" : ""}`}
                                aria-invalid={!!errors.confirmEmail}
                            />
                            {emailsMatch && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                                    <ShieldCheck size={16} />
                                </span>
                            )}
                        </div>
                        {errors.confirmEmail && draft.confirmEmail !== "" && (
                            <p className="text-xs text-rose-600 mt-1">{errors.confirmEmail}</p>
                        )}
                    </FormField>

                    <FormField label="Contraseña">
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Mínimo 6 caracteres"
                                value={draft.password}
                                onChange={(e) => setDraft({ password: e.target.value })}
                                className="pr-10 rounded-xl border-slate-200"
                                aria-invalid={!!errors.password}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {errors.password && draft.password !== "" && (
                            <p className="text-xs text-rose-600 mt-1">{errors.password}</p>
                        )}
                    </FormField>

                    <Checkbox
                        checked={draft.marketing}
                        onChange={(value: boolean) => setDraft({ marketing: value })}
                    >
                        Quiero recibir consejos de salud y ofertas exclusivas.
                    </Checkbox>
                </div>

                <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="w-full mt-8 bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? "Creando cuenta..." : "Crear mi cuenta"}
                </Button>

                {/* FOOTER */}
                <div className="mt-8 pt-2 border-t border-slate-100 text-center space-y-4">
                    <p className="text-xs text-slate-400 px-4">
                        Al registrarte, confirmas que aceptas nuestros{" "}
                        <button
                            type="button"
                            onClick={() => navigate("/terms")}
                            className="text-slate-600 underline font-medium"
                        >
                            Términos de Servicio
                        </button>
                        {" "}y{" "}
                        <button
                            type="button"
                            onClick={() => navigate("/privacy")}
                            className="text-slate-600 underline font-medium"
                        >
                            Política de Privacidad
                        </button>.
                    </p>

                    <p className="text-sm text-slate-600">
                        ¿Ya tienes cuenta?{" "}
                        <button
                            type="button"
                            onClick={() => navigate("/login")}
                            className="text-green-600 font-bold hover:underline">
                            Inicia sesión aquí
                        </button>
                    </p>
                </div>
            </AuthCard>
        </AuthLayout>
    );
};
