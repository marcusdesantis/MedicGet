import { AlertCircle, Loader2, RefreshCw, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { ApiErrorInfo } from "@/hooks/useApi";

/**
 * Skeleton render while a dashboard is fetching its initial data.
 * Mirrors the typical "stat cards row + content rows" layout so the
 * page doesn't visually shift when data arrives.
 */
export function DashboardLoading({ label = "Cargando panel..." }: { label?: string }) {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-1/3 rounded-lg bg-slate-200 dark:bg-slate-800" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="h-72 rounded-2xl bg-slate-100 dark:bg-slate-800 xl:col-span-2" />
        <div className="h-72 rounded-2xl bg-slate-100 dark:bg-slate-800" />
      </div>
      <p className="sr-only">{label}</p>
      <div className="flex justify-center pt-4 text-slate-400">
        <Loader2 size={16} className="animate-spin" />
      </div>
    </div>
  );
}

/**
 * Friendly error panel for dashboards. Maps known backend codes to specific
 * copy (e.g. NOT_FOUND for the doctor flow → "Completa tu perfil profesional")
 * so users land on something actionable instead of a stack trace.
 */
export function DashboardError({
  error, onRetry, role,
}: {
  error:  ApiErrorInfo;
  onRetry: () => void;
  role?:   "patient" | "doctor" | "clinic";
}) {
  const isMissingProfile = error.code === "NOT_FOUND";
  const title = isMissingProfile && role === "doctor"
    ? "Completa tu perfil profesional"
    : "No pudimos cargar tu panel";

  const description = isMissingProfile && role === "doctor"
    ? "Tu cuenta de médico está creada, pero todavía falta asociarla con una clínica y completar tu información profesional. Mientras tanto no podemos mostrar tu agenda."
    : isMissingProfile && role === "clinic"
      ? "No encontramos tu clínica. Verifica que el registro se haya completado correctamente."
      : error.message;

  return (
    <div className="max-w-xl mx-auto mt-12 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-6 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 mb-4">
        <AlertCircle size={22} />
      </div>
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{description}</p>
      {error.code && (
        <p className="mt-3 text-[11px] text-slate-400 font-mono">
          {error.status ?? "—"} · {error.code}
        </p>
      )}

      <div className="mt-5 flex items-center justify-center gap-3">
        {/* Primary CTA depends on the case: doctor with no profile → setup,
            anything else → retry. */}
        {isMissingProfile && role === "doctor" ? (
          <Link
            to="/doctor/setup"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 transition"
          >
            Completar mi perfil <ArrowRight size={14} />
          </Link>
        ) : (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium px-4 py-2 transition"
          >
            <RefreshCw size={14} /> Reintentar
          </button>
        )}
      </div>
    </div>
  );
}
