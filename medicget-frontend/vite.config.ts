import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Headers HTTP enviados con cada respuesta del dev server.
    // PayPhone Cajita exige `Referrer-Policy: origin` (o
    // `origin-when-cross-origin`) para verificar la identidad del
    // sitio al cargar el modal — sin esto su validación falla
    // silenciosamente y el modal no renderiza. La meta tag del HTML
    // no siempre es suficiente porque algunos UAs respetan solo el
    // header HTTP.
    headers: {
      'Referrer-Policy': 'origin',
    },
  },
});
