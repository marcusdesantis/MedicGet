/**
 * useAppConfig — carga `/app.json` desde el root del frontend y expone
 * nombre/logo/versión/etc para que cualquier parte del UI los muestre.
 *
 * El JSON vive en `public/app.json` y se fetchea una sola vez por
 * pestaña (cache en módulo). Como es un asset estático, el browser
 * lo cachea via HTTP normalmente.
 *
 *   import { useAppConfig } from '@/hooks/useAppConfig';
 *
 *   function Brand() {
 *     const { name, logoUrl } = useAppConfig();
 *     return <><img src={logoUrl}/> {name}</>;
 *   }
 *
 * Mientras el fetch está en curso devuelve un fallback inmediato para
 * evitar flicker — usar el SSR-ish "first-paint" con los valores que
 * ya conocemos.
 */

import { useEffect, useState } from 'react';

export interface AppConfig {
  name:        string;
  shortName:   string;
  description: string;
  logoUrl:     string;
  version:     string;
  support?: {
    email?:   string;
    website?: string;
  };
  company?: string;
}

/** Valores por defecto — match con `public/app.json` para evitar flash. */
const FALLBACK: AppConfig = {
  name:        'MedicGet',
  shortName:   'MedicGet',
  description: 'Plataforma de agendamiento médico.',
  logoUrl:     '/logo.svg',
  version:     '1.0.0',
  company:     'Abisoft',
};

let cached: AppConfig | null = null;
let inflight: Promise<AppConfig> | null = null;

async function loadAppConfig(): Promise<AppConfig> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch('/app.json', { cache: 'force-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Partial<AppConfig>;
      cached = { ...FALLBACK, ...data };
      return cached;
    } catch {
      // Si el fetch falla por cualquier motivo (404 en dev, CORS raro, etc.)
      // devolvemos los defaults — la app no debe romper por esto.
      cached = FALLBACK;
      return cached;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function useAppConfig(): AppConfig {
  const [cfg, setCfg] = useState<AppConfig>(cached ?? FALLBACK);

  useEffect(() => {
    let cancelled = false;
    void loadAppConfig().then((c) => {
      if (!cancelled) setCfg(c);
    });
    return () => { cancelled = true; };
  }, []);

  return cfg;
}
