import { useEffect, useState } from 'react';
import { useSeoMeta } from '@/hooks/useSeoMeta';
import './medicos-telemedicina.css';

export function MedicosTelemedicinaPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useSeoMeta({
    title: 'Médicos en Telemedicina | Expande tu consulta online — MedicGet',
    description: 'Únete a MedicGet y atiende pacientes online con horarios flexibles y pagos puntuales. Registro gratuito para médicos. +1.500 profesionales activos en Ecuador.',
    canonical: 'https://medicget.io/medicos-telemedicina',
    ogImage: 'https://medicget.io/landing/medico1.png',
    keywords: 'médicos telemedicina, consulta médica online, atender pacientes online, plataforma médicos Ecuador, telemedicina Ecuador',
  });

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => { document.documentElement.style.scrollBehavior = ''; };
  }, []);

  useEffect(() => {
    const fmt = (n: number) => (n >= 1000 ? n.toLocaleString('es') : String(n));
    const animate = (el: HTMLElement) => {
      const target = +(el.dataset.count ?? 0);
      const suffix = el.dataset.suffix ?? '';
      let cur = 0;
      const step = target / 60;
      const timer = setInterval(() => {
        cur += step;
        if (cur >= target) { cur = target; clearInterval(timer); }
        el.textContent = fmt(Math.floor(cur)) + suffix;
      }, 22);
    };
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) { animate(e.target as HTMLElement); observer.unobserve(e.target); }
      }),
      { threshold: 0.5 }
    );
    document.querySelectorAll<HTMLElement>('[data-count]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const faqItems = [
    { q: '¿Cuánto cuesta registrarse?', a: 'El registro es totalmente gratuito. Solo cobramos una pequeña comisión por consulta atendida, sin cuotas mensuales ni costos ocultos.' },
    { q: '¿Cómo recibo mis pagos?', a: 'Los pagos se liquidan automáticamente a tu cuenta bancaria de forma semanal, de manera puntual y segura.' },
    { q: '¿Necesito equipo especial?', a: 'No. Solo necesitas una computadora o smartphone con cámara y conexión a internet. Nuestra plataforma funciona desde el navegador.' },
  ];

  return (
    <div className="medicos-landing">
      <header>
        <div className="container nav">
          <a href="https://medicget.io/" className="brand">
            <span className="logo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"/></svg>
            </span>
            MedicGet<span style={{ color: 'var(--orange-400)' }}>.io</span>
          </a>
          <nav>
            <ul className={`nav-links${menuOpen ? ' show' : ''}`}>
              <li><a href="https://medicget.io/" className="active">Inicio</a></li>
              <li><a href="#como" onClick={() => setMenuOpen(false)}>Cómo Funciona</a></li>
              <li><a href="#beneficios" onClick={() => setMenuOpen(false)}>Beneficios</a></li>
              <li><a href="#faq" onClick={() => setMenuOpen(false)}>Contacto</a></li>
            </ul>
          </nav>
          <div className="nav-cta">
            <a href="/register" className="btn btn-primary">Regístrate</a>
            <button className="burger" onClick={() => setMenuOpen(m => !m)} aria-label="Menú">
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Para profesionales de la salud</span>
            <h1>Expande tu consulta médica online</h1>
            <p className="lead">Únete a nuestra plataforma y duplica tus ingresos atendiendo pacientes desde cualquier lugar.</p>
            <a href="/register" className="btn btn-primary" style={{ fontSize: '1.08rem', padding: '1rem 2rem' }}>Regístrate Ahora →</a>
            <p className="sub">Fácil, seguro y rentable.</p>
          </div>
          <div className="hero-art">
            <div className="doc-card">
              <img src="/landing/medico1.png" alt="Médico profesional" />
            </div>
            <div className="badge-float badge-1">
              <span className="dot">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/></svg>
              </span>
              +320 pacientes/mes
            </div>
            <div className="badge-float badge-2">
              <span className="dot" style={{ background: '#fff3e0', color: 'var(--orange-600)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </span>
              Agenda 100% online
            </div>
          </div>
        </div>
      </section>

      <section className="features" id="beneficios">
        <div className="container feature-grid">
          <div className="feature-card">
            <div className="feature-ico">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <h3>Recibe más Pacientes Online</h3>
            <p>Atiende consultas virtuales desde la comodidad de tu hogar y amplía tu alcance sin límites geográficos.</p>
          </div>
          <div className="feature-card">
            <div className="feature-ico">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <h3>Horarios Flexibles</h3>
            <p>Elige tus propios horarios y maneja tu agenda con total libertad. Tú decides cuándo y cuánto trabajas.</p>
          </div>
          <div className="feature-card accent">
            <div className="feature-ico">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M3 9h18" stroke="currentColor" strokeWidth="2"/></svg>
            </div>
            <h3>Pagos Puntuales</h3>
            <p>Recibe tus pagos de manera puntual y segura, con liquidaciones automáticas directas a tu cuenta.</p>
          </div>
        </div>
      </section>

      <section className="how" id="como">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Empieza en minutos</span>
            <h2>¿Cómo Funciona?</h2>
            <p>Tres pasos simples para empezar a atender pacientes online.</p>
          </div>
          <div className="steps">
            <div className="step">
              <div className="step-ico"><svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M9 8l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
              <div className="num">1</div>
              <h3>Regístrate Gratis</h3>
              <div className="divider" />
              <p>Completa tu perfil profesional con tus especialidades y credenciales en pocos minutos.</p>
            </div>
            <div className="step">
              <div className="step-ico"><svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></div>
              <div className="num">2</div>
              <h3>Agenda tus Citas</h3>
              <div className="divider" />
              <p>Configura tus horarios disponibles y recibe reservas automáticas de pacientes verificados.</p>
            </div>
            <div className="step">
              <div className="step-ico"><svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M17 9l4-2v8l-4-2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg></div>
              <div className="num">3</div>
              <h3>Atiende tus Pacientes</h3>
              <div className="divider" />
              <p>Realiza consultas por videollamada de forma segura desde cualquier sitio y dispositivo.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="stats">
        <div className="container stats-grid">
          <div className="stat"><div className="v" data-count="1500">0</div><div className="l">Médicos activos</div></div>
          <div className="stat"><div className="v" data-count="48000">0</div><div className="l">Consultas realizadas</div></div>
          <div className="stat"><div className="v" data-count="98" data-suffix="%">0</div><div className="l">Satisfacción</div></div>
          <div className="stat"><div className="v" data-count="24" data-suffix="/7">0</div><div className="l">Soporte</div></div>
        </div>
      </section>

      <section className="cta-band" id="registro">
        <div className="container">
          <span className="deco" style={{ left: '8%' }} />
          <span className="deco" style={{ right: '8%' }} />
          <h2>Únete a MedicGet.io y haz crecer tu consulta.</h2>
          <a href="/register" className="btn btn-primary" style={{ background: 'linear-gradient(180deg,var(--orange-400),var(--orange-600))', padding: '1.05rem 2.4rem', fontSize: '1.1rem' }}>
            Comienza Ahora
          </a>
        </div>
      </section>

      <section className="faq" id="faq">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">¿Tienes dudas?</span>
            <h2>Preguntas Frecuentes</h2>
          </div>
          <div className="faq-wrap">
            {faqItems.map((item, i) => (
              <div key={i} className={`faq-item${openFaq === i ? ' open' : ''}`}>
                <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  {item.q}
                  <span className="chev">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                </button>
                <div className="faq-a"><p>{item.a}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer>
        <div className="container">
          <div className="foot-grid">
            <div className="foot-brand">
              <a href="https://medicget.io/" className="brand">
                <span className="logo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"/></svg></span>
                MedicGet<span style={{ color: 'var(--orange-400)' }}>.io</span>
              </a>
              <p>La plataforma de telemedicina que conecta a médicos con pacientes en todo el país.</p>
              <div className="socials">
                <a href="#" aria-label="Facebook"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3V6h-3c-2 0-3 1-3 3v2H8v3h3v7h3v-7h3l1-3h-4V9c0-.5.4-1 1-1z"/></svg></a>
                <a href="#" aria-label="Twitter"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22 5.8c-.7.3-1.5.5-2.3.6.8-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1A4 4 0 0012 8.7c0 .3 0 .6.1.9-3.3-.2-6.3-1.8-8.3-4.3-.4.6-.5 1.3-.5 2 0 1.4.7 2.6 1.8 3.3-.7 0-1.3-.2-1.8-.5v.1c0 1.9 1.4 3.5 3.2 3.9-.3.1-.7.1-1 .1l-.7-.1c.5 1.6 2 2.7 3.7 2.7A8 8 0 012 19.5a11.3 11.3 0 006.1 1.8c7.3 0 11.4-6.1 11.4-11.4v-.5c.8-.6 1.5-1.3 2-2.1z"/></svg></a>
                <a href="#" aria-label="LinkedIn"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6.9 8.5H4V20h2.9V8.5zM5.4 4a1.7 1.7 0 100 3.4 1.7 1.7 0 000-3.4zM20 20h-2.9v-6c0-1.4-.5-2.4-1.8-2.4-1 0-1.5.7-1.8 1.3 0 .2-.1.5-.1.8V20H9.6V8.5h2.8v1.6c.4-.6 1.1-1.5 2.6-1.5 1.9 0 3.3 1.2 3.3 3.9V20z"/></svg></a>
              </div>
            </div>
            <div><h4>Sobre Nosotros</h4><ul><li><a href="#">Acerca de</a></li><li><a href="#">Blog</a></li><li><a href="#">Testimonios</a></li></ul></div>
            <div><h4>Soporte</h4><ul><li><a href="#">Ayuda</a></li><li><a href="#faq">Preguntas Frecuentes</a></li><li><a href="#">Contacto</a></li></ul></div>
            <div><h4>Legal</h4><ul><li><a href="/terminos">Términos y Condiciones</a></li><li><a href="/privacidad">Política de Privacidad</a></li></ul></div>
          </div>
          <p className="copy">© 2026 MedicGet.io — Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
