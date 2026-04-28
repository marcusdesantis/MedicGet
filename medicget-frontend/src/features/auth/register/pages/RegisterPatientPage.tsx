import { useState } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { SocialButton } from "../components/SocialButton";
import { Divider } from "../components/Divider";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AuthCard } from "@/components/ui/AuthCard";
import { Checkbox } from "@/components/ui/Checkbox";

export const RegisterPatientPage = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [form, setForm] = useState({
        email: "",
        confirmEmail: "",
        password: "",
        marketing: false,
    });
    const navigate = useNavigate();

    const handle = (field: string, value: any) => {
        setForm({ ...form, [field]: value });
    };

    const emailsMatch = form.email && form.email === form.confirmEmail;

    return (
        <AuthLayout>
            <AuthCard className="shadow-2xl border-slate-100/50">

                {/* HEADER CON ICONO */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-green-50 rounded-full mb-4">
                        <ShieldCheck className="text-green-600" size={28} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                        Crea tu perfil de salud
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Únete a MedicGet y gestiona tus citas fácilmente.
                    </p>
                </div>

                {/* SOCIAL LOGIN */}
                <SocialButton
                    icon={<img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5" alt="Google" />}
                    text="Continuar con Google"
                />

                <Divider />

                {/* FORMULARIO */}
                <div className="space-y-4">
                    <FormField label="Correo electrónico">
                        <Input
                            type="email"
                            placeholder="ejemplo@correo.com"
                            value={form.email}
                            onChange={(e) => handle("email", e.target.value)}
                            className="rounded-xl border-slate-200 focus:ring-green-500"
                        />
                    </FormField>

                    <FormField label="Confirmar correo">
                        <div className="relative">
                            <Input
                                type="email"
                                placeholder="Repite tu correo"
                                value={form.confirmEmail}
                                onChange={(e) => handle("confirmEmail", e.target.value)}
                                className={`rounded-xl border-slate-200 focus:ring-green-500 pr-10 ${emailsMatch ? 'border-green-500' : ''}`}
                            />
                            {emailsMatch && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                                    <ShieldCheck size={16} />
                                </span>
                            )}
                        </div>
                    </FormField>

                    <FormField label="Contraseña">
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Mínimo 8 caracteres"
                                value={form.password}
                                onChange={(e) => handle("password", e.target.value)}
                                className="pr-10 rounded-xl border-slate-200"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </FormField>

                    {/* MARKETING CHECKBOX MEJORADO */}
                    <Checkbox
                        checked={form.marketing}
                        onChange={(value: boolean) => handle("marketing", value)}
                    >
                        Quiero recibir consejos de salud y ofertas exclusivas.
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation(); 
                                navigate("/terms");
                            }}
                            className="text-green-600 font-medium ml-1 hover:underline"
                        >
                            Saber más
                        </button>
                    </Checkbox>
                </div>

                <Button className="w-full mt-8 bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl text-lg font-semibold">
                    Crear mi cuenta
                </Button>

                {/* FOOTER */}
                <div className="mt-8 pt-2 border-t border-slate-100 text-center space-y-4">
                    <p className="text-xs text-slate-400 px-4">
                        Al registrarte, confirmas que aceptas nuestros{" "}
                        <Button onClick={() => navigate("/terms")} className="text-slate-600 underline font-medium">
                            Términos de Servicio
                        </Button>
                        {" "}y 
                        <Button onClick={() => navigate("/privacy")} className="text-slate-600 underline font-medium">
                            Política de Privacidad
                        </Button>.
                    </p>

                    <p className="text-sm text-slate-600">
                        ¿Ya tienes cuenta?{" "}
                        <Button onClick={() => navigate("/login")} className="text-green-600 font-bold hover:underline">
                            Inicia sesión aquí
                        </Button>
                    </p>
                </div>

            </AuthCard>
        </AuthLayout>
    );
};