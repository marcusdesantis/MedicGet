import { useState } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { AuthCard } from "@/components/ui/AuthCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Divider } from "../../register/components/Divider";
import { SocialButton } from "../../register/components/SocialButton";

export const LoginPage = () => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handle = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const goToRegister = () => {
    navigate("/register");
  };

  return (
    <AuthLayout>
      <AuthCard>

        {/* TITLE */}
        <h1 className="text-xl font-semibold mb-6 text-slate-800 dark:text-white text-center">
          Accede a tu cuenta
        </h1>

        {/* GOOGLE */}
        <div className="space-y-3">
          <SocialButton
            icon={
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                className="w-5"
              />
            }
            text="Continuar con Google"
          />
        </div>

        <Divider />

        {/* FORM */}
        <div className="space-y-4">

          <FormField>
            <Input
              placeholder="Correo electrónico"
              value={form.email}
              onChange={(e) => handle("email", e.target.value)}
              className="h-12 rounded-full"
            />
          </FormField>

          <FormField>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                value={form.password}
                onChange={(e) => handle("password", e.target.value)}
                className="h-12 pr-10 rounded-full"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </FormField>

        </div>

        {/* LOGIN BUTTON */}
        <Button className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white py-3 rounded-full">
          Iniciar sesión
        </Button>

        {/* FORGOT PASSWORD */}
        <p
          onClick={() => navigate("/forgot-password")}
          className="text-sm text-center mt-4 text-green-600 cursor-pointer"
        >
          He olvidado mi contraseña
        </p>

        {/* DIVIDER */}
        <div className="border-t border-slate-200 dark:border-slate-700 my-6" />

        {/* REGISTER */}
        <p className="text-sm text-center text-slate-500">
          ¿Todavía sin cuenta?{" "}
          <span
            onClick={goToRegister}
            className="text-green-600 cursor-pointer"
          >
            Quiero registrarme
          </span>
        </p>

      </AuthCard>
    </AuthLayout>
  );
};