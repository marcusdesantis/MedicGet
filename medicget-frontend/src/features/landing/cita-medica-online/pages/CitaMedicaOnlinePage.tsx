import { useEffect, useRef, useState } from 'react';
import { useSeoMeta } from '@/hooks/useSeoMeta';
import './cita-medica-online.css';

export function CitaMedicaOnlinePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useSeoMeta({
    title: 'Cita Médica Online Rápida y Segura | MedicGet',
    description: 'Agenda tu cita médica online con especialistas certificados desde casa. Consulta por videollamada, pago seguro y atención inmediata. MedicGet Ecuador.',
    canonical: 'https://medicget.io/cita-medica-online',
    ogImage: 'https://medicget.io/landing/paciente1.png',
    keywords: 'cita médica online, consulta médica virtual, médico online Ecuador, agendar cita médico, telemedicina pacientes',
  });

  const slides = [
    {
      name: 'Carlos M.',
      text: '"Excelente servicio. Pude agendar una consulta en minutos y el doctor fue muy profesional y atento."',
      avatarBg: '#d7e6f7', skinColor: '#b9855f', clothColor: '#5d6b82',
    },
    {
      name: 'Daniela R.',
      text: '"Me atendieron desde casa sin tener que esperar. El pago fue seguro y todo muy claro. ¡Lo recomiendo!"',
      avatarBg: '#dcf0e3', skinColor: '#e2b48f', clothColor: '#3cb960',
    },
    {
      name: 'Andrés P.',
      text: '"Práctico y rápido. Encontré un especialista disponible el mismo día. La videollamada se vio perfecta."',
      avatarBg: '#e7eefc', skinColor: '#caa07a', clothColor: '#2f6fd0',
    },
  ];

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => { document.documentElement.style.scrollBehavior = ''; };
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setActiveSlide(i => (i + 1) % slides.length);
    }, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [slides.length]);

  const goToSlide = (i: number) => {
    setActiveSlide(i);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveSlide(idx => (idx + 1) % slides.length);
    }, 5000);
  };

  return (
    <div className="pacientes-landing">
      <header>
        <div className="container nav">
          <a href="https://medicget.io/" className="brand">
            <span className="logo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"/></svg>
            </span>
            MedicGet<span className="io">.io</span>
          </a>
          <nav>
            <ul className={`nav-links${menuOpen ? ' show' : ''}`}>
              <li><a href="https://medicget.io/" className="active">Inicio</a></li>
              <li><a href="#servicios" onClick={() => setMenuOpen(false)}>Servicios</a></li>
              <li><a href="#nosotros" onClick={() => setMenuOpen(false)}>Sobre Nosotros</a></li>
              <li><a href="#contacto" onClick={() => setMenuOpen(false)}>Contacto</a></li>
            </ul>
          </nav>
          <div className="nav-cta">
            <a href="/login" className="btn-login">Ingresar</a>
            <button className="burger" onClick={() => setMenuOpen(m => !m)} aria-label="Menú">
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow" style={{ color: '#bfe0ff' }}>Tu salud, a un clic</span>
            <h1>Atención Médica Online Rápida y Segura</h1>
            <p className="lead">Agenda tu cita con médicos certificados desde la comodidad de tu hogar.</p>
            <a href="/register" className="btn btn-green" style={{ fontSize: '1.08rem', padding: '1rem 2rem' }}>Regístrate Ahora →</a>
          </div>
          <div className="hero-art">
            <div className="photo-card">
              <img src="/landing/paciente1.png" alt="Doctora atendiendo paciente online" />
            </div>
            <div className="chip chip-1">
              <span className="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
              Médicos certificados
            </div>
            <div className="chip chip-2">
              <span className="ic" style={{ background: 'var(--blue-500)' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="11" rx="2" stroke="#fff" strokeWidth="2"/><path d="M8 21h8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg></span>
              Consulta por video
            </div>
          </div>
        </div>
      </section>

      <section className="trust" id="servicios">
        <div className="container trust-grid">
          <div className="trust-item t1">
            <span className="tic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></span>
            <div><h3>Fácil y Rápido</h3><p>Reserva tu cita en minutos.</p></div>
          </div>
          <div className="trust-item t2">
            <span className="tic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 3l8 3v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
            <div><h3>Pago Seguro</h3><p>Paga en línea de forma segura.</p></div>
          </div>
          <div className="trust-item t3">
            <span className="tic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H8l-4 4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg></span>
            <div><h3>Consulta Virtual</h3><p>Atiende por videollamada.</p></div>
          </div>
        </div>
      </section>

      <section className="how">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Simple y transparente</span>
            <h2>Cómo Funciona</h2>
            <p>De la reserva a la consulta en cuatro pasos.</p>
          </div>
          <div className="steps-img">
            <img src="/landing/paciente2.png" alt="Pasos: Regístrate, Elige tu médico, Realiza tu pago, Consulta en línea" />
          </div>
        </div>
      </section>

      <section className="testi" id="nosotros">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Confianza real</span>
            <h2>Opiniones de Nuestros Pacientes</h2>
          </div>
          <div className="testi-track">
            {slides.map((slide, i) => (
              <div key={i} className={`testi-slide${activeSlide === i ? ' active' : ''}`}>
                <div className="testi-avatar">
                  <svg viewBox="0 0 96 96">
                    <rect width="96" height="96" fill={slide.avatarBg}/>
                    <circle cx="48" cy="38" r="20" fill={slide.skinColor}/>
                    <path d="M16 96c0-20 14-30 32-30s32 10 32 30z" fill={slide.clothColor}/>
                  </svg>
                </div>
                <div>
                  <div className="stars">★★★★★</div>
                  <p className="testi-q">{slide.text}</p>
                  <div className="testi-name">— {slide.name}</div>
                </div>
              </div>
            ))}
            <div className="dots">
              {slides.map((_, i) => (
                <button key={i} className={activeSlide === i ? 'active' : ''} onClick={() => goToSlide(i)} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="cta" id="registro">
        <div className="container">
          <h2>Cuida tu salud sin salir de casa. ¡Regístrate hoy y agenda tu cita médica online!</h2>
          <a href="/register" className="btn btn-green" style={{ padding: '1.05rem 2.4rem', fontSize: '1.1rem' }}>Comienza Ahora</a>
        </div>
      </section>

      <footer id="contacto">
        <div className="container">
          <div className="foot-grid">
            <div className="foot-brand">
              <a href="https://medicget.io/" className="brand">
                <span className="logo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"/></svg></span>
                MedicGet<span className="io">.io</span>
              </a>
              <p>Atención médica online con especialistas certificados, cuando y donde la necesites.</p>
              <div className="socials">
                <a href="#" aria-label="Facebook"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3V6h-3c-2 0-3 1-3 3v2H8v3h3v7h3v-7h3l1-3h-4V9c0-.5.4-1 1-1z"/></svg></a>
                <a href="#" aria-label="Twitter"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22 5.8c-.7.3-1.5.5-2.3.6.8-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1A4 4 0 0012 8.7c0 .3 0 .6.1.9-3.3-.2-6.3-1.8-8.3-4.3-.4.6-.5 1.3-.5 2 0 1.4.7 2.6 1.8 3.3-.7 0-1.3-.2-1.8-.5v.1c0 1.9 1.4 3.5 3.2 3.9-.3.1-.7.1-1 .1l-.7-.1c.5 1.6 2 2.7 3.7 2.7A8 8 0 012 19.5a11.3 11.3 0 006.1 1.8c7.3 0 11.4-6.1 11.4-11.4v-.5c.8-.6 1.5-1.3 2-2.1z"/></svg></a>
                <a href="#" aria-label="Instagram"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/></svg></a>
              </div>
            </div>
            <div><h4>Enlaces Rápidos</h4><ul><li><a href="#">Inicio</a></li><li><a href="#servicios">Servicios</a></li><li><a href="#nosotros">Sobre Nosotros</a></li><li><a href="#contacto">Contacto</a></li></ul></div>
            <div><h4>Soporte</h4><ul><li><a href="#">Preguntas Frecuentes</a></li><li><a href="#">Ayuda</a></li></ul></div>
            <div><h4>Legal</h4><ul><li><a href="/terminos">Términos y Condiciones</a></li><li><a href="/privacidad">Privacidad</a></li></ul></div>
          </div>
          <p className="copy">© 2026 MedicGet.io — Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
