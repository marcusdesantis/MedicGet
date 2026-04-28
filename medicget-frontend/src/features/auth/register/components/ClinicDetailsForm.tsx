import { Checkbox } from "@/components/ui/Checkbox";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

export const ClinicDetailsForm = ({ form, setForm }: any) => {
    const handle = (f: string, v: any) => {
        setForm({ ...form, [f]: v });
    };
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const passwordsMatch =
        form.password && form.confirmPassword && form.password === form.confirmPassword;

    return (
        <div className="space-y-4">

            <div className="grid grid-cols-2 gap-4">
                <FormField label="Nombre *">
                    <Input

                        value={form.name}
                        onChange={(e) => handle("name", e.target.value)}
                    />
                </FormField>

                <FormField label="Apellidos *">
                    <Input

                        value={form.lastname}
                        onChange={(e) => handle("lastname", e.target.value)}
                    />
                </FormField>
            </div>

            <FormField label="Cargo *">
                <Input

                    value={form.role}
                    onChange={(e) => handle("role", e.target.value)}
                />
            </FormField>

            {/* EMAIL */}
            <FormField label="Email *">
                <Input

                    value={form.email}
                    onChange={(e) => handle("email", e.target.value)}
                />
            </FormField>

            {/* CONFIRM EMAIL */}
            <FormField label="Verifique el email *">
                <Input

                    value={form.confirmEmail}
                    onChange={(e) => handle("confirmEmail", e.target.value)}
                />
            </FormField>

            <FormField label="Número de móvil *">
                <div className="phone-input-wrapper">
                    <PhoneInput
                        country={"ec"}
                        value={form.phone}
                        onChange={(phone) => handle("phone", phone)}
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
            </FormField>

            {/* PASSWORD */}
            <FormField label="Establecer contraseña *">
                <div className="relative">
                    <Input
                        type={showPassword ? "text" : "password"}
                        className="h-12 pr-10 rounded-full"
                        value={form.password}
                        onChange={(e) => handle("password", e.target.value)}
                    />

                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </FormField>

            {/* VALIDATION */}
            {passwordsMatch && (
                <div className="text-sm text-green-600 flex items-center gap-2">
                    ✔ Todo está en orden. Ya puedes guardar tu nueva contraseña.
                </div>
            )}

            {/* CONFIRM PASSWORD */}
            <FormField label="Repita su contraseña *">
                <div className="relative">
                    <Input
                        type={showConfirm ? "text" : "password"}
                        className="h-12 pr-10 rounded-full"
                        value={form.confirmPassword}
                        onChange={(e) => handle("confirmPassword", e.target.value)}
                    />

                    <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </FormField>

            {/* CHECKBOXES */}
            <div className="text-sm text-slate-600 dark:text-slate-300">

                <Checkbox
                    checked={form.acceptTerms}
                    onChange={(v: boolean) => handle("acceptTerms", v)}
                >
                    <span>
                        Acepto los{" "}
                        <span className="text-blue-500 cursor-pointer">
                            términos y condiciones
                        </span>
                        , la{" "}
                        <span className="text-blue-500 cursor-pointer">
                            política de privacidad
                        </span>{" "}
                        y el tratamiento de mis datos
                    </span>
                </Checkbox>

                <Checkbox
                    checked={form.confirmAuthorization}
                    onChange={(v: boolean) => handle("confirmAuthorization", v)}
                >
                    Confirmo que tengo la autorización para crear una cuenta para este centro
                </Checkbox>

            </div>

        </div>
    );
};