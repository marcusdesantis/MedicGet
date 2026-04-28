type Props = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = ({ className, ...props }: Props) => {
  return (
    <input
      className={`
        w-full rounded-lg border border-slate-300 dark:border-slate-700
        bg-white dark:bg-slate-900
        px-3 py-2 text-sm
        text-slate-800 dark:text-white
        placeholder:text-slate-400
        focus:outline-none focus:ring-2 focus:ring-[#1A82FE] focus:border-transparent
        disabled:opacity-50
        ${className}
      `}
      {...props}
    />
  );
};