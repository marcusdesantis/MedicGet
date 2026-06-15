/**
 * TermsPage — Términos y Condiciones de uso de MedicGet.
 *
 * Cumple con:
 *   - Google Play Store — Developer Program Policies (apps de salud)
 *   - Ley Orgánica de Protección de Datos Personales de Ecuador (LOPDP, 2021)
 *   - Ley Orgánica de Defensa del Consumidor (Ecuador)
 *   - Código Civil del Ecuador (responsabilidad, contratos)
 *   - Constitución Política del Estado de Bolivia, Art. 130 (Habeas Data)
 *   - Ley N° 164 General de Telecomunicaciones, TIC de Bolivia (2011)
 *   - Ley N° 453 General de los Derechos de las Usuarias y los Usuarios y de
 *     las Consumidoras y los Consumidores de Bolivia
 *
 * Fecha de última actualización: 15 de junio de 2026.
 * IMPORTANTE: actualizar esta fecha manualmente cada vez que se modifique
 * el contenido — NO usar new Date().
 */

import { Link } from 'react-router-dom';
import { Activity, ArrowLeft } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { publicCommissionApi } from '@/lib/api';

const LAST_UPDATED = '15 de junio de 2026';
const CONTACT_EMAIL = 'soportemedicget@abisoft.it';

