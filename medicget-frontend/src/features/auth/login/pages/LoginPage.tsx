import { useState } from 'react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { AuthCard } from '@/components/ui/AuthCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Eye, EyeOff, Stethoscope } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Divider } from '../../register/components/Divider';
import { SocialButton } from '../../register/components/SocialButton';
import { useAuth } from '@/context/AuthContext';

// Demo credentials now map to real API email/password pairs
const ROLE_HINTS = [
  {
    label:    'Paciente',
    email:    'paciente@medicget.com',
    password: 'paciente',
    color:    'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
  },
  {
    label:    'Médico',
    email:    'medico@medicget.com',
    password: 'medico',
    color:    'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300',
  },
  {
    label:    'Clínica',
    email:    'clinica@medicget.com',
    password: 'clinica',
    color:    'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300',
  },
];

const ROLE_REDIRECTS: Record<string, string> = {
  patient: '/patient',
  doctor:  '/doctor',
  clinic:  '/clinic',
};

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState('');
  const [form, setForm] = useState({ email: '', password: '' });

  const handle = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setError('');
  };

  const handleLogin = async () => {
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const result = await login(form.email.trim(), form.password);
      if (!result.success) {
        setError(result.error ?? 'Error al iniciar sesión');
        return;
      }
      navigate(ROLE_REDIRECTS[result.role ?? 'patient'] ?? '/patient');
    } finally {
      setSubmitting(false);
    }
  };

  const quickFill = (email: string, password: string) =>
    setForm({ email, password });

  return (
    <AuthLayout>
      <AuthCard>

        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600
                          flex items-center justify-center shadow-lg mb-3">
            <Stethoscope size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Bienvenido a MedicGet</h1>
          <p className="text-sm text-slate-400 mt-1">Accede a tu cuenta</p>
        </div>

        {/* Demo quick-fill */}
        <div className="mb-5">
          <p className="text-xs text-slate-400 text-center mb-2">Acceso rápido (demo)</p>
          <div className="flex gap-2">
            {ROLE_HINTS.map((r) => (
              <button
                key={r.email}
                onClick={() => quickFill(r.email, r.password)}
                className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition hover:opacity-80 ${r.color}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Google */}
        <div className="space-y-3">
          <SocialButton
            icon={<img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5" />}
            text="Continuar con Google"
          />
        </div>

        <Divider />

        {/* Form */}
        <div className="space-y-4">
          <FormField>
            <Input
              type="email"
              placeholder="Email (paciente@medicget.com)"
              value={form.email}
              onChange={(e) => handle('email', e.target.value)}
              className="h-12 rounded-full"
            />
          </FormField>

          <FormField>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Contraseña"
                value={form.password}
                onChange={(e) => handle('password', e.target.value)}
                className="h-12 pr-10 rounded-full"
                onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
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

          {error && <p className="text-xs text-rose-600 dark:text-rose-400 text-center">{error}</p>}
        </div>

        {/* Login button */}
        <Button
          onClick={handleLogin}
          disabled={submitting}
          className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-3 rounded-full"
        >
          {submitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
        </Button>

        {/* Forgot password */}
        <p
          onClick={() => navigate('/forgot-password')}
          className="text-sm text-center mt-4 text-blue-600 cursor-pointer hover:underline"
        >
          He olvidado mi contraseña
        </p>

        <div className="border-t border-slate-200 dark:border-slate-700 my-6" />

        <p className="text-sm text-center text-slate-500">
          ¿Todavía sin cuenta?{' '}
          <span onClick={() => navigate('/register')} className="text-blue-600 cursor-pointer hover:underline">
            Quiero registrarme
          </span>
        </p>

      </AuthCard>
    </AuthLayout>
  );
};
