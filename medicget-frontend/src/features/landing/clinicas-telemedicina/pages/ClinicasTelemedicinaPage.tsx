import { useEffect, useState } from 'react';
import { useSeoMeta } from '@/hooks/useSeoMeta';
import './clinicas-telemedicina.css';

export function ClinicasTelemedicinaPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  useSeoMeta({
    title: 'Telemedicina para Clínicas | Digitaliza tu Centro Médico — MedicGet',
    description: 'Potencia tu clínica con telemedicina. Gestión de pacientes, médicos y consultas virtuales en una sola plataforma. Más de 600 clínicas digitalizadas en Ecuador.',
    canonical: 'https://medicget.io/clinicas-telemedicina',
    ogImage: 'https://medicget.io/landing/clinica.png',
    keywords: 'clínicas telemedicina, digitalizar clínica, software clínica médica, gestión clínica online Ecuador, plataforma clínicas',
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
      const step = target / 55;
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

  return (
    <div className="clinicas-landing">
      <header>
        <div className="container nav">
          <a href="https://medicget.io/" className="brand">
            <span className="logo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"/></svg>
            </span>
            MedicGet<span style={{ color: 'var(--cyan-500)' }}>.io</span>
          </a>
          <nav>
            <ul className={`nav-links${menuOpen ? ' show' : ''}`}>
              <li><a href="https://medicget.io/" className="active">Inicio</a></li>
              <li><a href="#servicios" onClick={() => setMenuOpen(false)}>Servicios</a></li>
              <li><a href="#beneficios" onClick={() => setMenuOpen(false)}>Sobre Nosotros</a></li>
              <li><a href="#blog" onClick={() => setMenuOpen(false)}>Blog</a></li>
            </ul>
          </nav>
          <div className="nav-cta">
            <a href="/register" className="btn-reg">Registrarse</a>
            <button className="burger" onClick={() => setMenuOpen(m => !m)} aria-label="Menú">
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow" style={{ color: '#7fc0f5' }}>Para centros médicos</span>
            <h1>Potencia tu Clínica con la Telemedicina</h1>
            <p className="lead">Digitaliza tu centro médico y conecta con más pacientes de forma eficiente.</p>
            <a href="/register" className="btn btn-cyan" style={{ fontSize: '1.08rem', padding: '1rem 2rem' }}>Registra tu Clínica →</a>
          </div>
          <div className="hero-art">
            <div className="dash">
              <img src="/landing/clinica.png" alt="Doctora clínica" />
            </div>
            <div className="chip chip-1">
              <span className="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 17l5-5 4 3 6-7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
              +42% reservas
            </div>
            <div className="chip chip-2">
              <span className="ic" style={{ background: 'var(--blue-600)' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3l8 3v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/></svg></span>
              Datos seguros
            </div>
          </div>
        </div>
      </section>

      <section className="services" id="servicios">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">¿Eres una clínica?</span>
            <h2>Optimiza tu atención médica con nosotros</h2>
          </div>
          <div className="svc-img">
            <img src="/landing/clinica2.png" alt="Gestión de Pacientes, Manejo de Doctores, Consultas Virtuales" />
          </div>
        </div>
      </section>

      <section className="benefits" id="beneficios">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Resultados reales</span>
            <h2>Beneficios para tu Clínica</h2>
          </div>
          <div className="ben-img">
            <img src="/landing/clinica3.png" alt="Aumenta tus Reservas, Plataforma Segura, Reportes y Analíticas" />
          </div>
        </div>
      </section>

      <section className="stats">
        <div className="container stats-grid">
          <div className="stat"><div className="v" data-count="600" data-suffix="+">0</div><div className="l">Clínicas digitalizadas</div></div>
          <div className="stat"><div className="v" data-count="42" data-suffix="%">0</div><div className="l">Más reservas</div></div>
          <div className="stat"><div className="v" data-count="99" data-suffix="%">0</div><div className="l">Disponibilidad</div></div>
          <div className="stat"><div className="v" data-count="24" data-suffix="/7">0</div><div className="l">Soporte técnico</div></div>
        </div>
      </section>

      <section className="cta" id="registro">
        <div className="container">
          <h2>¿Listo para digitalizar tu clínica?</h2>
          <p>Únete hoy a MedicGet.io y lleva tu centro médico al siguiente nivel.</p>
          <a href="/register" className="btn btn-orange" style={{ padding: '1.05rem 2.4rem', fontSize: '1.1rem' }}>Registrar Ahora</a>
        </div>
      </section>

      <footer id="blog">
        <div className="container">
          <div className="foot-grid">
            <div className="foot-brand">
              <a href="https://medicget.io/" className="brand">
                <span className="logo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"/></svg></span>
                MedicGet<span style={{ color: 'var(--cyan-500)' }}>.io</span>
              </a>
              <p>La plataforma todo en uno para digitalizar y hacer crecer tu centro médico.</p>
              <div className="socials">
                <a href="#" aria-label="Facebook"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3V6h-3c-2 0-3 1-3 3v2H8v3h3v7h3v-7h3l1-3h-4V9c0-.5.4-1 1-1z"/></svg></a>
                <a href="#" aria-label="Twitter"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22 5.8c-.7.3-1.5.5-2.3.6.8-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1A4 4 0 0012 8.7c0 .3 0 .6.1.9-3.3-.2-6.3-1.8-8.3-4.3-.4.6-.5 1.3-.5 2 0 1.4.7 2.6 1.8 3.3-.7 0-1.3-.2-1.8-.5v.1c0 1.9 1.4 3.5 3.2 3.9-.3.1-.7.1-1 .1l-.7-.1c.5 1.6 2 2.7 3.7 2.7A8 8 0 012 19.5a11.3 11.3 0 006.1 1.8c7.3 0 11.4-6.1 11.4-11.4v-.5c.8-.6 1.5-1.3 2-2.1z"/></svg></a>
                <a href="#" aria-label="LinkedIn"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6.9 8.5H4V20h2.9V8.5zM5.4 4a1.7 1.7 0 100 3.4 1.7 1.7 0 000-3.4zM20 20h-2.9v-6c0-1.4-.5-2.4-1.8-2.4-1 0-1.5.7-1.8 1.3 0 .2-.1.5-.1.8V20H9.6V8.5h2.8v1.6c.4-.6 1.1-1.5 2.6-1.5 1.9 0 3.3 1.2 3.3 3.9V20z"/></svg></a>
                <a href="#" aria-label="Email"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="2"/></svg></a>
              </div>
            </div>
            <div><h4>Enlaces</h4><ul><li><a href="#">Inicio</a></li><li><a href="#servicios">Servicios</a></li><li><a href="#beneficios">Sobre Nosotros</a></li><li><a href="#blog">Blog</a></li></ul></div>
            <div><h4>Soporte</h4><ul><li><a href="#">Preguntas Frecuentes</a></li><li><a href="#">Contáctanos</a></li></ul></div>
            <div><h4>Legal</h4><ul><li><a href="/terminos">Términos</a></li><li><a href="/privacidad">Privacidad</a></li></ul></div>
          </div>
          <p className="copy">© 2026 MedicGet.io — Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
