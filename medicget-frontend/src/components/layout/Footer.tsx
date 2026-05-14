import { useAppConfig } from '@/hooks/useAppConfig';

/**
 * Footer público — muestra nombre, copyright, versión y soporte
 * leyendo `/app.json` via useAppConfig. Single-source para que el
 * branding se actualice en un solo lugar.
 */
export const Footer = () => {
  const { name, version, company, support } = useAppConfig();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <p>
          © {year} {name}
          {company && <span className="ml-1 opacity-70">· {company}</span>}
        </p>
        <p className="flex items-center gap-3">
          {support?.email && (
            <a
              href={`mailto:${support.email}`}
              className="hover:text-slate-700 dark:hover:text-slate-200 transition"
            >
              {support.email}
            </a>
          )}
          <span className="font-mono opacity-70" title="Versión de la app">v{version}</span>
        </p>
      </div>
    </footer>
  );
};
