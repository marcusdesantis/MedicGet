import { useState } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { RadioCard } from "@/components/ui/RadioCard";
import { Button } from "@/components/ui/Button";
import { useNavigate } from "react-router-dom";

export const RegisterProfilePage = () => {
    const [selected, setSelected] = useState("specialist");

    const navigate = useNavigate();

    const handleContinue = () => {
        if (selected === "specialist") {
            navigate("/register/professional");
        } 
        else if (selected === "patient") {
            navigate("/register/patient");
        }
        else if (selected === "clinic") {
            navigate("/register/clinic");
        }
    };

    return (
        <AuthLayout>
            <div className="max-w-3xl text-center mb-10">
                <h1 className="text-3xl font-bold mb-3 text-slate-800 dark:text-white">
                    Crear una cuenta gratuita
                </h1>
                <p className="text-slate-500">
                    Selecciona el tipo de perfil que mejor se adapte a tus necesidades para ofrecerte la mejor experiencia.
                </p>
            </div>

            <div className="grid gap-4 max-w-3xl w-full">
                <RadioCard
                    title="Soy paciente"
                    description="Comparte información básica con tu especialista antes de la visita."
                    type="patient"
                    selected={selected === "patient"}
                    onClick={() => setSelected("patient")}
                />

                <RadioCard
                    title="Soy especialista"
                    description="Consigue que tus pacientes te conozcan, confíen en ti y reserven contigo."
                    type="specialist"
                    selected={selected === "specialist"}
                    recommended
                    onClick={() => setSelected("specialist")}
                />

                <RadioCard
                    title="Soy gerente de una clínica"
                    description="Da mayor visibilidad a tu clínica con un perfil propio y gestiona citas eficientemente."
                    type="clinic"
                    selected={selected === "clinic"}
                    onClick={() => setSelected("clinic")}
                />
            </div>

            <div className="mt-10">
                <Button onClick={handleContinue} className="bg-[#1A82FE] hover:bg-[#166fe0] text-white px-10 py-3">
                    Continuar
                </Button>
            </div>
        </AuthLayout>
    );
};