import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, Calendar, ShieldCheck, Stethoscope, Building2, Users,
  Video, MessageSquare, CreditCard, Clock, Star, CheckCircle2, ChevronDown,
  Heart, Sparkles, Zap, Lock, BarChart3, Globe2, Loader2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useApi }  from '@/hooks/useApi';
import { plansApi, doctorsApi, type PlanDto, type DoctorDto } from '@/lib/api';
import { Avatar }  from '@/components/ui/Avatar';

/**
 * HomePage — landing page público.
 *
 * Diseño orientado a conversión + confianza. Estructura:
 *
 *   1. Nav sticky con CTAs claros
 *   2. Hero asimétrico (texto + dashboard mock) con badge de social proof
 *   3. Stats strip (4 números grandes — credibilidad sin exagerar)
 *   4. "Built for X" — tres bloques alternados Paciente / Médico / Clínica
 *      con bullets concretos por audiencia
 *   5. "Cómo funciona" — 3 pasos numerados con visual lateral
 *   6. Features grid (6 píldoras con iconografía coherente)
 *   7. Testimonios (3 cards con avatar + cita + atribución)
 *   8. FAQ acordeón (resuelve objeciones de compra)
 *   9. CTA final con gradiente
 *  10. Footer columnado
 *
 * Principios UI/UX aplicados:
 *   • Jerarquía clara: H1 grande, párrafo guía, dos CTAs (primario/secundario)
 *   • Asimetría intencional en hero y "Built for X" para evitar la sensación
 *     de plantilla genérica
 *   • Micro-interacciones (hover translate, scale en CTAs) sin ser ruidosas
 *   • Trust signals distribuidos: stats, testimonios, FAQ, "free forever"
 *   • Spacing generoso (py-24 lg:py-32) en secciones principales
 */
