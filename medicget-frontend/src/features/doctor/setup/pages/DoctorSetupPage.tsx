import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Stethoscope, ArrowRight, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { AuthCard } from "@/components/ui/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { Alert } from "@/components/ui/Alert";
import { specialties } from "@/features/auth/register/data/specialties";
import { useAuth } from "@/context/AuthContext";
import { doctorsApi } from "@/lib/api";

/**
 * DoctorSetupPage — first-time professional profile completion.
 *
 * Triggered automatically right after a doctor finishes registration. Also
 * reachable from the dashboard error state ("Completa tu perfil profesional")
 * when an existing doctor hits a 404 from the dashboard endpoint because
 * their Doctor row was not created at registration time (legacy users).
 *
 * Backend assumption (post-migration 20260506000000):
 *   • All doctor users that register through the new flow already have a
 *     Doctor row with default specialty = "Médico General" and clinicId = null.
 *   • This page calls PATCH /api/v1/doctors/{id} to enrich that row with
 *     specialty, license, experience, price and bio.
 *
 * Field policy:
 *   • Specialty + price are required to make the profile usable in patient
 *     search results. License/experience/bio are recommended but optional.
 *   • The form pre-fills from the user DTO (carries doctor.id + doctor.specialty)
 *     so users editing later see their current values.
 */
export function DoctorSetupPage() {
    const navigate = useNavigate();
    const { user, loading } = useAuth();

    // Doctor id sourced from the authenticated user DTO. Setup is only
    // meaningful for DOCTOR users; anyone else gets bounced.
    const doctorId = user?.dto.doctor?.id ?? null;

    const [form, setForm] = useState({
        specialty:       user?.dto.doctor?.specialty ?? "",
        licenseNumber:   "",
        experience:      "",     // string in form; converted to number on submit
        pricePerConsult: "",
        bio:             "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Bounce non-doctor users away once auth has finished loading.
    useEffect(() => {
        if (loading) return;
        if (!user) {
            navigate("/login", { replace: true });
        } else if (user.role !== "doctor") {
            // Non-doctor user shouldn't be on this page
            navigate(`/${user.role}`, { replace: true });
        }
    }, [user, loading, navigate]);

    const errors = useMemo(() => ({
        specialty:       form.specialty.trim().length === 0
            ? "La especialidad es obligatoria"
            : null,
        pricePerConsult: form.pricePerConsult === "" || Number(form.pricePerConsult) < 0
            ? "El precio es obligatorio (puede ser 0 si haces consultas gratuitas)"
            : null,
        experience:      form.experience !== "" && Number(form.experience) < 0
            ? "Los años de experiencia no pueden ser negativos"
            : null,
    }), [form]);

    const canSubmit = !errors.specialty && !errors.pricePerConsult && !errors.experience && !submitting;

    const handleSubmit = async (skipping = false) => {
        if (!doctorId) {
            setSubmitError("No encontramos tu perfil de médico. Vuelve a iniciar sesión.");
            return;
        }
        if (!skipping && !canSubmit) return;

        setSubmitting(true);
        setSubmitError(null);

        try {
            await doctorsApi.update(doctorId, {
                specialty:       form.specialty.trim() || "Médico General",
                licenseNumber:   form.licenseNumber.trim() || undefined,
                experience:      form.experience       === "" ? 0 : Number(form.experience),
                pricePerConsult: form.pricePerConsult   === "" ? 0 : Number(form.pricePerConsult),
                bio:             form.bio.trim() || undefined,
            });
            navigate("/doctor", { replace: true });
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { error?: { message?: string } } } })
                    ?.response?.data?.error?.message ?? "No se pudo guardar tu perfil";
            setSubmitError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || !user) {
        return (
            <AuthLayout>
                <div className="flex items-center gap-2 text-slate-500">
                    <Loader2 className="animate-spin" size={18} />
                    Cargando…
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout>
            <AuthCard className="max-w-2xl">
                {/* HEADER */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-teal-50 dark:bg-teal-900/30 rounded-full mb-4">
                        <Stethoscope className="text-teal-600 dark:text-teal-400" size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                        Completa tu perfil profesional
                    </h1>
                    <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                        Estos datos aparecen cuando los pacientes buscan especialistas.
                        Puedes editarlos cuando quieras desde tu panel.
                    </p>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700 mb-6" />

                {submitError && (
                    <div className="mb-4">
                        <Alert variant="error">{submitError}</Alert>
                    </div>
                )}

                <div className="space-y-4">
                    <FormField label="Especialidad *">
                        <AutocompleteSelect
                            options={specialties}
                            value={form.specialty}
                            onChange={(v) => setForm({ ...form, specialty: v })}
                        />
                        {errors.specialty && form.specialty !== "" && (
                            <p className="text-xs text-rose-600 mt-1">{errors.specialty}</p>
                        )}
                    </FormField>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Número de licencia / colegiatura">
                            <Input
                                placeholder="Ej. CMP-12345"
                                value={form.licenseNumber}
                                onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                            />
                        </FormField>

                        <FormField label="Años de experiencia">
                            <Input
                                type="number"
                                min="0"
                                placeholder="Ej. 5"
                                value={form.experience}
                                onChange={(e) => setForm({ ...form, experience: e.target.value })}
                            />
                            {errors.experience && (
                                <p className="text-xs text-rose-600 mt-1">{errors.experience}</p>
                            )}
                        </FormField>
                    </div>

                    <FormField label="Precio por consulta (USD) *">
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Ej. 25.00"
                            value={form.pricePerConsult}
                            onChange={(e) => setForm({ ...form, pricePerConsult: e.target.value })}
                            aria-invalid={!!errors.pricePerConsult}
                        />
                        {errors.pricePerConsult && (
                            <p className="text-xs text-rose-600 mt-1">{errors.pricePerConsult}</p>
                        )}
                    </FormField>

                    <FormField label="Descripción profesional / bio">
                        <textarea
                            value={form.bio}
                            onChange={(e) => setForm({ ...form, bio: e.target.value })}
                            placeholder="Cuéntales a tus pacientes sobre tu experiencia, enfoque clínico y formación..."
                            rows={4}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                        />
                    </FormField>
                </div>

                <Alert variant="info">
                    <span className="text-sm">
                        Los pacientes <strong>no podrán reservar contigo</strong> hasta que
                        completes este perfil y configures tus horarios desde el panel.
                    </span>
                </Alert>

                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <Button
                        onClick={() => handleSubmit(false)}
                        disabled={!canSubmit}
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? "Guardando..." : <>Guardar y continuar <ArrowRight size={16} /></>}
                    </Button>

                    <Button
                        onClick={() => navigate("/doctor", { replace: true })}
                        disabled={submitting}
                        className="px-6 py-3 rounded-xl text-slate-500 hover:text-slate-700 font-medium text-sm transition disabled:opacity-50"
                    >
                        Saltar por ahora
                    </Button>
                </div>

                <p className="text-xs text-center mt-4 text-slate-400">
                    * Campos obligatorios
                </p>
            </AuthCard>
        </AuthLayout>
    );
}
