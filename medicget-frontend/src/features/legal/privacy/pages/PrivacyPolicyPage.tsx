/**
 * PrivacyPolicyPage — Política de Privacidad de MedicGet.
 *
 * Cumple con:
 *   - Ley Orgánica de Protección de Datos Personales de Ecuador (LOPDP, 2021)
 *   - Google Play Store — User Data Policy y Data Safety requirements
 *   - Requisitos específicos para aplicaciones médicas / de salud
 *
 * Fecha de última actualización: 12 de junio de 2026.
 * IMPORTANTE: actualizar esta fecha manualmente cada vez que se modifique
 * el contenido — NO usar new Date() para que Google Play vea una fecha estable.
 */

import { Link } from 'react-router-dom';
import { Activity, ArrowLeft } from 'lucide-react';

const LAST_UPDATED = '12 de junio de 2026';
const CONTACT_EMAIL = 'soportemedicget@abisoft.it';

export function PrivacyPolicyPage() {
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
          Política de Privacidad
        </h1>
        <p className="mt-4 text-slate-500 dark:text-slate-400">
          Última actualización: <strong>{LAST_UPDATED}</strong>
        </p>

        {/* Aviso datos de salud */}
        <div className="mt-8 p-5 rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
            ⚕ Aplicación de salud — datos sensibles
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
            MedicGet trata datos de salud que la Ley Orgánica de Protección de
            Datos Personales del Ecuador (LOPDP) y Google Play clasifican como
            <strong> categoría especial de datos sensibles</strong>. Al
            registrarte y usar la plataforma, otorgás tu <strong>consentimiento
            explícito e informado</strong> para el tratamiento descrito en esta
            política. Podés retirarlo en cualquier momento eliminando tu cuenta
            desde la app.
          </p>
        </div>

        <div className="prose prose-slate dark:prose-invert mt-10 max-w-none space-y-0">

          {/* ── 1. Responsable ─────────────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">1. Responsable del tratamiento</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            El responsable del tratamiento de los datos personales recolectados
            a través de la plataforma web y la aplicación móvil MedicGet es:
          </p>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-1 mt-3">
            <li><strong>Razón social:</strong> Abisoft</li>
            <li><strong>Producto:</strong> MedicGet (plataforma web + app móvil)</li>
            <li><strong>Correo de contacto para privacidad:</strong>{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">
                {CONTACT_EMAIL}
              </a>
            </li>
          </ul>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
            Para cualquier consulta, ejercicio de derechos o reclamo relacionado
            con tus datos personales, escribinos al correo indicado con el asunto
            <em> "Privacidad – [tu solicitud]"</em>. Respondemos dentro de los
            plazos establecidos por la LOPDP (máximo <strong>15 días hábiles</strong>).
          </p>

          {/* ── 2. Ámbito ──────────────────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">2. Ámbito de aplicación</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Esta política aplica a todas las personas que usen MedicGet a través
            de:
          </p>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-1 mt-2">
            <li>El sitio web en <strong>medicget.io</strong></li>
            <li>La aplicación móvil para Android (disponible en Google Play)</li>
            <li>La aplicación móvil para iOS (App Store)</li>
          </ul>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
            Cubre todos los roles de usuario: <strong>paciente</strong>,{' '}
            <strong>médico</strong> y <strong>clínica</strong>.
          </p>

          {/* ── 3. Base legal ──────────────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">3. Base legal del tratamiento</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Tratamos tus datos sobre las siguientes bases legales, conforme al
            Art. 7 de la LOPDP:
          </p>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-2 mt-3">
            <li>
              <strong>Consentimiento explícito (Art. 7 lit. a y Art. 24 LOPDP):</strong>{' '}
              para el tratamiento de datos de salud (categoría especial), que
              otorgás al registrarte marcando el casillero de aceptación. Es
              libre, específico, informado e inequívoco. Podés retirarlo
              eliminando tu cuenta.
            </li>
            <li>
              <strong>Ejecución de un contrato (Art. 7 lit. b):</strong>{' '}
              para los datos necesarios para prestar el servicio (autenticación,
              reserva de citas, pagos, videollamadas).
            </li>
            <li>
              <strong>Obligación legal (Art. 7 lit. c):</strong>{' '}
              para conservar registros de pagos y transacciones según las normas
              tributarias y contables aplicables.
            </li>
            <li>
              <strong>Interés legítimo (Art. 7 lit. f):</strong>{' '}
              para la seguridad de la plataforma, detección de fraudes y
              mantenimiento técnico, siempre que no prevalezcan sobre tus
              derechos fundamentales.
            </li>
          </ul>

          {/* ── 4. Datos que recolectamos ──────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">4. Datos que recolectamos</h2>

          <h3 className="text-lg font-semibold mt-5 mb-2">4.1 Datos de identidad y contacto (todos los usuarios)</h3>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-1">
            <li>Nombre y apellido, correo electrónico, teléfono.</li>
            <li>Contraseña — almacenada exclusivamente como <strong>hash bcrypt</strong> (nunca en texto claro, no recuperable).</li>
            <li>Dirección postal, ciudad, provincia, país.</li>
            <li>Coordenadas geográficas aproximadas (latitud/longitud), únicamente si las proporcionás de forma manual para mejorar búsquedas de médicos cercanos. La app <strong>no activa el GPS</strong> ni rastrea tu ubicación en tiempo real.</li>
            <li>Foto de perfil o logo de clínica, si subís una.</li>
            <li>Fecha, hora y versión del documento legal aceptado al registrarte.</li>
          </ul>

          <h3 className="text-lg font-semibold mt-5 mb-2">
            4.2 Datos de salud — categoría especial / sensible ⚕
          </h3>
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4 mb-3">
            <p className="text-sm text-rose-700 dark:text-rose-300 font-medium">
              Los siguientes datos son considerados <strong>datos sensibles de salud</strong> conforme al
              Art. 26 de la LOPDP y a la política de Datos de Usuario de Google Play.
              Su tratamiento requiere y obtiene tu <strong>consentimiento explícito</strong>.
            </p>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">Solo para pacientes:</p>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-1">
            <li>Fecha de nacimiento y grupo sanguíneo.</li>
            <li>Alergias conocidas, condiciones médicas preexistentes y medicación actual.</li>
            <li>Notas clínicas, motivo de consulta, diagnóstico, tratamiento y observaciones registradas por el médico tratante durante o después de cada cita.</li>
            <li>Historial completo de citas médicas.</li>
            <li>Mensajes de chat de consultas en modalidad CHAT, que pueden contener información clínica.</li>
          </ul>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium mt-3">Solo para médicos:</p>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-1">
            <li>Especialidad médica, número de licencia / colegiatura y autoridad emisora.</li>
            <li><strong>Número de cédula de identidad</strong> — utilizado exclusivamente para la verificación automática de habilitación profesional ante el registro público de ACESS (Ecuador). No se comparte con otros usuarios.</li>
            <li><strong>Documento de licencia / título profesional</strong> (imagen) — subido voluntariamente para revisión por el equipo de MedicGet. Almacenado en base de datos cifrada en tránsito. Solo el médico titular y los administradores de MedicGet pueden acceder a él.</li>
          </ul>

          <h3 className="text-lg font-semibold mt-5 mb-2">4.3 Datos profesionales de médicos (públicos)</h3>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-1">
            <li>Años de experiencia, precio por consulta, duración de la consulta, idiomas que habla.</li>
            <li>Biografía pública, modalidades de atención (presencial, videollamada, chat) y horarios de disponibilidad.</li>
            <li>Calificación promedio y reseñas de pacientes (publicadas).</li>
          </ul>

          <h3 className="text-lg font-semibold mt-5 mb-2">4.4 Datos de dispositivo y técnicos</h3>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-1">
            <li><strong>Token de notificación push</strong> — identificador generado por el sistema operativo de tu dispositivo (Android / iOS) que utilizamos exclusivamente para enviarte notificaciones sobre tus citas y actividad en la plataforma. No se comparte con terceros.</li>
            <li><strong>Dirección IP</strong> — registrada en los logs del servidor por razones de seguridad y diagnóstico. Se conserva por 90 días y no se usa para perfilado.</li>
            <li><strong>Versión de la app y del sistema operativo</strong> — para diagnóstico de errores y compatibilidad.</li>
            <li>Datos de sesión (token JWT firmado, con expiración de 7 días).</li>
          </ul>

          <h3 className="text-lg font-semibold mt-5 mb-2">4.5 Datos de pago</h3>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-1">
            <li>MedicGet <strong>no almacena datos de tarjeta</strong> de crédito/débito ni información bancaria.</li>
            <li>Los pagos son procesados íntegramente por <strong>PayPhone</strong>. MedicGet solo conserva: monto, estado del pago, ID de transacción de PayPhone y medio de pago (tarjeta, efectivo, etc.), para efectos de historial y soporte.</li>
          </ul>

          {/* ── 5. Permisos de la app ──────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">5. Permisos que solicita la aplicación móvil</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            La app de MedicGet solicita los siguientes permisos en tu
            dispositivo, todos opcionales salvo donde se indica:
          </p>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-2 mt-3">
            <li>
              <strong>Cámara</strong> — para tomar fotos de tu documento de licencia
              (médicos) o foto de perfil. Solo se activa cuando presionás el
              botón correspondiente; la app no accede a la cámara en segundo plano.
            </li>
            <li>
              <strong>Galería / Almacenamiento de imágenes</strong> — para
              seleccionar una foto existente de tu dispositivo como foto de
              perfil o documento. No leemos ni indexamos otros archivos.
            </li>
            <li>
              <strong>Notificaciones push</strong> — para avisarte sobre
              confirmaciones de citas, recordatorios, actualizaciones de
              verificación de licencia y mensajes de soporte. Podés
              desactivarlas desde los ajustes de tu dispositivo en cualquier
              momento.
            </li>
          </ul>

          {/* ── 6. Para qué usamos tus datos ──────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">6. Finalidades del tratamiento</h2>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-2">
            <li><strong>Prestación del servicio:</strong> autenticación, búsqueda y filtrado de médicos, reserva y gestión de citas, videollamadas (Jitsi auto-hospedado), chat clínico, historial médico del paciente, emisión y registro de pagos, procesamiento de reembolsos.</li>
            <li><strong>Verificación de habilitación profesional:</strong> consulta de cédula contra el padrón de ACESS (Ecuador) y revisión manual del documento de licencia por el equipo de MedicGet.</li>
            <li><strong>Comunicaciones operativas:</strong> verificación de correo al registrarse, confirmaciones y recordatorios de cita, recibos de pago, notificaciones de reembolso, recuperación de contraseña, avisos de cambios en la política.</li>
            <li><strong>Seguridad y prevención de fraude:</strong> detección de accesos no autorizados, bloqueo de cuentas comprometidas.</li>
            <li><strong>Soporte técnico y atención de reclamos.</strong></li>
            <li><strong>Cumplimiento legal:</strong> respondemos requerimientos de autoridades competentes cuando es legalmente exigible, en los términos previstos por la LOPDP y demás normativa aplicable.</li>
          </ul>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
            <strong>No vendemos tus datos.</strong> No los compartimos con
            terceros para fines publicitarios, de marketing ni de elaboración
            de perfiles comerciales.
          </p>

          {/* ── 7. Quién accede ────────────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">7. Quién puede ver tus datos</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            El acceso a los datos está controlado por roles (RBAC). En concreto:
          </p>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-2 mt-3">
            <li><strong>Historia clínica, notas de cita y mensajes de chat:</strong> solo el paciente involucrado, el médico tratante y, cuando corresponda, la clínica a la que pertenece el médico.</li>
            <li><strong>Documento de licencia y cédula del médico:</strong> solo el médico titular y los administradores de MedicGet, exclusivamente para el proceso de verificación.</li>
            <li><strong>Datos de pago:</strong> el paciente ve su propio historial; el médico y la clínica ven los pagos de sus citas; los administradores pueden consultar todos los pagos para soporte y reembolsos.</li>
            <li><strong>Perfil público del médico</strong> (nombre, especialidad, foto, disponibilidad, precio, reseñas): visible para cualquier usuario de la plataforma.</li>
            <li><strong>Administradores de MedicGet:</strong> tienen acceso de solo lectura/escritura restringida al mínimo necesario para soporte, verificaciones y resolución de reclamos. Los accesos quedan registrados en logs de auditoría.</li>
          </ul>

          {/* ── 8. Terceros ───────────────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">8. Terceros que intervienen en el servicio</h2>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Proveedor</th>
                  <th className="text-left px-4 py-3 font-semibold">País</th>
                  <th className="text-left px-4 py-3 font-semibold">Finalidad</th>
                  <th className="text-left px-4 py-3 font-semibold">Datos que recibe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="px-4 py-3 font-medium">PayPhone</td>
                  <td className="px-4 py-3">Ecuador</td>
                  <td className="px-4 py-3">Procesamiento de pagos con tarjeta</td>
                  <td className="px-4 py-3">Monto, descripción; los datos de tarjeta los gestiona PayPhone directamente bajo su propia política.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Aruba S.p.A.</td>
                  <td className="px-4 py-3">Italia (UE)</td>
                  <td className="px-4 py-3">Envío de correos transaccionales (verificación, recuperación de contraseña, recibos)</td>
                  <td className="px-4 py-3">Correo electrónico del destinatario y contenido del mensaje.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">ACESS</td>
                  <td className="px-4 py-3">Ecuador</td>
                  <td className="px-4 py-3">Verificación de habilitación profesional de médicos</td>
                  <td className="px-4 py-3">Número de cédula del médico (consulta al registro público oficial).</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Jitsi Meet (auto-hospedado)</td>
                  <td className="px-4 py-3">Ecuador (servidor propio)</td>
                  <td className="px-4 py-3">Videollamadas médico-paciente</td>
                  <td className="px-4 py-3">Audio y vídeo de la sesión. El servidor es controlado por MedicGet (meet.medicget.io); ningún tercero accede a las llamadas.</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── 9. Transferencias internacionales ─────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">9. Transferencias internacionales de datos</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Los datos se almacenan en servidores VPS ubicados en la
            infraestructura de MedicGet. El único flujo internacional de datos
            se produce al enviar correos transaccionales a través de{' '}
            <strong>Aruba S.p.A.</strong> (Italia), país miembro de la Unión
            Europea sujeto al <strong>RGPD</strong>, que ofrece un nivel de
            protección equivalente o superior al exigido por la LOPDP. Esta
            transferencia cumple con el Art. 54 de la LOPDP.
          </p>

          {/* ── 10. Seguridad ─────────────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">10. Medidas de seguridad</h2>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-1">
            <li>Comunicaciones cifradas con <strong>HTTPS / TLS</strong> entre tu dispositivo y nuestros servidores.</li>
            <li>Contraseñas almacenadas con <strong>hash bcrypt</strong> (función de derivación de clave; no reversible).</li>
            <li>Tokens de sesión <strong>JWT firmados</strong> con clave secreta; expiración automática a los 7 días.</li>
            <li>Tokens de recuperación de contraseña y verificación de email guardados como <strong>hash SHA-256</strong>; el token plano solo viaja por correo y expira a las 24 horas.</li>
            <li>Acceso a la infraestructura restringido por firewall y autenticación de llave SSH.</li>
            <li>Control de acceso por roles (RBAC) que impide que un usuario acceda a datos de otro.</li>
            <li>Logs de auditoría para accesos administrativos.</li>
          </ul>

          {/* ── 11. Retención ─────────────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">11. Retención de datos</h2>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Tipo de dato</th>
                  <th className="text-left px-4 py-3 font-semibold">Período de retención</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="px-4 py-3">Datos de perfil y cuenta activa</td>
                  <td className="px-4 py-3">Mientras la cuenta esté activa</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Historia clínica y notas de cita</td>
                  <td className="px-4 py-3">Mientras la cuenta esté activa; anonimizados en 30 días tras la eliminación de cuenta</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Registros de pago y transacciones</td>
                  <td className="px-4 py-3">7 años (obligación fiscal/contable bajo la normativa ecuatoriana)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Logs de servidor (IP, accesos)</td>
                  <td className="px-4 py-3">90 días</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Tokens de notificación push</td>
                  <td className="px-4 py-3">Eliminados inmediatamente al eliminar la cuenta</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Documento de licencia del médico</td>
                  <td className="px-4 py-3">Mientras la cuenta esté activa; eliminado en 30 días tras la baja</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── 12. Eliminación de cuenta ─────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">12. Eliminación de cuenta y datos</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Podés eliminar tu cuenta en cualquier momento <strong>directamente
            desde la app</strong>, sin necesidad de contactar soporte:
          </p>
          <ol className="text-slate-600 dark:text-slate-400 leading-relaxed list-decimal pl-6 space-y-1 mt-3">
            <li>Abrí la app MedicGet e iniciá sesión.</li>
            <li>Andá a <strong>Mi perfil</strong>.</li>
            <li>Tocá <strong>"Eliminar cuenta"</strong> al final de la pantalla.</li>
            <li>Ingresá tu contraseña para confirmar.</li>
          </ol>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
            Al eliminar tu cuenta ocurre lo siguiente de forma automática:
          </p>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-1 mt-2">
            <li>Las citas pendientes, próximas y en curso son canceladas y se notifica a las partes afectadas.</li>
            <li>Tu perfil deja de ser visible para otros usuarios de inmediato.</li>
            <li>Tu token de notificación push es eliminado.</li>
            <li>Los datos personales de tu perfil (nombre, teléfono, foto, dirección) son <strong>anonimizados dentro de los 30 días</strong> siguientes.</li>
            <li>Los datos clínicos (historia, notas, mensajes de chat) son <strong>anonimizados dentro de los 30 días</strong>.</li>
            <li>Los registros de pago se conservan durante <strong>7 años</strong> por obligación fiscal, en forma anonimizada (sin nombre ni datos de contacto).</li>
          </ul>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
            También podés solicitar la eliminación de tu cuenta escribiendo a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">
              {CONTACT_EMAIL}
            </a>{' '}
            desde el correo asociado a tu cuenta.
          </p>

          {/* ── 13. Derechos del titular ───────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">13. Tus derechos (LOPDP)</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Conforme a la Ley Orgánica de Protección de Datos Personales del
            Ecuador, podés ejercer en cualquier momento los siguientes derechos:
          </p>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-2 mt-3">
            <li><strong>Acceso (Art. 68 LOPDP):</strong> obtener confirmación de si tratamos tus datos y recibir una copia de ellos.</li>
            <li><strong>Rectificación (Art. 69):</strong> corregir datos inexactos o incompletos. En muchos casos podés hacerlo directamente desde tu perfil en la app.</li>
            <li><strong>Eliminación / supresión (Art. 70):</strong> solicitar la baja de tu cuenta y la anonimización de tus datos, salvo cuando la conservación sea exigida por ley (ej. registros fiscales).</li>
            <li><strong>Oposición (Art. 71):</strong> oponerte a tratamientos basados en interés legítimo.</li>
            <li><strong>Portabilidad (Art. 72):</strong> recibir tus datos en un formato estructurado y legible por máquina.</li>
            <li><strong>Limitación del tratamiento (Art. 73):</strong> solicitar la restricción del tratamiento mientras se resuelve una impugnación.</li>
            <li><strong>Retirar el consentimiento:</strong> en cualquier momento para los tratamientos basados en consentimiento (incluidos los datos de salud), sin que ello afecte la licitud del tratamiento anterior. La forma más directa es eliminar tu cuenta.</li>
          </ul>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
            Para ejercer cualquiera de estos derechos, escribinos a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">
              {CONTACT_EMAIL}
            </a>{' '}
            con el asunto <em>"Derechos LOPDP – [derecho que querés ejercer]"</em> desde el correo asociado a tu cuenta.
            Respondemos en un plazo máximo de <strong>15 días hábiles</strong>.
            Si considerás que tu solicitud no fue atendida correctamente, podés
            presentar un reclamo ante la{' '}
            <strong>Superintendencia de Protección de Datos Personales del Ecuador</strong>.
          </p>

          {/* ── 14. Menores ───────────────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">14. Menores de edad</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            MedicGet está dirigido exclusivamente a personas mayores de{' '}
            <strong>18 años</strong>. No recolectamos intencionalmente datos de
            menores de edad. Si sos padre, madre o tutor legal y necesitás
            gestionar atención médica para un menor a tu cargo, debés registrar
            una cuenta a tu nombre y actuar como titular. Si detectamos que una
            cuenta corresponde a un menor sin supervisión adulta, la suspenderemos
            y eliminaremos sus datos.
          </p>

          {/* ── 15. Brechas de seguridad ──────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">15. Notificación de brechas de seguridad</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            En caso de detectar una brecha de seguridad que pueda afectar tus
            datos personales, actuaremos conforme al Art. 43 de la LOPDP:
            notificaremos a la autoridad de control dentro de las{' '}
            <strong>72 horas</strong> siguientes a tener conocimiento del
            incidente, y te informaremos a vos directamente cuando la brecha
            suponga un alto riesgo para tus derechos, indicando la naturaleza
            del incidente, los datos afectados y las medidas adoptadas.
          </p>

          {/* ── 16. Cambios ───────────────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">16. Cambios a esta política</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Cuando actualicemos esta política de forma sustantiva — especialmente
            cambios en los datos recolectados, nuevos terceros o nuevas
            finalidades de tratamiento — te notificaremos por correo electrónico
            con al menos <strong>15 días de anticipación</strong> y, si fuera
            necesario, te solicitaremos un nuevo consentimiento al iniciar
            sesión. La fecha de última actualización al inicio de este documento
            siempre refleja la versión vigente.
          </p>
        </div>

        {/* CTA final */}
        <div className="mt-16 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            ¿Tenés preguntas sobre cómo tratamos tus datos o querés ejercer un
            derecho? Escribinos a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">
              {CONTACT_EMAIL}
            </a>
            . Respondemos en máximo 15 días hábiles.
          </p>
          <Link
            to="/terminos"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-sm font-semibold transition"
          >
            Ver también los Términos y Condiciones
          </Link>
        </div>
      </article>
    </div>
  );
}