export function TermsPage() {
  const { state } = useApi(() => publicCommissionApi.get(), []);
  const pct =
    state.status === 'ready' ? state.data.commissionPct.toFixed(0) : '15';

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top bar */}
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
          Términos y Condiciones de uso
        </h1>
        <p className="mt-4 text-slate-500 dark:text-slate-400">
          Última actualización: <strong>{LAST_UPDATED}</strong>
        </p>

        {/* Aviso emergencias — obligatorio para apps de salud en Google Play */}
        <div className="mt-8 p-5 rounded-2xl border-2 border-red-400 dark:border-red-700 bg-red-50 dark:bg-red-900/20">
          <p className="text-sm font-bold text-red-700 dark:text-red-400 mb-1">
            🚨 AVISO IMPORTANTE — NO USAR EN EMERGENCIAS MÉDICAS
          </p>
          <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed">
            MedicGet <strong>NO es un servicio de emergencias médicas</strong>.
            Si vos o alguien a tu alrededor está en peligro de vida, llamá de
            inmediato al número de emergencias de tu localidad y acudí al
            servicio de urgencias más cercano:
          </p>
          <ul className="text-sm text-red-700 dark:text-red-400 leading-relaxed list-disc pl-6 mt-2 space-y-1">
            <li><strong>Ecuador:</strong> 911 (emergencias unificadas)</li>
            <li><strong>Bolivia:</strong> 110 (Policía Nacional) · 118 (Ambulancias / Cruz Roja) · 119 (Bomberos)</li>
          </ul>
          <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed mt-2">
            La plataforma está diseñada para consultas médicas programadas, no
            para situaciones de riesgo vital inmediato.
          </p>
        </div>

        <div className="prose prose-slate dark:prose-invert mt-10 max-w-none">

          {/* ── 1. Partes y aceptación ────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">1. Partes y aceptación de los términos</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            El presente documento regula la relación entre{' '}
            <strong>Abisoft</strong>, operador de MedicGet (en adelante,{' '}
            <strong>"la plataforma"</strong> o <strong>"MedicGet"</strong>), y
            cualquier persona —física o jurídica— que se registre o use la
            plataforma en su rol de <strong>paciente</strong>,{' '}
            <strong>médico</strong> o <strong>clínica</strong> (en adelante,{' '}
            <strong>"el usuario"</strong>).
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
            Al crear una cuenta, marcás el casillero de aceptación o usás la
            plataforma, declarás haber leído, comprendido y aceptado estos
            Términos y la{' '}
            <Link to="/privacidad" className="text-blue-600 hover:underline">
              Política de Privacidad
            </Link>
            {' '}en su versión vigente. Si no estás de acuerdo, no debés usar
            MedicGet.
          </p>

          {/* ── 2. Qué es MedicGet ────────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">2. Naturaleza del servicio</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            MedicGet es una <strong>plataforma tecnológica de intermediación</strong> que
            facilita la conexión entre pacientes y profesionales de la salud
            habilitados para agendar y realizar consultas médicas por
            videollamada, chat o de forma presencial.
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
            <strong>MedicGet no ejerce la medicina.</strong> No brinda
            diagnósticos, prescripciones ni tratamientos médicos. Todo acto
            clínico —incluyendo diagnóstico, tratamiento, prescripción de
            medicamentos y derivaciones— es responsabilidad exclusiva del
            profesional de la salud habilitado que atiende la consulta.
            La plataforma actúa como intermediario tecnológico, sin
            intervenir en la relación médico-paciente.
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
            El registro y uso cotidiano de la plataforma son{' '}
            <strong>gratuitos</strong> para los tres tipos de usuario. La
            plataforma se financia con una comisión sobre consultas cobradas.
          </p>

          {/* ── 3. Registro y cuenta ─────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">3. Registro y condiciones de la cuenta</h2>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-2">
            <li>Para registrarte debés tener al menos <strong>18 años</strong>. Al aceptar estos términos declarás ser mayor de edad o actuar como representante legal de un menor.</li>
            <li>Debés proporcionar información veraz, completa y actualizada. La creación de cuentas con datos falsos o para suplantar la identidad de terceros está prohibida y puede derivar en la suspensión inmediata de la cuenta y acciones legales.</li>
            <li>Sos responsable de mantener la confidencialidad de tu contraseña y de todas las acciones realizadas desde tu cuenta.</li>
            <li>Debés verificar tu correo electrónico para activar la cuenta. Hasta tanto, el acceso al servicio es limitado.</li>
            <li>Cada usuario puede tener una sola cuenta activa por rol.</li>
          </ul>

          {/* ── 4. Verificación de médicos ───────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">4. Verificación de habilitación profesional</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Para garantizar la seguridad de los pacientes, todos los médicos
            deben pasar un proceso de verificación antes de aparecer en la
            búsqueda y recibir reservas. El proceso varía según el país:
          </p>

          <h3 className="text-lg font-semibold mt-5 mb-2">Ecuador</h3>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-1">
            <li>El médico carga número de licencia / colegiatura, autoridad emisora, cédula y documento (foto del título o credencial).</li>
            <li>MedicGet consulta automáticamente el registro de <strong>ACESS</strong> (Agencia de Aseguramiento de la Calidad de los Servicios de Salud y Medicina Prepagada). Si el match es inequívoco, la verificación es inmediata.</li>
            <li>Si la verificación automática no concluye, el equipo administrativo revisa el documento manualmente en un plazo de <strong>24 a 48 horas hábiles</strong>.</li>
          </ul>

          <h3 className="text-lg font-semibold mt-5 mb-2">Bolivia</h3>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-1">
            <li>El médico carga número de matrícula profesional, Colegio Médico Departamental de inscripción y documento de respaldo (carnet de colegiatura, título en provisión nacional o resolución de habilitación del Ministerio de Salud y Deportes).</li>
            <li>La verificación es <strong>manual</strong>: el equipo de MedicGet contrasta los datos con el Colegio Médico Departamental correspondiente (COLMEB, COMEB, COMECBA u otro según departamento). Plazo: <strong>24 a 72 horas hábiles</strong>.</li>
            <li>En caso de duda, MedicGet puede solicitar documentación adicional o contactar directamente al Servicio Departamental de Salud (SEDES) competente.</li>
          </ul>

          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-4">
            En ambos países: un médico no verificado <strong>no aparece en la
            búsqueda pública</strong> ni puede recibir reservas. La verificación
            acredita que el profesional presentó documentación aparentemente
            válida al momento del registro. MedicGet no garantiza la vigencia
            continua de la habilitación: es responsabilidad del médico mantener
            su registro al día y notificar cualquier cambio que afecte su
            habilitación.
          </p>

          {/* ── 5. Pagos y comisión ──────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">5. Pagos, comisión y facturación</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            El paciente paga el <strong>precio íntegro publicado por el médico</strong>{' '}
            sin recargos de la plataforma. La{' '}
            <strong>comisión del {pct}%</strong> se descuenta del honorario del
            profesional, no del monto abonado por el paciente.
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
            Los cobros se procesan a través de pasarelas de pago autorizadas
            según el país. MedicGet{' '}
            <strong>no almacena datos de tarjeta de crédito ni débito</strong>:
            esa información la gestiona directamente el procesador de pagos bajo
            su propia política de seguridad. Al efectuar un pago, aceptás
            también los términos y condiciones del procesador correspondiente:
          </p>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-1 mt-2">
            <li><strong>Ecuador:</strong> <strong>PayPhone</strong> — pasarela de pago autorizada por el Banco Central del Ecuador.</li>
            <li><strong>Bolivia:</strong> los métodos de pago disponibles se informan en la app al momento del checkout y pueden variar según el procesador habilitado en tu región.</li>
          </ul>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
            La comisión vigente siempre se refleja en este documento. MedicGet
            notificará con al menos <strong>30 días de anticipación</strong>{' '}
            cualquier cambio al porcentaje.
          </p>

          {/* ── 6. Cancelaciones y reembolsos ───────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">6. Política de cancelación y reembolsos</h2>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-2">
            <li><strong>Paciente cancela con 24 h o más de anticipación:</strong> reembolso del 100% al mismo medio de pago, sin penalidad.</li>
            <li><strong>Paciente cancela con menos de 24 h:</strong> se cancela la cita pero no aplica reembolso; el monto queda como honorario del profesional por reserva del tiempo.</li>
            <li><strong>Médico o clínica cancela:</strong> reembolso del 100% sin importar el tiempo restante. El paciente recibe notificación inmediata.</li>
            <li><strong>No presentación del paciente (no show):</strong> sin reembolso.</li>
            <li><strong>Falla técnica imputable a MedicGet</strong> (p. ej., videollamada caída por problema de infraestructura propia): reembolso del 100%.</li>
          </ul>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
            Los reembolsos se acreditan al mismo medio de pago en un plazo de{' '}
            <strong>3 a 5 días hábiles</strong> desde la aprobación. El estado
            del reembolso es visible en tiempo real en tu panel. Los reclamos
            sobre reembolsos deben presentarse dentro de los{' '}
            <strong>30 días corridos</strong> posteriores a la cita.
          </p>

          {/* ── 7. Videollamadas y chat ─────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">7. Videollamadas y mensajes</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Las consultas online usan <strong>Jitsi Meet auto-hospedado</strong>{' '}
            en infraestructura propia de MedicGet (meet.medicget.io). No se
            requiere cuenta externa. MedicGet{' '}
            <strong>no graba ni almacena las videollamadas</strong>.
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
            Los mensajes de chat de las consultas modalidad CHAT se guardan
            asociados a la cita y son accesibles solo para el paciente, el médico
            y, en su caso, la clínica. El usuario <strong>no debe compartir</strong>{' '}
            el link de la videollamada con personas ajenas a la consulta.
          </p>

          {/* ── 8. Obligaciones y usos prohibidos ───────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">8. Obligaciones del usuario y usos prohibidos</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">Todos los usuarios deben:</p>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-1 mt-2">
            <li>Proporcionar información veraz y mantenerla actualizada.</li>
            <li>Tratar con respeto y dignidad a los demás usuarios y al personal de soporte.</li>
            <li>Proteger la confidencialidad de las consultas médicas.</li>
            <li>Notificar de inmediato cualquier uso no autorizado de su cuenta.</li>
          </ul>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium mt-4">Está expresamente prohibido:</p>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-1 mt-2">
            <li>Usar MedicGet para emergencias médicas que requieran atención inmediata.</li>
            <li>Registrarse con identidad falsa o suplantar a un profesional de la salud.</li>
            <li>Publicar o compartir contenido ilegal, ofensivo, discriminatorio o que viole derechos de terceros.</li>
            <li>Intentar acceder a cuentas, datos o sistemas ajenos.</li>
            <li>Usar la plataforma para actividades fraudulentas, publicidad no solicitada o captación de pacientes fuera de la plataforma con el fin de evadir comisiones.</li>
            <li>Reproducir, modificar o distribuir el software, diseño o contenido de MedicGet sin autorización escrita.</li>
            <li>Aplicar ingeniería inversa, descompilar o intentar extraer el código fuente de la aplicación.</li>
            <li>Usar scripts, bots o medios automatizados para acceder a la plataforma.</li>
          </ul>

          {/* ── 9. Suspensión y terminación de cuenta ───────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">9. Suspensión y terminación de cuenta</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            MedicGet se reserva el derecho de suspender o eliminar una cuenta,
            con o sin previo aviso según la gravedad del caso, ante:
          </p>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-1 mt-3">
            <li>Violación de estos Términos o de la ley aplicable.</li>
            <li>Conducta que ponga en riesgo la seguridad o integridad de otros usuarios.</li>
            <li>Detección de actividad fraudulenta o suplantación de identidad.</li>
            <li>Pérdida o revocación de la habilitación profesional (médicos).</li>
            <li>Inactividad prolongada (más de 24 meses sin actividad).</li>
          </ul>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
            El usuario puede eliminar su propia cuenta en cualquier momento
            desde la sección <strong>Mi perfil</strong> de la app, o solicitándolo
            por correo a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">
              {CONTACT_EMAIL}
            </a>. Los efectos de la eliminación sobre los datos personales
            están detallados en la{' '}
            <Link to="/privacidad" className="text-blue-600 hover:underline">
              Política de Privacidad
            </Link>.
          </p>

          {/* ── 10. Limitación de responsabilidad ───────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">10. Limitación de responsabilidad</h2>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-4">
            <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
              Esta sección es especialmente importante. Leela con atención.
            </p>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            <strong>Respecto de los actos médicos:</strong> MedicGet actúa
            exclusivamente como intermediario tecnológico. No tiene
            responsabilidad alguna por diagnósticos erróneos, tratamientos
            inadecuados, prescripciones incorrectas ni cualquier daño derivado
            del acto médico en sí. La relación médico-paciente y sus
            consecuencias son responsabilidad exclusiva de las partes
            involucradas.
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
            <strong>Respecto de la plataforma:</strong> MedicGet no garantiza
            disponibilidad continua e ininterrumpida del servicio. En la máxima
            medida permitida por la ley, la responsabilidad total de MedicGet
            por cualquier reclamo derivado del uso de la plataforma se limita
            al monto abonado por el usuario en los <strong>3 meses anteriores</strong>{' '}
            al hecho generador del reclamo, o a <strong>USD 100</strong> si no
            hubo pagos en ese período.
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
            <strong>MedicGet no es responsable por:</strong>
          </p>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-1 mt-2">
            <li>Interrupciones del servicio por mantenimiento, fuerza mayor o fallos de terceros (proveedores de internet, servicios cloud, etc.).</li>
            <li>Daños indirectos, incidentales, punitivos o consecuentes derivados del uso o imposibilidad de uso de la plataforma.</li>
            <li>Conductas de usuarios que violen estos Términos o la ley.</li>
            <li>La exactitud o veracidad de la información publicada por los usuarios en sus perfiles.</li>
          </ul>

          {/* ── 11. Propiedad intelectual ────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">11. Propiedad intelectual</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            MedicGet, su logotipo, diseño, código fuente, textos, interfaces y
            demás elementos son propiedad de <strong>Abisoft</strong> y están
            protegidos por las leyes de propiedad intelectual aplicables. Queda
            prohibida su reproducción, distribución o uso sin autorización
            escrita expresa.
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
            El usuario conserva la propiedad de los datos e información que
            carga (fotos de perfil, notas, historia clínica), pero otorga a
            MedicGet una licencia limitada, no exclusiva y revocable para
            procesarlos con el único fin de prestar el servicio.
          </p>

          {/* ── 12. Privacidad ───────────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">12. Privacidad y datos personales</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            El tratamiento de datos personales y de salud se rige por la{' '}
            <Link to="/privacidad" className="text-blue-600 hover:underline">
              Política de Privacidad
            </Link>
            , que forma parte integral de estos Términos. Al aceptar estos
            Términos, aceptás también dicha política.
          </p>

          {/* ── 13. Ley aplicable y jurisdicción ────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">13. Ley aplicable y jurisdicción</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Estos Términos se rigen por la legislación del país desde el cual
            el usuario accede y usa MedicGet:
          </p>

          <h3 className="text-lg font-semibold mt-5 mb-2">Ecuador</h3>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-1">
            <li>Ley Orgánica de Protección de Datos Personales (LOPDP, 2021)</li>
            <li>Ley Orgánica de Defensa del Consumidor</li>
            <li>Código Civil del Ecuador</li>
            <li>Ley de Comercio Electrónico, Firmas Electrónicas y Mensajes de Datos</li>
          </ul>

          <h3 className="text-lg font-semibold mt-5 mb-2">Bolivia</h3>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-1">
            <li>Constitución Política del Estado (2009), Art. 130 (Habeas Data)</li>
            <li>Ley N° 164 General de Telecomunicaciones, Tecnologías de Información y Comunicación (2011)</li>
            <li>Ley N° 453 General de los Derechos de las Usuarias y los Usuarios y de las Consumidoras y los Consumidores (2013)</li>
            <li>Código Civil de Bolivia</li>
          </ul>

          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-4">
            Cualquier controversia que no pueda resolverse de forma amigable
            se someterá a los jueces y tribunales competentes del país del
            usuario, con renuncia a cualquier otro fuero que pudiere corresponder.
            Para usuarios ecuatorianos: <strong>tribunales competentes de Ecuador</strong>.
            Para usuarios bolivianos: <strong>tribunales competentes de Bolivia</strong>.
          </p>

          {/* ── 14. Fuerza mayor ─────────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">14. Fuerza mayor</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            MedicGet no incurrirá en responsabilidad por incumplimiento o
            demora atribuible a causas fuera de su control razonable, incluyendo
            desastres naturales, cortes de energía, fallos de infraestructura
            de internet, actos de gobierno, pandemias u otras circunstancias
            imprevisibles e irresistibles. En tales casos, notificaremos a los
            usuarios afectados en el menor tiempo posible.
          </p>

          {/* ── 15. Separabilidad ────────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">15. Separabilidad de cláusulas</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Si alguna disposición de estos Términos fuera declarada inválida o
            inaplicable por un tribunal competente, las demás disposiciones
            permanecerán en plena vigencia. La cláusula inválida se reemplazará
            por la interpretación válida más próxima a su intención original.
          </p>

          {/* ── 16. Cambios ──────────────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">16. Cambios a estos Términos</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            MedicGet puede actualizar estos Términos. Los cambios sustantivos
            se comunicarán por correo electrónico con al menos{' '}
            <strong>15 días de anticipación</strong> y, cuando corresponda,
            se requerirá un nuevo consentimiento al iniciar sesión. El porcentaje
            de comisión se notificará con <strong>30 días de anticipación</strong>.
            El uso continuado de la plataforma tras la entrada en vigor de los
            cambios implica su aceptación.
          </p>

          {/* ── 17. Contacto ─────────────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">17. Contacto</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Para consultas, reclamos, solicitudes legales o ejercicio de
            derechos sobre tus datos, escribinos a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">
              {CONTACT_EMAIL}
            </a>{' '}
            indicando el asunto de tu consulta. Respondemos dentro de los{' '}
            <strong>5 días hábiles</strong> siguientes.
          </p>
        </div>

        <div className="mt-16 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Al crear una cuenta en MedicGet, declarás haber leído y aceptado
            estos Términos y la{' '}
            <Link to="/privacidad" className="text-blue-600 hover:underline">
              Política de Privacidad
            </Link>{' '}
            en su versión vigente.
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
