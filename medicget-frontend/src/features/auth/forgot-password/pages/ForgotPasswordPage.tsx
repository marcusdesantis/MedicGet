import { useState } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { AuthCard } from "@/components/ui/AuthCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { useNavigate } from "react-router-dom";

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = () => {
    // aquí iría tu API
    setSent(true);
  };

  return (
    <AuthLayout>
      <AuthCard>

        {/* TITLE */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-slate-800 dark:text-white">
            Recuperar contraseña
          </h1>

          <p className="text-sm text-slate-500 mt-2">
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </div>

        {!sent ? (
          <>
            {/* FORM */}
            <div className="space-y-4">

              <FormField>
                <Input
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-full"
                />
              </FormField>

            </div>

            {/* BUTTON */}
            <Button
              onClick={handleSubmit}
              className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white py-3 rounded-full"
            >
              Enviar enlace
            </Button>
          </>
        ) : (
          <>
            {/* SUCCESS STATE */}
            <div className="text-center py-6">
              <p className="text-green-600 font-medium">
                ✔ Revisa tu correo
              </p>

              <p className="text-sm text-slate-500 mt-2">
                Te enviamos un enlace para restablecer tu contraseña.
              </p>
            </div>
          </>
        )}

        {/* BACK TO LOGIN */}
        <p
          onClick={() => navigate("/login")}
          className="text-sm text-center mt-6 text-green-600 cursor-pointer"
        >
          Volver al login
        </p>

      </AuthCard>
    </AuthLayout>
  );
};