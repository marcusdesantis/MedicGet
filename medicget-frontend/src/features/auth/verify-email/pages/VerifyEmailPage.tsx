/**
 * VerifyEmailPage — pantalla post-registro.
 *
 * Acepta dos flows simultáneamente:
 *   1. URL `?token=<long>` — el usuario hizo click en el link del email.
 *      Llamamos `/auth/verify-email` con ese token. En éxito recibimos
 *      `{ token, user }` y logueamos al usuario directamente (set JWT
 *      en localStorage + bootstrap del AuthContext).
 *   2. Formulario con código de 6 dígitos — el usuario copió el código
 *      del email a la app. Requiere también el `email` (lo precargamos
 *      desde `?email=` que viene de la página de registro).
 *
 * Adicionalmente expone "Reenviar email" (rate-limited del lado backend).
 *
 * En éxito redirige al dashboard del rol (`/patient`, `/doctor`,
 * `/clinic`, `/admin`), respetando un `?next=` opcional para casos
 * especiales (e.g. médico recién registrado → /doctor/setup).
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, MailCheck, CheckCircle2, RefreshCw } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { AuthCard }   from '@/components/ui/AuthCard';
import { Alert }      from '@/components/ui/Alert';
import { Button }     from '@/components/ui/Button';
import { authApi, TOKEN_KEY } from '@/lib/api';

const ROLE_HOME: Record<string, string> = {
  PATIENT: '/patient',
  DOCTOR:  '/doctor',
  CLINIC:  '/clinic',
  ADMIN:   '/admin',
};

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const linkToken = params.get('token');
  const presetEmail = params.get('email') ?? '';
  const next        = params.get('next');

  const [email,   setEmail]   = useState(presetEmail);
  const [code,    setCode]    = useState('');
  const [status,  setStatus]  = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [error,   setError]   = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  // Si entraron con ?token=, auto-verificamos al montar. Idempotente — usamos
  // un ref para no disparar dos veces en strict mode.
  const verifiedRef = useRef(false);
  useEffect(() => {
    if (!linkToken || verifiedRef.current) return;
    verifiedRef.current = true;
    void verifyWithToken(linkToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkToken]);

  const verifyWithToken = async (token: string) => {
    setStatus('verifying');
    setError(null);
    try {
      const res = await authApi.verifyEmail({ token });
      localStorage.setItem(TOKEN_KEY, res.data.token);
      setStatus('success');
      // Pequeña pausa visual para que el usuario vea el "✓".
      setTimeout(() => {
        const dest = next || ROLE_HOME[res.data.user.role] || '/login';
        // Hard reload para que AuthContext bootstrappee con el JWT nuevo.
        window.location.replace(dest);
      }, 800);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'No se pudo verificar el enlace';
      setStatus('error');
      setError(msg);
    }
  };

  const verifyWithCode = async () => {
    if (!email || !/^\d{6}$/.test(code)) {
      setError('Ingresá tu email y el código de 6 dígitos.');
      return;
    }
    setStatus('verifying');
    setError(null);
    try {
      const res = await authApi.verifyEmail({ code, email });
      localStorage.setItem(TOKEN_KEY, res.data.token);
      setStatus('success');
      setTimeout(() => {
        const dest = next || ROLE_HOME[res.data.user.role] || '/login';
        window.location.replace(dest);
      }, 800);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Código inválido o expirado';
      setStatus('error');
      setError(msg);
    }
  };

  const resend = async () => {
    if (!email) {
      setError('Necesitamos tu email para reenviar el código.');
      return;
    }
    setResendStatus('sending');
    try {
      await authApi.resendVerification(email);
    } finally {
      setResendStatus('sent');
    }
  };

  // ─── Render branches ──────────────────────────────────────────────────────

  if (status === 'verifying' && linkToken) {
    return (
      <AuthLayout>
        <AuthCard title="Verificando tu cuenta…" subtitle="Esto toma solo un segundo.">
          <div className="flex flex-col items-center gap-3 py-6 text-slate-500">
            <Loader2 className="animate-spin" size={26} />
            <p className="text-sm">Comprobando el enlace.</p>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  if (status === 'success') {
    return (
      <AuthLayout>
        <AuthCard title="¡Cuenta verificada!" subtitle="Te llevamos a tu panel…">
          <div className="flex flex-col items-center gap-3 py-6 text-emerald-600">
            <CheckCircle2 size={48} />
            <p className="text-sm">Email confirmado correctamente.</p>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard
        title="Verificá tu correo"
        subtitle="Te enviamos un email con un enlace y un código. Cualquiera de los dos sirve."
      >
      <div className="flex justify-center text-blue-600 mb-4">
        <MailCheck size={40} />
      </div>

      {error && <Alert variant="error" className="mb-3">{error}</Alert>}
      {linkToken && status === 'error' && (
        <p className="text-xs text-slate-500 text-center mb-3">
          El enlace que abriste no es válido o expiró. Podés ingresar el código manualmente abajo.
        </p>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Código de 6 dígitos
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="••••••"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-center text-xl tracking-[0.4em] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <Button
          onClick={verifyWithCode}
          disabled={status === 'verifying' || code.length !== 6}
          className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl disabled:opacity-50"
        >
          {status === 'verifying' ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
          Verificar
        </Button>

        <button
          onClick={resend}
          disabled={resendStatus === 'sending'}
          className="w-full inline-flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 mt-2"
        >
          {resendStatus === 'sending'
            ? <><Loader2 size={13} className="animate-spin" /> Enviando…</>
            : resendStatus === 'sent'
              ? <><CheckCircle2 size={13} /> Si la cuenta existe, te reenviamos el correo.</>
              : <><RefreshCw size={13} /> Reenviar correo</>}
        </button>
      </div>

        <p className="text-xs text-slate-400 text-center mt-6">
          ¿Volviste por error? <Link to="/login" className="text-blue-600 hover:underline">Iniciar sesión</Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}
