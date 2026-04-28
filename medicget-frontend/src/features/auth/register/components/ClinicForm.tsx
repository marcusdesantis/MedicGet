import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export const ClinicForm = ({ form, setForm }: any) => {
  const handle = (field: string, value: any) => {
    setForm({ ...form, [field]: value });
  };

  return (
    <div className="space-y-4">

      <FormField label="Nombre de la clínica/centro *">
        <Input
          value={form.name}
          onChange={(e) => handle("name", e.target.value)}
        />
      </FormField>

      <FormField label="¿Cuántos especialistas trabajan en el centro? *">
        <Select
          value={form.specialists}
          onChange={(v) => handle("specialists", v)}
          options={[
            { label: "1 - 5", value: "1-5" },
            { label: "6 - 10", value: "6-10" },
            { label: "Más de 10", value: "10+" },
          ]}
        />
      </FormField>

      <FormField label="Ciudad *">
        <Input
          value={form.city}
          onChange={(e) => handle("city", e.target.value)}
        />
      </FormField>

      <FormField label="Programa de gestión utilizado (opcional)">
        <Select
          value={form.software}
          onChange={(v) => handle("software", v)}
          options={[
            { label: "Ninguno", value: "none" },
            { label: "Propio", value: "custom" },
            { label: "Otro", value: "other" },
          ]}
        />
      </FormField>

    </div>
  );
};