/**
 * PrivacyPolicyPage — Política de Privacidad de MedicGet.
 *
 * Espeja la estructura de TermsPage (mismo header, mismo layout) y
 * describe qué datos colecta la plataforma, cómo se procesan, dónde se
 * almacenan, quiénes los acceden, qué terceros intervienen y cómo el
 * usuario ejerce sus derechos.
 *
 * Se mantiene en sync con la realidad del backend (qué columnas existen,
 * qué proveedores se usan). Si cambian, actualizar acá también.
 */

import { Link } from 'react-router-dom';
import { Activity, ArrowLeft } from 'lucide-react';

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top bar minimalista */}
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
          Última actualización:{' '}
          {new Date().toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
        </p>

        <div className="prose prose-slate dark:prose-invert mt-10 max-w-none">
          {/* ── 1. Responsable ───────────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">1. Responsable del tratamiento</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            MedicGet, operado por <strong>Abisoft</strong>, es el responsable
            del tratamiento de los datos personales que ingresás al
            registrarte y usar la plataforma. Para ejercer cualquier
            derecho sobre tus datos, contactanos en{' '}
            <a
              href="mailto:soportemedicget@abisoft.it"
              className="text-blue-600 hover:underline"
            >
              soportemedicget@abisoft.it
            </a>.
          </p>

          {/* ── 2. Datos que recolectamos ────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">2. Qué datos recolectamos</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Según el tipo de cuenta, recolectamos los siguientes datos
            personales:
          </p>
          <h3 className="text-lg font-semibold mt-5 mb-2">2.1 Todos los usuarios</h3>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-1">
            <li>Email, contraseña (almacenada con hash bcrypt — nunca en claro), nombre, apellido, teléfono.</li>
            <li>Dirección, ciudad, provincia, país y, opcionalmente, coordenadas geográficas (para mostrarte médicos cercanos).</li>
            <li>Foto de perfil, si subís una.</li>
            <li>Fecha y versión de los términos legales aceptados al registrarte.</li>
          </ul>

          <h3 className="text-lg font-semibold mt-5 mb-2">2.2 Pacientes</h3>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-1">
            <li>Fecha de nacimiento, tipo de sangre, alergias, condiciones preexistentes, medicación actual.</li>
            <li>Notas clínicas y motivos de consulta cargados por el médico durante o después de cada cita.</li>
            <li>Historial de citas, pagos y reembolsos.</li>
            <li>Mensajes de chat de las consultas modalidad CHAT.</li>
          </ul>

          <h3 className="text-lg font-semibold mt-5 mb-2">2.3 Médicos</h3>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-1">
            <li>Especialidad, número de licencia / colegiatura, autoridad emisora.</li>
            <li><strong>Cédula de identidad</strong> — la usamos para la verificación automática contra el registro público de ACESS (Ecuador).</li>
            <li><strong>Documento de licencia</strong> (foto del título o credencial) — almacenado en la base de datos para que el equipo administrativo lo revise. Solo el médico dueño y los administradores pueden descargarlo.</li>
            <li>Años de experiencia, precio por consulta, biografía pública, idiomas, modalidades atendidas, disponibilidad horaria.</li>
          </ul>

          <h3 className="text-lg font-semibold mt-5 mb-2">2.4 Clínicas</h3>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-1">
            <li>Razón social, descripción, contacto institucional, sitio web, logo.</li>
            <li>Médicos asociados.</li>
          </ul>

          {/* ── 3. Para qué los usamos ──────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">3. Para qué usamos tus datos</h2>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-6 space-y-1">
            <li><strong>Prestación del servicio:</strong> autenticación, búsqueda de médicos, reserva y gestión de citas, generación de salas de videollamada, registro de pagos y reembolsos, historial clínico.</li>
            <li><strong>Verificación de habilitación profesional:</strong> consulta automática a ACESS y revisión manual del documento por nuestro equipo.</li>
            <li><strong>Comunicaciones operativas:</strong> verificación de email, confirmación de cita, recordatorios, recibos, notificaciones de reembolso, recuperación de contraseña.</li>
            <li><strong>Soporte y atención de reclamos.</strong></li>
            <li><strong>Cumplimiento legal:</strong> respondemos requerimientos de autoridades competentes cuando es legalmente exigible.</li>
          </ul>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
            <strong>No vendemos tus datos.</strong> No los compartimos con
            terceros para fines de marketing ni publicidad.
          </p>

          {/* ── 4. Quién accede a tus datos ─────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">
            4. Quién puede acceder a tus datos
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Los datos están protegidos por controles de acceso por rol
            (RBAC). En particular:
          </p>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3 list-disc pl-6 space-y-1">
            <li><strong>Historia clínica y mensajes de chat de una cita:</strong> solo el paciente, el médico tratante y, cuando corresponda, la clínica del médico.</li>
            <li><strong>Documento de licencia:</strong> solo el médico dueño y los administradores de MedicGet (para revisión).</li>
            <li><strong>Datos de pago:</strong> los procesa PayPhone; MedicGet solo guarda el monto, el ID de la transacción y el medio (tarjeta, efectivo, etc.) — nunca el número de tarjeta.</li>
            <li><strong>Administradores de MedicGet:</strong> tienen acceso a la información necesaria para soporte, verificación de licencias, procesamiento de reembolsos y resolución de reclamos.</li>
          </ul>

          {/* ── 5. Terceros / encargados ────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">
            5. Terceros que intervienen
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            MedicGet se apoya en algunos proveedores para prestar el
            servicio:
          </p>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3 list-disc pl-6 space-y-1">
            <li><strong>PayPhone</strong> (Ecuador) — procesa los pagos. Recibe el monto, descripción y datos mínimos del cliente; los datos de tarjeta los procesa exclusivamente PayPhone bajo su propia política.</li>
            <li><strong>Aruba S.p.A.</strong> (Italia) — envía los correos transaccionales (verificación de email, recuperación de contraseña, confirmación de cita, recibos, notificaciones). Recibe tu correo y el contenido del mensaje.</li>
            <li><strong>ACESS</strong> (Agencia de Aseguramiento de la Calidad de los Servicios de Salud, Ecuador) — registro público que consultamos por cédula para verificar la habilitación de un médico.</li>
            <li><strong>Jitsi Meet auto-hospedado</strong> — infraestructura propia de MedicGet (meet.medicget.io). La videollamada no pasa por servidores de terceros para señalización ni media.</li>
          </ul>

          {/* ── 6. Almacenamiento y seguridad ──────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">
            6. Dónde almacenamos y cómo protegemos tus datos
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Los datos se almacenan en una base de datos PostgreSQL alojada
            en un servidor VPS administrado por MedicGet. Aplicamos las
            siguientes medidas:
          </p>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3 list-disc pl-6 space-y-1">
            <li>Tráfico cifrado con <strong>HTTPS (TLS)</strong> entre tu navegador / app y nuestros servidores.</li>
            <li>Contraseñas almacenadas con <strong>hash bcrypt</strong> (nunca en texto plano).</li>
            <li>Tokens de sesión <strong>JWT firmados</strong>, vencen tras 7 días.</li>
            <li>Tokens de recuperación de contraseña y verificación de email guardados en formato <strong>hash</strong> (el token plano viaja solo por email).</li>
            <li>Acceso a la infraestructura limitado por firewall y autenticación.</li>
          </ul>

          {/* ── 7. Retención ────────────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">
            7. Cuánto tiempo conservamos tus datos
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Tu cuenta y los datos asociados se conservan mientras la
            cuenta esté activa. Al solicitar la baja, marcamos la cuenta
            como eliminada (soft delete): los datos personales dejan de
            ser visibles para otros usuarios, y se anonimizan los datos
            que conservamos por motivos contables o legales (ej. registro
            de pagos para fines fiscales).
          </p>

          {/* ── 8. Tus derechos ─────────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">
            8. Tus derechos sobre tus datos
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Podés ejercer, en cualquier momento, los derechos de:
          </p>
          <ul className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3 list-disc pl-6 space-y-1">
            <li><strong>Acceso</strong> — obtener una copia de tus datos.</li>
            <li><strong>Rectificación</strong> — corregir datos inexactos (lo podés hacer directamente desde tu perfil en muchos casos).</li>
            <li><strong>Eliminación</strong> — solicitar la baja de tu cuenta.</li>
            <li><strong>Oposición</strong> — oponerte a tratamientos específicos.</li>
            <li><strong>Portabilidad</strong> — recibir tus datos en un formato común.</li>
          </ul>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
            Para ejercer cualquiera de estos derechos, escribinos desde
            el correo asociado a tu cuenta a{' '}
            <a
              href="mailto:soportemedicget@abisoft.it"
              className="text-blue-600 hover:underline"
            >
              soportemedicget@abisoft.it
            </a>.
            Respondemos en un plazo máximo de 30 días.
          </p>

          {/* ── 9. Menores ──────────────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">9. Menores de edad</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            La plataforma está dirigida a personas mayores de 18 años.
            Las consultas para menores deben gestionarse por el padre,
            madre o tutor legal, que será el titular de la cuenta de
            paciente.
          </p>

          {/* ── 10. Cambios ──────────────────────────────────────────── */}
          <h2 className="text-2xl font-bold mt-10 mb-3">10. Cambios a esta política</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Si actualizamos esta política de forma sustantiva, te lo
            notificaremos por correo y, cuando corresponda, te pediremos
            un nuevo consentimiento al iniciar sesión. La fecha de la
            última actualización está al inicio de este documento.
          </p>
        </div>

        <div className="mt-16 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            ¿Tenés dudas o querés ejercer un derecho sobre tus datos?
            Escribinos a{' '}
            <a
              href="mailto:soportemedicget@abisoft.it"
              className="text-blue-600 hover:underline"
            >
              soportemedicget@abisoft.it
            </a>.
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
