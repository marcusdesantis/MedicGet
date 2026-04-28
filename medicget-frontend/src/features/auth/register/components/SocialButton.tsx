type Props = {
  icon: React.ReactNode;
  text: string;
  disabled?: boolean;
};

export const SocialButton = ({ icon, text, disabled }: Props) => {
  return (
    <button
      disabled={disabled}
      className={`
        w-full flex items-center justify-center gap-3
        py-3 rounded-full border
        text-sm font-medium
        transition
        ${
          disabled
            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
            : "bg-white hover:bg-slate-50 border-slate-200"
        }
      `}
    >
      {icon}
      {text}
    </button>
  );
};