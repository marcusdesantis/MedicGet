/**
 * TermsPage - "Terminos y condiciones de uso".
 *
 * Pagina publica (no requiere login) accesible desde la landing y el
 * footer. Explica el modelo de negocio "registro gratuito + comision
 * por consulta", el % vigente, y los derechos/responsabilidades de
 * pacientes y profesionales.
 *
 * El % se lee dinamicamente de /api/v1/public/commission para que el
 * superadmin lo pueda ajustar desde /admin/settings sin redeploy.
 */
import { Link } from 'react-router-dom';
import { Activity, ArrowLeft } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { publicCommissionApi } from '@/lib/api';

export function TermsPage() {
  const { state } = useApi(() => publicCommissionApi.get(), []);
  const pct =
    state.status === 'ready' ? state.data.commissionPct.toFixed(0) : '15';

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top bar minimalista (sin el sticky de la landing - es una pagina legal) */}
      <header className="border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <Activity size={18} strokeWidth={2.5} />
            </span>
            <span className="font-semibold tracking-tight text-[15px]">MedicGet</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
          >
            <ArrowLeft size={14} /> Volver
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 lg:px-8 py-12 lg:py-20">
        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3 uppercase tracking-wider">
          Legal
        </p>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
          Terminos y condiciones de uso
        </h1>
        <p className="mt-4 text-slate-500 dark:text-slate-400">
          Ultima actualizacion: {new Date().toLocaleDateString('es-ES', {
            day: '2-digit', month: 'long', year: 'numeric',
          })}
        </p>

        <div className="prose prose-slate dark:prose-invert mt-10 max-w-none">
          {/* ── 1. Modelo de servicio ─────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">1. Modelo de servicio</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            MedicGet (en adelante, <strong>la plataforma</strong>) es un
            servicio en linea que conecta pacientes con medicos y clinicas
            para reservar y atender consultas medicas, ya sea por
            videollamada, chat o en consultorio. El registro y el uso
            cotidiano de la plataforma son <strong>100% gratuitos</strong>
            para los tres tipos de usuario (paciente, medico, clinica).
            No existen planes pagos, ni mensualidades, ni limites por
            funcionalidad: todas las herramientas estan habilitadas para
            cualquier cuenta verificada.
          </p>

          {/* ── 2. Comision por consulta ─────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">
            2. Comision por consulta
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            La plataforma se sostiene a traves de una <strong>comision
            del {pct}%</strong> aplicada sobre el monto de cada consulta
            efectivamente cobrada. Este porcentaje es publicado en la
            landing y aqui mismo (puede ser actualizado por la
            administracion en cualquier momento; el valor vigente
            siempre es el que aparece en este documento).
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
            El cobro al paciente se realiza por el <strong>precio integro
            publicado por el medico</strong> (sin recargos por parte de
            la plataforma). Por ejemplo: si el medico publica una
            consulta a $20, el paciente paga $20 netos. La comision
            del {pct}% sale luego de la facturacion del medico con la
            plataforma, no del bolsillo del paciente.
          </p>

          {/* ── 3. Liquidacion offline ───────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">
            3. Liquidacion entre medico y plataforma
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            La contabilidad interna del app refleja el cobro completo
            como ingreso del medico. La liquidacion del {pct}%
            correspondiente a la plataforma se acuerda de forma
            <strong> manual y periodica</strong>, fuera del sistema, entre
            el equipo administrativo de MedicGet y cada profesional. Al
            registrarse como medico o clinica, el usuario acepta este
            modelo de liquidacion offline.
          </p>

          {/* ── 4. Responsabilidad medica ────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">
            4. Responsabilidad clinica
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            MedicGet es una plataforma tecnologica de intermediacion. No
            ejerce la medicina ni provee servicios de salud directamente.
            Las decisiones clinicas, diagnosticos, prescripciones y
            cualquier acto medico son responsabilidad exclusiva del
            profesional habilitado que atiende la consulta. El paciente
            es responsable de verificar la matricula del medico antes de
            reservar (publicada en cada perfil).
          </p>

          {/* ── 5. Datos personales ──────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">
            5. Datos personales y privacidad
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Los datos de pacientes (incluyendo historia clinica, motivos
            de consulta y conversaciones de chat) se almacenan cifrados
            en transito y en reposo. Solo son accesibles para el
            paciente, el medico tratante y, cuando corresponde, la
            clinica del medico. Para mas detalle, ver nuestra Politica
            de Privacidad.
          </p>

          {/* ── 6. Cancelaciones y reembolsos ────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">
            6. Cancelaciones y reembolsos
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Tanto pacientes como medicos pueden cancelar una cita desde
            su panel. Las politicas de reembolso dependen del tiempo
            restante hasta la cita y son configurables por cada clinica.
            En caso de no-show del medico, el paciente recibe reembolso
            integro.
          </p>

          {/* ── 7. Cambios a los terminos ────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">
            7. Cambios a estos terminos
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            MedicGet puede actualizar estos terminos en cualquier momento.
            Los cambios significativos se comunican por correo a los
            usuarios registrados con al menos 7 dias de anticipacion. El
            % de comision vigente siempre se muestra en este documento.
          </p>

          {/* ── 8. Contacto ──────────────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">8. Contacto</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Para consultas, reclamos o solicitudes legales, escribinos a{' '}
            <a
              href="mailto:soportemedicget@abisoft.it"
              className="text-blue-600 hover:underline"
            >
              soportemedicget@abisoft.it
            </a>.
          </p>
        </div>

        <div className="mt-16 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Al crear una cuenta en MedicGet, declaras haber leido y
            aceptado estos terminos.
          </p>
          <Link
            to="/register"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-sm font-semibold transition"
          >
            Crear mi cuenta
          </Link>
        </div>
      </article>
    </div>
  );
}