export function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const dashHref =
    user?.role === 'doctor'  ? '/doctor'  :
    user?.role === 'clinic'  ? '/clinic'  :
    user?.role === 'patient' ? '/patient' : '/login';

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-200 dark:selection:bg-blue-800/40">

      {/* ─── NAV ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/70 dark:bg-slate-950/70 border-b border-slate-100/80 dark:border-slate-800/60">
        <nav className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-600/20 group-hover:shadow-blue-600/40 transition">
              <Activity size={18} strokeWidth={2.5} />
            </span>
            <span className="font-semibold tracking-tight text-[15px]">MedicGet</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm text-slate-600 dark:text-slate-400">
            <Link to="/medicos"   className="hover:text-slate-900 dark:hover:text-white transition">Especialistas</Link>
            <a href="#como"       className="hover:text-slate-900 dark:hover:text-white transition">Cómo funciona</a>
            <a href="#pricing"    className="hover:text-slate-900 dark:hover:text-white transition">Planes</a>
            <a href="#faq"        className="hover:text-slate-900 dark:hover:text-white transition">FAQ</a>
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
                  className="hidden sm:inline-flex rounded-lg px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white px-4 py-2 text-sm font-medium transition shadow-sm"
                >
                  Empezar gratis
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background ambient gradient */}
        <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[850px]">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50/60 via-white to-white dark:from-blue-950/20 dark:via-slate-950 dark:to-slate-950" />
          <div className="absolute -top-32 -right-20 h-96 w-96 rounded-full bg-blue-100/50 dark:bg-blue-900/20 blur-3xl" />
          <div className="absolute top-40 -left-20 h-80 w-80 rounded-full bg-emerald-100/40 dark:bg-emerald-900/10 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="grid lg:grid-cols-12 gap-12 items-center">

            {/* LEFT — text */}
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/80 dark:bg-blue-950/40 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Plataforma médica integral
              </div>

              <h1 className="text-[2.75rem] sm:text-5xl lg:text-[3.75rem] font-bold tracking-tight leading-[1.05]">
                La forma moderna de{' '}
                <span className="relative inline-block">
                  <span className="relative z-10 bg-gradient-to-br from-blue-600 to-blue-500 bg-clip-text text-transparent">agendar tu salud</span>
                  <span aria-hidden className="absolute inset-x-0 bottom-1 h-3 -z-0 bg-blue-100 dark:bg-blue-900/30 rounded-sm" />
                </span>
              </h1>

              <p className="mt-6 text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
                Reserva con especialistas en segundos, paga seguro y atiéndete por
                videollamada o presencialmente. Todo desde un solo lugar.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/register"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 text-base font-semibold transition shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5"
                >
                  Crear cuenta gratis
                  <ArrowRight size={16} className="group-hover:translate-x-0.5 transition" />
                </Link>
                <a
                  href="#como"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 px-6 py-3.5 text-base font-medium text-slate-700 dark:text-slate-300 transition"
                >
                  Ver cómo funciona
                </a>
              </div>

              {/* Avatars + rating */}
              <div className="mt-8 flex items-center gap-4">
                <div className="flex -space-x-2">
                  {['JM', 'CL', 'AP', 'RS'].map((init, i) => (
                    <span
                      key={init}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-white dark:ring-slate-950 text-[10px] font-bold text-white ${
                        ['bg-blue-600', 'bg-emerald-600', 'bg-amber-500', 'bg-violet-600'][i]
                      }`}
                    >
                      {init}
                    </span>
                  ))}
                </div>
                <div className="text-sm">
                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} fill="currentColor" strokeWidth={0} />)}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">4.9</span> · pacientes verificados
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT — visual mock */}
            <div className="lg:col-span-6 relative">
              <HeroVisual />
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS STRIP ───────────────────────────────────────────────────── */}
      <section className="border-y border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <Stat number="< 60s"  label="Tiempo de reserva"   icon={<Zap size={16} />} />
            <Stat number="24/7"   label="Disponibilidad"      icon={<Clock size={16} />} />
            <Stat number="20+"    label="Especialidades"      icon={<Stethoscope size={16} />} />
            <Stat number="100%"   label="Pagos seguros"       icon={<Lock size={16} />} />
          </div>
        </div>
      </section>

      {/* ─── AUDIENCIAS ─────────────────────────────────────────────────────── */}
      <section id="audiencias" className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3 uppercase tracking-wider">Para quién</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Tres experiencias.<br />
              <span className="text-slate-400">Una sola plataforma.</span>
            </h2>
          </div>

          <div className="mt-16 space-y-8 lg:space-y-12">
            <AudienceRow
              eyebrow="Pacientes"
              icon={<Users size={20} />}
              accent="blue"
              title="Encuentra al especialista correcto en minutos."
              description="Filtra por especialidad, ciudad, modalidad y precio. Lee valoraciones reales antes de reservar."
              bullets={[
                'Búsqueda con filtros avanzados',
                'Reserva en línea con confirmación instantánea',
                'Videollamada, chat o presencial',
                'Historial médico organizado',
              ]}
              cta={{ label: 'Crear cuenta de paciente', href: '/register' }}
              imageRight={false}
            />
            <AudienceRow
              eyebrow="Médicos"
              icon={<Stethoscope size={20} />}
              accent="teal"
              title="Llena tu agenda sin secretaria."
              description="Configurá tus horarios, recibe pagos automáticamente y atendé desde donde estés."
              bullets={[
                'Calendario sincronizado en tiempo real',
                'Cobros automáticos con pasarela integrada',
                'Telemedicina lista de fábrica',
                'Reportes de tu actividad',
              ]}
              cta={{ label: 'Empezar como médico', href: '/register' }}
              recommended
              imageRight
            />
            <AudienceRow
              eyebrow="Clínicas"
              icon={<Building2 size={20} />}
              accent="indigo"
              title="Tu centro médico, gestionado en un panel."
              description="Centraliza médicos, agenda, pagos y reportes financieros. Todo en una vista clara."
              bullets={[
                'Dashboard ejecutivo con KPIs en vivo',
                'Gestión de médicos y especialidades',
                'Agenda multi-médico unificada',
                'Reportes financieros exportables',
              ]}
              cta={{ label: 'Registrar mi clínica', href: '/register' }}
              imageRight={false}
            />
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section id="como" className="py-24 lg:py-32 bg-slate-50 dark:bg-slate-900/40 border-y border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3 uppercase tracking-wider">Cómo funciona</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Tu cita en 3 pasos.<br />
              <span className="text-slate-400">Sin llamadas, sin esperas.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <StepCard
              number="01"
              icon={<Stethoscope size={20} />}
              title="Encuentra al especialista"
              description="Filtra por especialidad, ciudad y precio. Lee valoraciones reales."
            />
            <StepCard
              number="02"
              icon={<Calendar size={20} />}
              title="Reserva y paga en línea"
              description="Elige el slot que mejor te queda. Paga seguro con PayPhone o tarjeta."
              highlighted
            />
            <StepCard
              number="03"
              icon={<Video size={20} />}
              title="Atiéndete"
              description="Recibe confirmación con el enlace de videollamada listo para usar."
            />
          </div>
        </div>
      </section>

      {/* ─── FEATURES ────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3 uppercase tracking-wider">Características</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Todo lo que esperas.<br />
              <span className="text-slate-400">Y nada que no necesites.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Feature icon={<Calendar size={20} />}      title="Agenda en tiempo real"  description="Disponibilidad sincronizada de cada médico, sin doble reserva." />
            <Feature icon={<Video size={20} />}         title="Videollamadas integradas" description="Enlace generado automáticamente al confirmar el pago." />
            <Feature icon={<MessageSquare size={20} />} title="Chat con tu médico"     description="Mensajería privada habilitada para citas pagadas." />
            <Feature icon={<CreditCard size={20} />}    title="Pagos en línea"         description="PayPhone y tarjeta. Comprobantes y reembolsos automáticos." />
            <Feature icon={<ShieldCheck size={20} />}   title="Datos protegidos"       description="Encriptación en tránsito y reposo. Cumplimos normativas." />
            <Feature icon={<BarChart3 size={20} />}     title="Reportes en vivo"       description="KPIs de tu agenda, ingresos y pacientes en tiempo real." />
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-slate-50 dark:bg-slate-900/40 border-y border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3 uppercase tracking-wider">Testimonios</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Lo que dicen quienes ya usan MedicGet.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Testimonial
              quote="Reservar con mi cardiólogo me tomó 30 segundos. Antes pasaba 20 minutos al teléfono."
              name="María José Andrade"
              role="Paciente · Quito"
              initials="MA"
              accent="bg-blue-600"
            />
            <Testimonial
              quote="Llené mi agenda en menos de un mes. Los pagos llegan automáticos a mi cuenta."
              name="Dr. Juan Carlos Vega"
              role="Cardiólogo · Guayaquil"
              initials="JV"
              accent="bg-emerald-600"
              highlighted
            />
            <Testimonial
              quote="Centralizamos 12 médicos en un solo panel. Los reportes financieros son ORO."
              name="Lucía Pérez"
              role="Directora · Clínica Salud Plus"
              initials="LP"
              accent="bg-violet-600"
            />
          </div>
        </div>
      </section>

      {/* ─── ESPECIALISTAS ─────────────────────────────────────────────── */}
      <FeaturedDoctorsSection />

      {/* ─── PRICING ─────────────────────────────────────────────────────── */}
      <PricingSection />

      {/* ─── FAQ ───────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 lg:py-32">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3 uppercase tracking-wider">FAQ</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Preguntas frecuentes
            </h2>
          </div>

          <div className="space-y-3">
            <FaqItem
              question="¿Cuánto cuesta usar MedicGet?"
              answer="Para pacientes es 100% gratis. Para médicos y clínicas hay un plan free con todas las funciones esenciales y planes premium con reportes avanzados, integraciones y prioridad en búsquedas."
            />
            <FaqItem
              question="¿Cómo funcionan los pagos?"
              answer="Integramos PayPhone para procesar pagos en línea con tarjetas locales. El paciente paga al reservar, el médico recibe automáticamente y la plataforma retiene una pequeña comisión por cita."
            />
            <FaqItem
              question="¿Qué pasa si necesito cancelar una cita?"
              answer="Tanto pacientes como médicos pueden cancelar desde su panel. Las políticas de reembolso dependen del tiempo restante hasta la cita y son configurables por la clínica."
            />
            <FaqItem
              question="¿Las videollamadas son seguras?"
              answer="Sí. Usamos enlaces únicos por cita, encriptación end-to-end y el acceso queda limitado a paciente y médico. Próximamente integraremos Zoom y Google Meet para clínicas que lo prefieran."
            />
            <FaqItem
              question="¿Puedo usar MedicGet desde el móvil?"
              answer="Sí. La plataforma web es totalmente responsive y estamos finalizando la app nativa para iOS y Android."
            />
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ──────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-12 lg:p-16 text-white shadow-2xl shadow-blue-600/20">
            {/* Decorative orbs */}
            <div aria-hidden className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div aria-hidden className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />

            <div className="relative max-w-2xl">
              <Sparkles size={28} className="text-blue-200 mb-6" />
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                Empieza hoy.<br />
                Sin tarjeta. Sin compromiso.
              </h2>
              <p className="mt-4 text-blue-100 text-lg max-w-xl">
                Crea tu cuenta gratis y descubre por qué pacientes, médicos y clínicas
                eligen MedicGet para gestionar su salud.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-blue-700 hover:bg-blue-50 px-6 py-3.5 text-base font-semibold transition shadow-lg hover:-translate-y-0.5"
                >
                  Crear cuenta gratis <ArrowRight size={16} />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 hover:border-white/60 hover:bg-white/10 px-6 py-3.5 text-base font-medium text-white transition"
                >
                  Iniciar sesión
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2">
              <Link to="/" className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                  <Activity size={18} strokeWidth={2.5} />
                </span>
                <span className="font-semibold tracking-tight">MedicGet</span>
              </Link>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                La plataforma todo-en-uno para gestionar consultas médicas en línea.
              </p>
              <div className="mt-5 flex items-center gap-3 text-xs text-slate-400">
                <Heart size={12} className="text-rose-400" />
                Hecho con cuidado en Ecuador
              </div>
            </div>

            <FooterCol title="Producto" links={[
              { label: 'Para pacientes', href: '#audiencias' },
              { label: 'Para médicos',   href: '#audiencias' },
              { label: 'Para clínicas',  href: '#audiencias' },
              { label: 'Características',href: '#features' },
            ]} />
            <FooterCol title="Recursos" links={[
              { label: '¿Cómo funciona?', href: '#como' },
              { label: 'FAQ',             href: '#faq' },
              { label: 'Soporte',         href: '#' },
              { label: 'Estado',          href: '#' },
            ]} />
            <FooterCol title="Legal" links={[
              { label: 'Términos',          href: '#' },
              { label: 'Privacidad',        href: '#' },
              { label: 'Cookies',           href: '#' },
              { label: 'Aviso médico',      href: '#' },
            ]} />
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
            <p>© {new Date().getFullYear()} MedicGet. Todos los derechos reservados.</p>
            <div className="flex items-center gap-2">
              <Globe2 size={14} />
              <select className="bg-transparent text-slate-500 border-none focus:outline-none text-sm cursor-pointer">
                <option>Español (Ecuador)</option>
              </select>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//   Subcomponents
// ═══════════════════════════════════════════════════════════════════════════

/**
 * HeroVisual — mocked dashboard preview rendered as floating cards.
 * Using a hand-crafted SVG-like composition keeps the page lightweight
 * (no image assets) while looking like a real screenshot.
 */
function HeroVisual() {
  return (
    <div className="relative h-[420px] lg:h-[520px]">
      {/* Main card */}
      <div className="absolute right-0 top-8 w-[88%] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-900/10 overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 text-[11px] text-slate-400 font-mono">app.medicget.com/patient</span>
        </div>
        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs text-slate-400 mb-1">Próxima cita</p>
            <p className="text-sm font-bold">Hoy · 16:30</p>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold">
              CV
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Dr. Carlos Vega</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Cardiología</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Modalidad</p>
              <p className="text-xs font-semibold flex items-center gap-1"><Video size={10} /> Video</p>
            </div>
          </div>
          {/* Mini chart */}
          <div className="grid grid-cols-7 gap-1 items-end h-16">
            {[20, 35, 28, 50, 42, 65, 75].map((h, i) => (
              <div
                key={i}
                className={`rounded-t ${i === 6 ? 'bg-blue-600' : 'bg-blue-200 dark:bg-blue-900/50'}`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400">Próximas 7 días</span>
            <span className="text-xs font-semibold text-emerald-600">+3 esta semana</span>
          </div>
        </div>
      </div>

      {/* Floating notification card */}
      <div className="absolute -left-2 lg:left-0 top-0 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-900/10 p-4 hidden sm:block">
        <div className="flex items-start gap-2.5">
          <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold">Cita confirmada</p>
            <p className="text-[11px] text-slate-500 mt-0.5">El enlace de videollamada se envió por WhatsApp.</p>
          </div>
        </div>
      </div>

      {/* Floating slot card */}
      <div className="absolute right-4 lg:right-12 -bottom-2 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-900/10 p-4 hidden sm:block">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={12} className="text-slate-400" />
          <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Hoy disponible</p>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {['09:00', '11:30', '14:00', '15:30', '16:30', '18:00'].map((t, i) => (
            <span key={t} className={`text-[11px] font-semibold rounded py-1 text-center ${
              i === 4 ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ number, label, icon }: { number: string; label: string; icon: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm mb-3">
        {icon}
      </div>
      <p className="text-3xl sm:text-4xl font-bold tracking-tight">{number}</p>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">{label}</p>
    </div>
  );
}

interface AudienceProps {
  eyebrow:     string;
  icon:        React.ReactNode;
  accent:      'blue' | 'teal' | 'indigo';
  title:       string;
  description: string;
  bullets:     string[];
  cta:         { label: string; href: string };
  imageRight?: boolean;
  recommended?: boolean;
}

const ACCENT_CLASSES = {
  blue:   { bg: 'bg-blue-600',   text: 'text-blue-600',   ring: 'ring-blue-500/20',   light: 'bg-blue-50 dark:bg-blue-950/30' },
  teal:   { bg: 'bg-teal-600',   text: 'text-teal-600',   ring: 'ring-teal-500/20',   light: 'bg-teal-50 dark:bg-teal-950/30' },
  indigo: { bg: 'bg-indigo-600', text: 'text-indigo-600', ring: 'ring-indigo-500/20', light: 'bg-indigo-50 dark:bg-indigo-950/30' },
};

function AudienceRow({ eyebrow, icon, accent, title, description, bullets, cta, imageRight, recommended }: AudienceProps) {
  const cls = ACCENT_CLASSES[accent];
  return (
    <div className={`grid lg:grid-cols-12 gap-8 lg:gap-12 items-center ${imageRight ? '' : 'lg:[direction:rtl]'}`}>
      {/* Text */}
      <div className="lg:col-span-7 lg:[direction:ltr]">
        <div className="flex items-center gap-2 mb-4">
          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${cls.bg} text-white`}>
            {icon}
          </span>
          <span className={`text-sm font-semibold ${cls.text} uppercase tracking-wider`}>{eyebrow}</span>
          {recommended && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
              Más popular
            </span>
          )}
        </div>
        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">{title}</h3>
        <p className="mt-4 text-slate-600 dark:text-slate-400 text-lg leading-relaxed max-w-xl">{description}</p>
        <ul className="mt-6 grid sm:grid-cols-2 gap-3">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
              <CheckCircle2 size={16} className={`${cls.text} mt-0.5 flex-shrink-0`} />
              {b}
            </li>
          ))}
        </ul>
        <Link
          to={cta.href}
          className={`mt-7 inline-flex items-center gap-1.5 ${cls.text} font-semibold text-sm hover:gap-2.5 transition-all`}
        >
          {cta.label} <ArrowRight size={14} />
        </Link>
      </div>

      {/* Visual placeholder */}
      <div className="lg:col-span-5 lg:[direction:ltr]">
        <div className={`relative aspect-[4/3] rounded-3xl ${cls.light} ring-1 ${cls.ring} overflow-hidden flex items-center justify-center`}>
          <div className={`h-32 w-32 rounded-full ${cls.bg} flex items-center justify-center text-white opacity-90 shadow-xl`}>
            {icon}
          </div>
          {/* Decorative scribbles */}
          <div aria-hidden className="absolute top-4 left-4 h-8 w-8 rounded-full bg-white/40 dark:bg-white/10" />
          <div aria-hidden className="absolute bottom-6 right-8 h-12 w-12 rounded-full bg-white/30 dark:bg-white/5" />
          <div aria-hidden className="absolute top-12 right-4 h-6 w-20 rounded-full bg-white/30 dark:bg-white/10" />
        </div>
      </div>
    </div>
  );
}

function StepCard({ number, icon, title, description, highlighted }: {
  number: string; icon: React.ReactNode; title: string; description: string; highlighted?: boolean;
}) {
  return (
    <div className={`relative rounded-2xl p-7 transition-all hover:-translate-y-1 ${
      highlighted
        ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20'
        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
    }`}>
      <div className="flex items-start justify-between mb-5">
        <span className={`text-xs font-bold tracking-wider ${highlighted ? 'text-blue-200' : 'text-blue-600 dark:text-blue-400'}`}>
          PASO {number}
        </span>
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${
          highlighted ? 'bg-white/20 text-white' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
        }`}>
          {icon}
        </span>
      </div>
      <h3 className="text-xl font-bold tracking-tight">{title}</h3>
      <p className={`mt-2 text-sm leading-relaxed ${highlighted ? 'text-blue-100' : 'text-slate-600 dark:text-slate-400'}`}>
        {description}
      </p>
    </div>
  );
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="group rounded-2xl border border-slate-200 dark:border-slate-800 p-6 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

function Testimonial({ quote, name, role, initials, accent, highlighted }: {
  quote: string; name: string; role: string; initials: string; accent: string; highlighted?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-7 transition-all hover:-translate-y-1 ${
      highlighted
        ? 'bg-white dark:bg-slate-900 border-2 border-blue-200 dark:border-blue-800 shadow-xl shadow-blue-600/10'
        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
    }`}>
      <div className="flex items-center gap-1 text-amber-500 mb-4">
        {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} fill="currentColor" strokeWidth={0} />)}
      </div>
      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">"{quote}"</p>
      <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${accent} text-white text-sm font-bold`}>
          {initials}
        </span>
        <div>
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{role}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Featured Doctors section ────────────────────────────────────────────
 *
 * Trust + variety + funnel. Pulls the top-rated 6 doctors from the public
 * /doctors endpoint and shows them in an asymmetric grid with the highest
 * rated featured larger. Anonymous visitor clicking on a card lands on the
 * public /medicos/:id page, NOT directly on a booking form.
 */
function FeaturedDoctorsSection() {
  const { state } = useApi(
    () => doctorsApi.list({ available: 'true', pageSize: 6 }),
    [],
  );

  const doctors: DoctorDto[] = state.status === 'ready' ? state.data.data : [];
  // Highest rated first; fall back to reviewCount as tiebreaker.
  const sorted = [...doctors].sort((a, b) => (b.rating - a.rating) || (b.reviewCount - a.reviewCount));

  return (
    <section id="especialistas" className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3 uppercase tracking-wider">Especialistas</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Médicos verificados, <br className="hidden sm:inline" />listos para atenderte.
            </h2>
            <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
              Desde cardiólogos a pediatras: explorá perfiles, leé reseñas y reservá en
              cualquiera de las modalidades que ofrecemos.
            </p>
          </div>
          <Link
            to="/medicos"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition flex-shrink-0"
          >
            Ver todos los especialistas <ArrowRight size={14} />
          </Link>
        </div>

        {state.status === 'loading' && <DoctorsSkeleton />}
        {state.status === 'error' && (
          <p className="text-center text-rose-500 text-sm">No se pudieron cargar los especialistas.</p>
        )}
        {state.status === 'ready' && sorted.length === 0 && (
          <div className="text-center py-12 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <p className="text-slate-500">
              Estamos sumando especialistas. <Link to="/register" className="text-blue-600 hover:underline">¿Sos médico?</Link>
            </p>
          </div>
        )}
        {state.status === 'ready' && sorted.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sorted.slice(0, 6).map((d) => (
              <DoctorCard key={d.id} doctor={d} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function DoctorCard({ doctor }: { doctor: DoctorDto }) {
  const profile  = doctor.user.profile;
  const initials = ((profile?.firstName?.[0] ?? '') + (profile?.lastName?.[0] ?? '')).toUpperCase() || 'DR';
  const fullName = `Dr. ${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim();

  return (
    <Link
      to={`/medicos/${doctor.id}`}
      className="group relative block rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-start gap-4">
        <Avatar
          initials={initials}
          imageUrl={profile?.avatarUrl ?? null}
          size="lg"
          shape="rounded"
          variant="auto"
          alt={fullName}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-800 dark:text-white truncate">{fullName}</h3>
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium truncate">{doctor.specialty}</p>
          {doctor.reviewCount > 0 ? (
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
              <Star size={11} className="text-amber-400 fill-amber-400" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{doctor.rating.toFixed(1)}</span>
              <span>· {doctor.reviewCount} {doctor.reviewCount === 1 ? 'reseña' : 'reseñas'}</span>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-1">Aún sin reseñas</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5 flex-wrap">
        {doctor.modalities.map((m) => (
          <span
            key={m}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            {m === 'ONLINE'     && <><Video size={9} /> Online</>}
            {m === 'PRESENCIAL' && <><Building2 size={9} /> Presencial</>}
            {m === 'CHAT'       && <><MessageSquare size={9} /> Chat</>}
          </span>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Desde</p>
          <p className="text-lg font-bold text-slate-800 dark:text-white">${doctor.pricePerConsult.toFixed(2)}</p>
        </div>
        <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-700 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          Ver perfil <ArrowRight size={11} />
        </span>
      </div>
    </Link>
  );
}

function DoctorsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          </div>
          <div className="mt-4 h-2 w-1/3 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="mt-6 h-6 w-1/4 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
      ))}
    </div>
  );
}

/* ─── Pricing section ─────────────────────────────────────────────────────
 *
 * Pulls the active plans from the public /plans endpoint and renders them
 * in two tabs (médicos / clínicas). Each card shows: name, monthly price,
 * description, list of included modules, and a "Empezar" / "Suscribirme"
 * CTA. The CTA goes to /register for FREE plans (no payment) and to
 * /subscribe/<planId> for paid ones (kicks off PayPhone).
 */
function PricingSection() {
  const [audience, setAudience] = useState<'DOCTOR' | 'CLINIC'>('DOCTOR');
  const { state } = useApi(() => plansApi.list(audience), [audience]);

  return (
    <section id="pricing" className="py-24 lg:py-32 bg-slate-50/50 dark:bg-slate-900/30">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3 uppercase tracking-wider">Planes</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Elegí cómo querés crecer
          </h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            Probalo gratis y subí a Pro o Premium cuando estés listo. Sin contratos, sin
            sorpresas — desactivá cuando quieras.
          </p>

          {/* Audience switch */}
          <div className="inline-flex mt-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1">
            <button
              onClick={() => setAudience('DOCTOR')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                audience === 'DOCTOR' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Para médicos
            </button>
            <button
              onClick={() => setAudience('CLINIC')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                audience === 'CLINIC' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Para clínicas
            </button>
          </div>
        </div>

        {state.status === 'loading' && (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="animate-spin" size={20} />
          </div>
        )}
        {state.status === 'error' && (
          <p className="text-center text-rose-500 text-sm">No se pudieron cargar los planes.</p>
        )}
        {state.status === 'ready' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {state.data.map((p, idx) => (
              <PricingCard key={p.id} plan={p} highlight={idx === 1 /* PRO en el medio */} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PricingCard({ plan, highlight }: { plan: PlanDto; highlight: boolean }) {
  const isFree = plan.monthlyPrice === 0;
  return (
    <div
      className={`relative rounded-2xl p-8 transition shadow-sm ${
        highlight
          ? 'bg-blue-600 text-white shadow-2xl shadow-blue-600/20 scale-[1.02]'
          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
      }`}
    >
      {highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-400 text-amber-900">
          Más popular
        </span>
      )}
      <h3 className={`text-lg font-semibold ${highlight ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
        {plan.name}
      </h3>
      <div className="mt-3">
        <span className={`text-4xl font-bold ${highlight ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
          ${plan.monthlyPrice.toFixed(0)}
        </span>
        <span className={`text-sm ${highlight ? 'text-blue-100' : 'text-slate-500'}`}>/mes</span>
      </div>
      <p className={`mt-3 text-sm ${highlight ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'} min-h-[3.5em]`}>
        {plan.description}
      </p>

      <ul className="mt-6 space-y-2">
        {plan.modules.map((m) => (
          <li key={m} className="flex items-center gap-2 text-sm">
            <CheckCircle2 size={14} className={highlight ? 'text-blue-200' : 'text-emerald-500'} />
            <span className={highlight ? 'text-white' : 'text-slate-600 dark:text-slate-300'}>
              {prettyModuleLabel(m)}
            </span>
          </li>
        ))}
      </ul>

      <Link
        to={isFree ? '/register' : `/subscribe/${plan.id}`}
        className={`mt-8 block w-full text-center px-6 py-3 rounded-xl font-bold text-sm transition ${
          highlight
            ? 'bg-white text-blue-700 hover:bg-blue-50'
            : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
        }`}
      >
        {isFree ? 'Empezar gratis' : `Suscribirme · $${plan.monthlyPrice}/mes`}
      </Link>
    </div>
  );
}

function prettyModuleLabel(code: string): string {
  const m: Record<string, string> = {
    ONLINE:             'Videollamadas',
    PRESENCIAL:         'Citas presenciales',
    CHAT:               'Chat en vivo',
    REPORTS:            'Reportes avanzados',
    PRIORITY_SEARCH:    'Prioridad en búsqueda',
    BRANDING:           'Branding propio',
    PAYMENTS_DASHBOARD: 'Panel de pagos',
    MULTI_LOCATION:     'Multi-sede',
    PRIORITY_SUPPORT:   'Soporte prioritario',
  };
  return m[code] ?? code;
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
      >
        <span className="font-semibold text-slate-800 dark:text-slate-200 pr-4">{question}</span>
        <ChevronDown
          size={18}
          className={`flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`overflow-hidden transition-[max-height] duration-300 ${open ? 'max-h-40' : 'max-h-0'}`}>
        <p className="px-6 pb-5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 className="font-semibold text-sm mb-3">{title}</h4>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
