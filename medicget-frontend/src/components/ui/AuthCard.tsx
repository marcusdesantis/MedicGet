export const AuthCard = ({ children }: any) => {
  return (
    <div className="
      w-full max-w-lg
      bg-white dark:bg-slate-900
      border border-slate-200 dark:border-slate-800
      rounded-2xl
      shadow-lg
      p-6 md:p-8
    ">
      {children}
    </div>
  );
};