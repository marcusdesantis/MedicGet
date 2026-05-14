import { Link, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "../ui/Button";
import { useAppConfig } from "@/hooks/useAppConfig";

/**
 * Navbar público — Home, directorio público de médicos, etc.
 * Lee nombre + logo desde `/app.json` para que el branding se cambie
 * editando un solo archivo.
 */
export const Navbar = () => {
    const navigate = useNavigate();
    const { name, logoUrl } = useAppConfig();

    return (
        <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
            <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">

                <Link to="/" className="flex items-center gap-2.5 group" aria-label={name}>
                    <span className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden flex items-center justify-center transition group-hover:ring-blue-300 dark:group-hover:ring-blue-700">
                        <img src={logoUrl} alt={name} className="w-full h-full object-contain" />
                    </span>
                    <span className="text-xl font-bold text-[#1A82FE]">
                        {name}
                    </span>
                </Link>

                <div className="flex items-center gap-4">
                    <ThemeToggle />

                    <Button onClick={() => { navigate("/login"); }} className="px-6 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:text-slate-100">
                        Login
                    </Button>
                </div>

            </nav>
        </header>
    );
};
