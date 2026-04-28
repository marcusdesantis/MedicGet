export const Card = ({ children, className }: any) => {
  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl ${className}`}>
      {children}
    </div>
  );
};