import { Label } from "./Label";

type Props = {
  label?: string;
  children: React.ReactNode;
};

export const FormField = ({ label, children }: Props) => {
  return (
    <div className="space-y-1">
      {label && <Label>{label}</Label>}
      {children}
    </div>
  );
};