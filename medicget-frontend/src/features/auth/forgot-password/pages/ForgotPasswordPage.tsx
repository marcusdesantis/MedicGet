import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { AuthCard } from "@/components/ui/AuthCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Alert } from "@/components/ui/Alert";
import { authApi } from "@/lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * /forgot-password — pide un correo y dispara el envio del link de reset.
 *
 * Validaciones:
 *  - Email obligatorio (no vacio).
 *  - Formato de email valido.
 *  - El backend confirma que el email exista en la base; si no, mostramos
 *    el error inline.
 */
export const ForgotPasswordPage = () => {
  const navigate = useNavigate();

  const [email,   setEmail]   = useState("");
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Ingresa tu correo electronico.");
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      setError("Ese correo no parece valido.");
      return;
    }

    setSending(true);
    setError(null);
    try {
      await authApi.forgotPassword(trimmed.toLowerCase());
      setSent(true);
    } catch (err: unknown) {
      const apiErr = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      const msg = apiErr?.response?.data?.error?.message ?? "No pudimos enviar el correo.";
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard>

        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-3">
            <Mail size={22} className="text-blue-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-white">
            Recuperar contrasena
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contrasena.
          </p>
        </div>

        {!sent ? (
          <>
            <div className="space-y-4">
              <FormField>
                <Input
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                  className="h-12 rounded-full"
                  aria-invalid={!!error}
                />
              </FormField>

              {error && (
                <Alert variant="error">{error}</Alert>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={sending}
              className="w-full mt-6 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-full disabled:opacity-60"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : null}
              {sending ? "Enviando..." : "Enviar enlace"}
            </Button>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
              <CheckCircle2 size={28} className="text-emerald-600" />
            </div>
            <p className="text-base font-semibold text-slate-800 dark:text-white">
              Revisa tu correo
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Te enviamos un enlace a <strong>{email}</strong>. Hace clic dentro de los proximos 60 minutos para crear una nueva contrasena.
            </p>
            <p className="text-xs text-slate-400 mt-4">
              No te llego? Revisa la carpeta de spam o
              <button
                onClick={() => { setSent(false); setError(null); }}
                className="ml-1 text-blue-600 hover:underline"
              >
                volve a intentar
              </button>.
            </p>
          </div>
        )}

        <p
          onClick={() => navigate("/login")}
          className="text-sm text-center mt-6 text-blue-600 cursor-pointer hover:underline"
        >
          Volver al login
        </p>

      </AuthCard>
    </AuthLayout>
  );
};
