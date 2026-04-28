import { ReactNode } from "react";

type Props = {
  icon?: ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>;

export const InputGroup = ({ icon, ...props }: Props) => {
  return (
    <div className="flex items-center border border-slate-300 rounded-lg px-3 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-[#1A82FE]">
      {icon && <div className="text-slate-400 mr-2">{icon}</div>}
      <input
        className="w-full py-2 bg-transparent outline-none text-sm"
        {...props}
      />
    </div>
  );
};