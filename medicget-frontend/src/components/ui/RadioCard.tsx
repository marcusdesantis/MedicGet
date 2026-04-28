import { CheckCircle, User, Stethoscope, Building2 } from "lucide-react";

type Props = {
  title: string;
  description: string;
  type: "patient" | "specialist" | "clinic";
  selected?: boolean;
  recommended?: boolean;
  onClick?: () => void;
};

export const RadioCard = ({
  title,
  description,
  type,
  selected,
  recommended,
  onClick,
}: Props) => {
  const icons = {
    patient: <User size={20} />,
    specialist: <Stethoscope size={20} />,
    clinic: <Building2 size={20} />,
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative flex items-center justify-between p-6 rounded-xl cursor-pointer transition-all
        border
        ${selected
          ? "border-[#1A82FE] bg-blue-50 dark:bg-blue-950/30"
          : "border-slate-200 bg-white dark:bg-slate-900 hover:shadow-sm"
        }
      `}
    >
      {/* LEFT CONTENT */}
      <div className="flex items-center gap-4">
        {/* ICON BOX */}
        <div className="w-14 h-14 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {icons[type]}
        </div>

        {/* TEXT */}
        <div>
          <h3 className="font-semibold text-lg text-slate-800 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-slate-500">
            {description}
          </p>
        </div>
      </div>

      {/* RIGHT RADIO */}
      <div className="flex items-center">
        {selected ? (
          <CheckCircle className="text-[#1A82FE]" size={22} />
        ) : (
          <div className="w-5 h-5 border-2 border-slate-300 rounded-full" />
        )}
      </div>

      {/* BADGE */}
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1A82FE] text-white text-xs px-3 py-1 rounded-full font-medium">
          RECOMENDADO
        </div>
      )}
    </div>
  );
};