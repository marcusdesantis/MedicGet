export const Button = ({ className, ...props }: any) => {
  return (
    <button
      className={`rounded-lg font-semibold transition-all active:scale-95
      ${className}`}
      {...props}
    />
  );
};