import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Alert } from "@/components/ui/Alert";
import { AddressAutocomplete } from "./AddressAutocomplete";

export const AddressForm = ({ form, setForm }: any) => {
  const handleChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
  };

  return (
    <div className="space-y-5">

      <Alert>
        Empieza con una dirección. Puedes añadir otras más tarde.
      </Alert>

      <FormField label="Nombre de tu consulta">
        <Input
          placeholder="Ej: Clínica Dental Central"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
        />
      </FormField>

      <FormField label="Calle y número">
        <AddressAutocomplete form={form} setForm={setForm} />
    </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Ciudad">
          <Input
            value={form.city}
            onChange={(e) => handleChange("city", e.target.value)}
          />
        </FormField>

        <FormField label="Código postal">
          <Input
            value={form.zip}
            onChange={(e) => handleChange("zip", e.target.value)}
          />
        </FormField>
      </div>

    </div>
  );
};