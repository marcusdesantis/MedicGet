import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  CheckCircle2, Loader2, Lock, Eye, EyeOff, AlertCircle,
} from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { AuthCard } from "@/components/ui/AuthCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Alert } from "@/components/ui/Alert";
import { authApi } from "@/lib/api";

/**
 * /reset-password?token=… — landing del enlace que viene por email.
 *
 * Validaciones:
 *  - Token presente en la URL (si no, mostramos error desde el inicio).
 *  - Contraseña con mínimo 6 caracteres (mismo mínimo que en registro).
 *  - Confirmación coincide con la nueva contraseña.
 *  - El backend valida que el token existe, no fue usado y no expiró.
 */
export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  const [password,    setPassword]    = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [showPwd,     setShowPwd]     = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [success,     setSuccess]     = useState(false);

  // Si no hay token, marcamos error desde el principio.
  useEffect(() => {
    if (!token) {
      setError("El enlace no es válido. Pedí uno nuevo desde Recuperar contraseña.");
    }
  }, [token]);

  const handleSubmit = async () => {
    if (!token) return;
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
      // Redirigimos al login tras 2.5s para que el usuario lea el mensaje.
      setTimeout(() => navigate("/login"), 2500);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(apiErr?.response?.data?.error?.message ?? "No pudimos cambiar la contraseña.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard>

        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-3">
            <Lock size={20} className="text-blue-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-white">
            Nueva contraseña
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Elegí una contraseña segura. Mínimo 6 caracteres.
          </p>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
              <CheckCircle2 size={28} className="text-emerald-600" />
            </div>
            <p className="text-base font-semibold text-slate-800 dark:text-white">
              ¡Contraseña actualizada!
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Te llevamos al inicio de sesión…
            </p>
          </div>
        ) : (
          <>
            {!token && (
              <div className="mb-4">
                <Alert variant="error">
                  <AlertCircle size={14} className="inline mr-1.5" />
                  El enlace no es válido o está incompleto.
                </Alert>
              </div>
            )}

            <div className="space-y-4">
              <FormField>
                <div className="relative">
                  <Input
                    type={showPwd ? "text" : "password"}
                    placeholder="Nueva contraseña"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    className="h-12 pr-10 rounded-full"
                    disabled={!token || submitting}
                    aria-invalid={!!error}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </FormField>

              <FormField>
                <Input
                  type={showPwd ? "text" : "password"}
                  placeholder="Repetí la contraseña"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                  className="h-12 rounded-full"
                  disabled={!token || submitting}
                />
              </FormField>

              {error && <Alert variant="error">{error}</Alert>}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!token || submitting}
              className="w-full mt-6 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-full disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              {submitting ? "Guardando…" : "Cambiar contraseña"}
            </Button>
          </>
        )}

        <p className="text-sm text-center mt-6 text-slate-500">
          <Link to="/login" className="text-blue-600 hover:underline">
            Volver al login
          </Link>
        </p>

      </AuthCard>
    </AuthLayout>
  );
};
