import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Alert } from "@/components/ui/Alert";
import { AddressAutocomplete } from "./AddressAutocomplete";
import type { DoctorDraft } from "../state";

interface Props {
  form: DoctorDraft;
  setForm: (patch: Partial<DoctorDraft>) => void;
}

/**
 * Doctor flow — step 2 form. Address fields are all optional so the user
 * can skip them; therefore no validation is enforced here. The parent page
 * keeps the "Finalizar registro" button enabled regardless of these
 * values, but offers a "Skip" affordance too.
 */
export const AddressForm = ({ form, setForm }: Props) => {
  return (
    <div className="space-y-5">
      <Alert>
        Empieza con una dirección. Puedes añadir otras más tarde.
      </Alert>

      <FormField label="Nombre de tu consulta">
        <Input
          placeholder="Ej: Clínica Dental Central"
          value={form.consultName}
          onChange={(e) => setForm({ consultName: e.target.value })}
        />
      </FormField>

      <FormField label="Calle y número">
        <AddressAutocomplete form={form} setForm={setForm} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Ciudad">
          <Input
            value={form.city}
            onChange={(e) => setForm({ city: e.target.value })}
          />
        </FormField>

        <FormField label="Código postal">
          <Input
            value={form.zip}
            onChange={(e) => setForm({ zip: e.target.value })}
          />
        </FormField>
      </div>
    </div>
  );
};
