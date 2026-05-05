import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, Calendar, ShieldCheck, Stethoscope, Building2,
  Users, Video, MessageSquare, CreditCard, Clock, Star,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/**
 * HomePage — landing page público.
 *
 * Diseño minimalista y elegante:
 *   • Hero con propuesta de valor clara y CTAs primario/secundario
 *   • Tres tarjetas de rol (Paciente / Médico / Clínica) que sirven como
 *     entrypoint al flujo de registro correspondiente
 *   • Sección de features clave (videollamada, pago en línea, agenda)
 *   • Bloque de "cómo funciona" en 3 pasos
 *   • Footer simple
 *
 * Si el usuario ya tiene sesión, los CTAs del hero adaptan a "Ir al panel".
 */
export function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const dashHref =
    user?.role === 'doctor'  ? '/doctor'  :
    user?.role === 'clinic'  ? '/clinic'  :
    user?.role === 'patient' ? '/patient' : '/login';

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">

      {/* ─── NAV ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 backdrop-blur bg-white/80 dark:bg-slate-950/80 border-b border-slate-100 dark:border-slate-800">
        <nav className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Activity size={18} />
            </span>
            <span className="font-semibold tracking-tight">MedicGet</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm text-slate-600 dark:text-slate-400">
            <a href="#how"      className="hover:text-slate-900 dark:hover:text-white transition">¿Cómo funciona?</a>
            <a href="#features" className="hover:text-slate-900 dark:hover:text-white transition">Características</a>
            <a href="#roles"    className="hover:text-slate-900 dark:hover:text-white transition">Para quién</a>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link
                to={dashHref}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium transition"
              >
                Ir al panel <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium transition shadow-sm"
                >
                  Registrarme
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-10 h-[600px] bg-gradient-to-b from-blue-50 via-white to-white dark:from-blue-950/30 dark:via-slate-950 dark:to-slate-950"
        />
        <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-20 pb-24 lg:pt-28 lg:pb-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 mb-6">
              <ShieldCheck size={14} /> Plataforma médica de confianza
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Citas médicas en línea, <span className="text-blue-600">sin complicaciones</span>.
            </h1>

            <p className="mt-6 text-lg text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Encuentra especialistas, agenda en segundos y atiéndete por
              videollamada o presencialmente. Pacientes, médicos y clínicas en un solo lugar.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-base font-semibold transition shadow-lg shadow-blue-600/20"
              >
                Crear cuenta gratis <ArrowRight size={16} />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 px-6 py-3 text-base font-medium text-slate-700 dark:text-slate-300 transition"
              >
                Ver cómo funciona
              </a>
            </div>

            {/* Trust strip */}
            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-500" /> Pagos seguros</div>
              <div className="flex items-center gap-2"><Video size={16} className="text-blue-500" /> Videollamada incluida</div>
              <div className="flex items-center gap-2"><Clock size={16} className="text-amber-500" /> Confirmación instantánea</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ROLES ───────────────────────────────────────────────────────── */}
      <section id="roles" className="py-20 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Una plataforma para cada rol</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400">
              Empieza eligiendo cómo quieres usar MedicGet.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <RoleCard
              icon={<Users size={22} />}
              accent="bg-blue-600"
              title="Soy paciente"
              description="Busca especialistas, reserva citas y atiéndete por videollamada o en consulta."
              href="/register"
              cta="Registrarme como paciente"
            />
            <RoleCard
              icon={<Stethoscope size={22} />}
              accent="bg-teal-600"
              title="Soy médico"
              description="Crea tu perfil profesional, gestiona tu agenda y recibe pacientes en minutos."
              href="/register"
              cta="Registrarme como médico"
              recommended
            />
            <RoleCard
              icon={<Building2 size={22} />}
              accent="bg-indigo-600"
              title="Soy clínica"
              description="Centraliza médicos, agenda, pagos y reportes en un único panel administrativo."
              href="/register"
              cta="Registrar mi clínica"
            />
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section id="how" className="py-20 bg-slate-50 dark:bg-slate-900/40 border-y border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Tu cita en 3 pasos</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400">
              Sin llamadas, sin esperas, sin papeleo.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Step
              number="01"
              title="Encuentra al especialista"
              description="Filtra por especialidad, ciudad, modalidad y precio. Mira valoraciones reales de otros pacientes."
            />
            <Step
              number="02"
              title="Reserva y paga en línea"
              description="Elige fecha y hora desde la agenda del médico. Paga seguro con PayPhone, tarjeta o transferencia."
            />
            <Step
              number="03"
              title="Atiéndete"
              description="Recibe confirmación por correo y WhatsApp con el enlace de videollamada listo para tu consulta."
            />
          </div>
        </div>
      </section>

      {/* ─── FEATURES ────────────────────────────────────────────────────── */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Todo lo que necesitas</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400">
              Diseñado para que pacientes y profesionales se enfoquen en lo importante.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Feature
              icon={<Calendar size={20} />}
              title="Agenda en tiempo real"
              description="Disponibilidad sincronizada de cada médico, sin doble reserva."
            />
            <Feature
              icon={<Video size={20} />}
              title="Videollamadas integradas"
              description="Enlace generado automáticamente cuando se confirma el pago."
            />
            <Feature
              icon={<MessageSquare size={20} />}
              title="Chat con tu médico"
              description="Mensajería privada habilitada para citas pagadas."
            />
            <Feature
              icon={<CreditCard size={20} />}
              title="Pagos en línea"
              description="PayPhone y tarjeta. Comprobantes y reembolsos automáticos."
            />
            <Feature
              icon={<ShieldCheck size={20} />}
              title="Datos protegidos"
              description="Encriptación en tránsito y reposo. Cumplimos normativas de salud."
            />
            <Feature
              icon={<Star size={20} />}
              title="Calificaciones reales"
              description="Reviews verificadas de pacientes que sí asistieron a la consulta."
            />
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ──────────────────────────────────────────────────── */}
      <section className="py-20 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">¿Empezamos?</h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Crea tu cuenta en menos de un minuto. Sin tarjeta, sin compromiso.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-base font-semibold transition shadow-lg shadow-blue-600/20"
            >
              Crear cuenta gratis <ArrowRight size={16} />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 px-6 py-3 text-base font-medium text-slate-700 dark:text-slate-300 transition"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 dark:border-slate-800 py-10 text-sm text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-blue-600" />
            <span>© {new Date().getFullYear()} MedicGet. Todos los derechos reservados.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-slate-700 dark:hover:text-slate-200 transition">Términos</a>
            <a href="#" className="hover:text-slate-700 dark:hover:text-slate-200 transition">Privacidad</a>
            <a href="#" className="hover:text-slate-700 dark:hover:text-slate-200 transition">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────

interface RoleCardProps {
  icon:        React.ReactNode;
  accent:      string;
  title:       string;
  description: string;
  href:        string;
  cta:         string;
  recommended?: boolean;
}

function RoleCard({ icon, accent, title, description, href, cta, recommended }: RoleCardProps) {
  return (
    <Link
      to={href}
      className="group relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-lg transition"
    >
      {recommended && (
        <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
          Más popular
        </span>
      )}
      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl text-white ${accent}`}>
        {icon}
      </div>
      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
      <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-blue-600 group-hover:gap-2 transition-all">
        {cta} <ArrowRight size={14} />
      </span>
    </Link>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 border border-slate-100 dark:border-slate-800">
      <span className="text-xs font-bold tracking-wider text-blue-600 dark:text-blue-400">{number}</span>
      <h3 className="mt-2 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-6 hover:border-slate-200 dark:hover:border-slate-700 transition">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}
