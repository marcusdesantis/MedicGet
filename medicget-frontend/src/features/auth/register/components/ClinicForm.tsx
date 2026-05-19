import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { ClinicDraft } from "../state";
import type { FieldErrors } from "../validation";

interface Props {
  form: ClinicDraft;
  setForm: (patch: Partial<ClinicDraft>) => void;
  errors: FieldErrors;
}

/**
 * Clinic flow — step 1 form. Collects clinic-level info (name, size, city).
 * Validation lives in the parent page.
 */
export const ClinicForm = ({ form, setForm, errors }: Props) => {
  return (
    <div className="space-y-4">

      <FormField label="Nombre de la clínica/centro *">
        <Input
          value={form.clinicName}
          onChange={(e) => setForm({ clinicName: e.target.value })}
          aria-invalid={!!errors.clinicName}
        />
        {errors.clinicName && form.clinicName !== "" && (
          <p className="text-xs text-rose-600 mt-1">{errors.clinicName}</p>
        )}
      </FormField>

      <FormField label="¿Cuántos especialistas trabajan en el centro? *">
        <Select
          value={form.specialists}
          onChange={(v) => setForm({ specialists: v })}
          options={[
            { label: "1 - 5", value: "1-5" },
            { label: "6 - 10", value: "6-10" },
            { label: "Más de 10", value: "10+" },
          ]}
        />
        {errors.specialists && form.specialists !== "" && (
          <p className="text-xs text-rose-600 mt-1">{errors.specialists}</p>
        )}
      </FormField>

      {/* "Ciudad" se captura en el step 2 dentro del LocationPicker (junto
          con país, provincia, mapa y dirección). No la pedimos acá para
          no duplicar el campo. */}

    </div>
  );
};

