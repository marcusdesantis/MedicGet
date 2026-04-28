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
