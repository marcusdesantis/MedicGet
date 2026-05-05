import { Checkbox } from "@/components/ui/Checkbox";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import type { ClinicDraft } from "../state";
import type { FieldErrors } from "../validation";

interface Props {
    form: ClinicDraft;
    setForm: (patch: Partial<ClinicDraft>) => void;
    errors: FieldErrors;
}

/**
 * Clinic flow — step 2 form. Collects the contact person's details that
 * become the User + Profile in the backend, plus the clinic-admin
 * authorization checkboxes.
 */
export const ClinicDetailsForm = ({ form, setForm, errors }: Props) => {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm,  setShowConfirm]  = useState(false);

    const passwordsMatch =
        form.password && form.confirmPassword && form.password === form.confirmPassword;

    return (
        <div className="space-y-4">

            <div className="grid grid-cols-2 gap-4">
                <FormField label="Nombre *">
                    <Input
                        value={form.name}
                        onChange={(e) => setForm({ name: e.target.value })}
                        aria-invalid={!!errors.name}
                    />
                    {errors.name && form.name !== "" && (
                        <p className="text-xs text-rose-600 mt-1">{errors.name}</p>
                    )}
                </FormField>

                <FormField label="Apellidos *">
                    <Input
                        value={form.lastname}
                        onChange={(e) => setForm({ lastname: e.target.value })}
                        aria-invalid={!!errors.lastname}
                    />
                    {errors.lastname && form.lastname !== "" && (
                        <p className="text-xs text-rose-600 mt-1">{errors.lastname}</p>
                    )}
                </FormField>
            </div>

            <FormField label="Cargo *">
                <Input
                    value={form.role}
                    onChange={(e) => setForm({ role: e.target.value })}
                    aria-invalid={!!errors.role}
                />
                {errors.role && form.role !== "" && (
                    <p className="text-xs text-rose-600 mt-1">{errors.role}</p>
                )}
            </FormField>

            <FormField label="Email *">
                <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ email: e.target.value })}
                    aria-invalid={!!errors.email}
                />
                {errors.email && form.email !== "" && (
                    <p className="text-xs text-rose-600 mt-1">{errors.email}</p>
                )}
            </FormField>

            <FormField label="Verifique el email *">
                <Input
                    type="email"
                    value={form.confirmEmail}
                    onChange={(e) => setForm({ confirmEmail: e.target.value })}
                    aria-invalid={!!errors.confirmEmail}
                />
                {errors.confirmEmail && form.confirmEmail !== "" && (
                    <p className="text-xs text-rose-600 mt-1">{errors.confirmEmail}</p>
                )}
            </FormField>

            <FormField label="Número de móvil *">
                <div className="phone-input-wrapper">
                    <PhoneInput
                        country={"ec"}
                        value={form.phone}
                        onChange={(phone) => setForm({ phone })}
                        inputStyle={{
                            width: "100%",
                            height: "48px",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            fontSize: "14px",
                        }}
                        buttonStyle={{
                            borderRadius: "8px 0 0 8px",
                            border: "1px solid #cbd5e1",
                        }}
                        dropdownStyle={{
                            borderRadius: "8px",
                        }}
                    />
                </div>
                {errors.phone && form.phone !== "" && (
                    <p className="text-xs text-rose-600 mt-1">{errors.phone}</p>
                )}
            </FormField>

            <FormField label="Establecer contraseña *">
                <div className="relative">
                    <Input
                        type={showPassword ? "text" : "password"}
                        className="h-12 pr-10 rounded-full"
                        value={form.password}
                        onChange={(e) => setForm({ password: e.target.value })}
                        aria-invalid={!!errors.password}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
                {errors.password && form.password !== "" && (
                    <p className="text-xs text-rose-600 mt-1">{errors.password}</p>
                )}
            </FormField>

            {passwordsMatch && (
                <div className="text-sm text-green-600 flex items-center gap-2">
                    ✔ Todo está en orden. Ya puedes guardar tu nueva contraseña.
                </div>
            )}

            <FormField label="Repita su contraseña *">
                <div className="relative">
                    <Input
                        type={showConfirm ? "text" : "password"}
                        className="h-12 pr-10 rounded-full"
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ confirmPassword: e.target.value })}
                        aria-invalid={!!errors.confirmPassword}
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
                {errors.confirmPassword && form.confirmPassword !== "" && (
                    <p className="text-xs text-rose-600 mt-1">{errors.confirmPassword}</p>
                )}
            </FormField>

            <div className="text-sm text-slate-600 dark:text-slate-300">
                <Checkbox
                    checked={form.acceptTerms}
                    onChange={(v: boolean) => setForm({ acceptTerms: v })}
                >
                    <span>
                        Acepto los{" "}
                        <span className="text-blue-500 cursor-pointer">términos y condiciones</span>
                        , la{" "}
                        <span className="text-blue-500 cursor-pointer">política de privacidad</span>{" "}
                        y el tratamiento de mis datos
                    </span>
                </Checkbox>

                <Checkbox
                    checked={form.confirmAuthorization}
                    onChange={(v: boolean) => setForm({ confirmAuthorization: v })}
                >
                    Confirmo que tengo la autorización para crear una cuenta para este centro
                </Checkbox>
            </div>

        </div>
    );
};
