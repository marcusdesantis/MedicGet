import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import "react-phone-input-2/lib/style.css";

import './index.css';
import "leaflet/dist/leaflet.css";

const container = document.getElementById('root');
if (!container) throw new Error('Root container not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Registrar el Service Worker para Web Push. Si el browser no lo soporta
// (Safari iOS <16.4, navegadores viejos) sale silencioso. La suscripción
// real se dispara cuando el usuario activa el toggle desde la campanita.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[SW] registration failed:', err);
      });
  });
}
