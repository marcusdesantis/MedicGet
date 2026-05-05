import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { specialties } from "../data/specialties";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import PhoneInput from "react-phone-input-2";
import { Checkbox } from "@/components/ui/Checkbox";
import type { DoctorDraft } from "../state";
import type { FieldErrors } from "../validation";

interface Props {
    form: DoctorDraft;
    setForm: (patch: Partial<DoctorDraft>) => void;
    errors: FieldErrors;
}

/**
 * Doctor / specialist registration — step 1.
 *
 * The parent page owns validation state and passes the per-field errors map
 * down. Errors are only shown for fields the user has touched (we use the
 * "field has any value" heuristic so empty-and-untouched fields don't
 * scream at the user on first render).
 */
export const ProfessionalForm = ({ form, setForm, errors }: Props) => {
    return (
        <div className="space-y-4">

            <div className="grid grid-cols-2 gap-4">
                <FormField label="Nombre(s) *">
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

            <FormField label="Especialidad *">
                <AutocompleteSelect
                    options={specialties}
                    value={form.specialty}
                    onChange={(value) => setForm({ specialty: value })}
                />
                {errors.specialty && form.specialty !== "" && (
                    <p className="text-xs text-rose-600 mt-1">{errors.specialty}</p>
                )}
            </FormField>

            <FormField label="Ubicación de tu consulta">
                <AddressAutocomplete form={form} setForm={setForm} />
            </FormField>

            <FormField label="Teléfono móvil *">
                <div className="phone-input-wrapper">
                    <PhoneInput
                        country={"ec"}
                        value={form.phone}
                        onChange={(phone) => setForm({ phone })}
                    />
                </div>
                {errors.phone && form.phone !== "" && (
                    <p className="text-xs text-rose-600 mt-1">{errors.phone}</p>
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

            <FormField label="Contraseña *">
                <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ password: e.target.value })}
                    aria-invalid={!!errors.password}
                />
                {errors.password && form.password !== "" && (
                    <p className="text-xs text-rose-600 mt-1">{errors.password}</p>
                )}
            </FormField>

            <div className="flex items-start gap-2 text-sm text-slate-500">
                <Checkbox
                    checked={form.terms}
                    onChange={(v: boolean) => setForm({ terms: v })}
                >
                    Acepto los términos y condiciones *
                </Checkbox>
            </div>
            {errors.terms && (
                <p className="text-xs text-rose-600 -mt-2">{errors.terms}</p>
            )}
        </div>
    );
};
