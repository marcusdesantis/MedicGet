import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { specialties } from "../data/specialties";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import PhoneInput from "react-phone-input-2";
import { Checkbox } from "@/components/ui/Checkbox";

export const ProfessionalForm = ({ form, setForm }: any) => {
    const handle = (field: string, value: string) => {
        setForm({ ...form, [field]: value });
    };

    return (
        <div className="space-y-4">

            <div className="grid grid-cols-2 gap-4">
                <FormField label="Nombre(s)">
                    <Input value={form.name} onChange={(e) => handle("name", e.target.value)} />
                </FormField>

                <FormField label="Apellidos">
                    <Input value={form.lastname} onChange={(e) => handle("lastname", e.target.value)} />
                </FormField>
            </div>

            <FormField label="Especialidad">
                <AutocompleteSelect
                    options={specialties}
                    value={form.specialty}
                    onChange={(value) => handle("specialty", value)}
                />
            </FormField>

            <FormField label="Ubicación de tu consulta">
                <AddressAutocomplete form={form} setForm={setForm} />
            </FormField>

            <FormField label="Teléfono móvil">
                <div className="phone-input-wrapper">
                    <PhoneInput
                        country={"ec"}
                        value={form.phone}
                        onChange={(phone) => handle("phone", phone)}
                    />
                </div>
            </FormField>

            <FormField label="Email">
                <Input value={form.email} onChange={(e) => handle("email", e.target.value)} />
            </FormField>

            <FormField label="Contraseña">
                <Input type="password" value={form.password} onChange={(e) => handle("password", e.target.value)} />
            </FormField>
        
            <div className="flex items-start gap-2 text-sm text-slate-500">
                <Checkbox
                    checked={form.terms}
                >
                    Acepto términos y condiciones
                </Checkbox>
            </div>

        </div>
    );
};