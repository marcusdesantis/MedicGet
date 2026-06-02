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
          {/* ── 1. Quiénes somos ─────────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">1. Quiénes somos</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            MedicGet (en adelante, <strong>la plataforma</strong>) es un
            servicio operado por Abisoft que conecta pacientes con médicos
            y clínicas para reservar y atender consultas médicas online,
            por chat o presenciales. Al registrarte y usar la plataforma,
            aceptás estos Términos de Uso y la{' '}
            <Link to="/privacidad" className="text-blue-600 hover:underline">
              Política de Privacidad
            </Link>.
          </p>

          {/* ── 2. Modelo de servicio ────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">2. Modelo de servicio</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            El registro y uso cotidiano de la plataforma son{' '}
            <strong>100% gratuitos</strong> para los tres tipos de usuario
            (paciente, médico, clínica). No hay planes pagos, mensualidades
            ni límites por funcionalidad. La plataforma se sostiene con una
            comisión sobre las consultas cobradas.
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
            MedicGet es una plataforma <strong>tecnológica de intermediación</strong>.
            No presta servicios de salud por sí misma: las consultas las
            brindan los médicos habilitados que se registran. Las
            decisiones clínicas, diagnósticos, prescripciones y todo acto
            médico son responsabilidad exclusiva del profesional tratante.
          </p>

          {/* ── 3. Verificación de médicos ──────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">
            3. Verificación de habilitación profesional
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Los médicos solo pueden aparecer en búsqueda y recibir citas
            tras pasar un <strong>proceso de verificación de licencia</strong>:
          </p>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3 list-disc pl-6 space-y-1">
            <li>Cargan número de licencia / colegiatura, autoridad emisora, cédula y un documento (foto del título o credencial).</li>
            <li>La plataforma intenta verificar automáticamente la habilitación contra el registro de <strong>ACESS</strong> (Agencia de Aseguramiento de la Calidad de los Servicios de Salud, Ecuador) por cédula.</li>
            <li>Si la verificación automática no concluye, el equipo administrativo revisa el documento manualmente (24–48 h hábiles).</li>
            <li>Hasta no estar verificado, el médico <strong>no aparece en la búsqueda pública</strong> ni puede recibir reservas.</li>
          </ul>

          {/* ── 4. Pagos y comisión ──────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">
            4. Pagos, comisión y facturación
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            El paciente paga el <strong>precio íntegro publicado por el médico</strong>{' '}
            (sin recargos de la plataforma). Por ejemplo: si el médico publica
            una consulta a $20, el paciente paga $20 netos. La{' '}
            <strong>comisión del {pct}%</strong> sale luego de la facturación
            con el profesional, no del bolsillo del paciente.
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
            Los cobros se procesan a través de <strong>PayPhone</strong>
            (procesador autorizado en Ecuador). MedicGet no almacena datos
            de tarjeta de crédito: esa información la procesa directamente
            PayPhone bajo su propia política. La liquidación de la comisión
            con cada profesional se acuerda de forma manual y periódica,
            fuera del sistema.
          </p>

          {/* ── 5. Cancelaciones y reembolsos ───────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">
            5. Política de cancelación y reembolsos
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Tanto pacientes como clínicas pueden cancelar una cita desde
            su panel. La política de reembolso es:
          </p>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3 list-disc pl-6 space-y-1">
            <li><strong>Paciente cancela con 24 h o más de anticipación</strong> → reembolso del 100 % al mismo medio de pago.</li>
            <li><strong>Paciente cancela con menos de 24 h</strong> → la cancelación se hace, pero <strong>no aplica reembolso</strong>.</li>
            <li><strong>Cancela la clínica</strong> → reembolso del 100 % sin importar el tiempo restante.</li>
          </ul>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
            Cuando corresponde, el reembolso se procesa al mismo medio de
            pago en un plazo de <strong>3 a 5 días hábiles</strong>. El
            procesamiento del reverso en la pasarela puede requerir acción
            manual del equipo administrativo; mientras tanto el estado de
            tu pago figura como "Reembolso en proceso" en tu panel.
          </p>

          {/* ── 6. Videollamadas y chat ─────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">
            6. Videollamadas y mensajes
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Las consultas online se realizan mediante <strong>Jitsi Meet
            auto-hospedado</strong> en infraestructura de MedicGet
            (meet.medicget.io). No se requiere registrarse en ningún
            servicio externo para iniciar o unirse. La plataforma{' '}
            <strong>no graba ni almacena las videollamadas</strong>.
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
            Las consultas por chat (modalidad CHAT) se guardan asociadas a
            la cita correspondiente para que el paciente y el médico puedan
            volver a leerlas como parte del historial clínico.
          </p>

          {/* ── 7. Obligaciones del usuario ─────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">7. Obligaciones del usuario</h2>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3 list-disc pl-6 space-y-1">
            <li>Brindar información veraz y mantenerla actualizada.</li>
            <li>Verificar tu correo electrónico antes de poder iniciar sesión.</li>
            <li>No compartir tu contraseña ni el link de tu videollamada con terceros ajenos a la consulta.</li>
            <li>Respeto mutuo en el chat y la videollamada — la plataforma se reserva el derecho de suspender cuentas ante conductas inapropiadas.</li>
            <li>Para médicos: mantener vigente la habilitación profesional y notificar cualquier cambio.</li>
          </ul>

          {/* ── 8. Privacidad ────────────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">8. Privacidad de tus datos</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Los datos personales y de salud (historia clínica, alergias,
            medicación, motivo de consulta, chats) se almacenan cifrados
            en tránsito (HTTPS) y se aplican controles de acceso por rol.
            Solo el paciente, el médico tratante y, cuando corresponde,
            la clínica del médico, pueden ver los datos clínicos de cada
            consulta. El detalle está en la{' '}
            <Link to="/privacidad" className="text-blue-600 hover:underline">
              Política de Privacidad
            </Link>.
          </p>

          {/* ── 9. Cambios a los términos ───────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">
            9. Cambios a estos términos
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            MedicGet puede actualizar estos términos. Los cambios
            significativos se comunican por correo a los usuarios
            registrados y pueden requerir un re-consent al iniciar sesión.
            El % de comisión vigente siempre se muestra en este documento.
          </p>

          {/* ── 10. Contacto y reclamos ─────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">10. Contacto</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Para consultas, reclamos, solicitudes legales o ejercicio de
            derechos sobre tus datos, escribinos a{' '}
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
