type AlertVariant = "info" | "error" | "warning" | "success";

interface Props {
  children: React.ReactNode;
  variant?: AlertVariant;
  /** Optional content rendered to the right of the message (e.g. an action button). */
  action?:  React.ReactNode;
}

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  info:    "bg-blue-50  border-blue-200  text-blue-700",
  error:   "bg-rose-50  border-rose-200  text-rose-700",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  success: "bg-green-50 border-green-200 text-green-700",
};

/**
 * Generic alert/banner. Default variant is `info` so existing call sites
 * (`<Alert>...</Alert>`) keep their original look.
 */
export const Alert = ({ children, variant = "info", action }: Props) => {
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 ${VARIANT_CLASSES[variant]} border p-4 rounded-lg text-sm`}
    >
      <div className="flex-1">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
