import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "../ui/Button";
import { useNavigate } from "react-router-dom";

export const Navbar = () => {
    const navigate = useNavigate();
    return (
        <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
            <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">

                <span className="text-xl font-bold text-[#1A82FE]">
                    Medicget
                </span>

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