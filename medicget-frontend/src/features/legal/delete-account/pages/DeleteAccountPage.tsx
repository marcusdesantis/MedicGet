/**
 * DeleteAccountPage — Página pública de eliminación de cuenta.
 *
 * Requerida por Google Play Store (política de eliminación de datos, 2024).
 * URL: medicget.io/eliminar-cuenta
 *
 * Explica las dos formas de eliminar la cuenta:
 *   1. Desde la app (inmediato, recomendado)
 *   2. Por correo (para usuarios sin acceso a la app)
 *
 * No requiere login. Diseño consistente con /terminos y /privacidad.
 */

import { Link } from 'react-router-dom';
import { Activity, ArrowLeft, Mail, Smartphone, Trash2 } from 'lucide-react';

const CONTACT_EMAIL = 'soportemedicget@abisoft.it';

export function DeleteAccountPage() {
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
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0">
            <Trash2 size={26} color="#e11d48" />
          </div>
          <div>
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">
              Gestión de cuenta
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Eliminar mi cuenta
            </h1>
          </div>
        </div>

        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg">
          En MedicGet podés eliminar tu cuenta en cualquier momento, de forma
          gratuita e inmediata, sin necesidad de comunicarte con soporte.
          A continuación encontrás las dos formas disponibles.
        </p>

        {/* ── Opción 1: Desde la app ── */}
        <div className="mt-10 rounded-2xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <Smartphone size={20} color="#fff" />
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Opción 1 · Recomendada
              </p>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Desde la app MedicGet
              </h2>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            La eliminación desde la app es <strong>inmediata</strong> y no
            requiere esperar respuesta de soporte. Seguí estos pasos:
          </p>
          <ol className="space-y-3">
            {[
              'Abrí la app MedicGet en tu dispositivo e iniciá sesión.',
              'Tocá tu foto de perfil o el ícono de menú para ir a "Mi perfil".',
              'Desplazate hasta el final de la pantalla.',
              'Tocá el botón "Eliminar cuenta" (debajo de "Cerrar sesión").',
              'Ingresá tu contraseña actual para confirmar.',
              'Tocá "Eliminar mi cuenta" para completar el proceso.',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {step}
                </p>
              </li>
            ))}
          </ol>
          <p className="text-sm text-blue-700 dark:text-blue-400 mt-4 font-medium">
            Tu cuenta quedará eliminada de inmediato y tu sesión se cerrará automáticamente.
          </p>
        </div>

        {/* ── Opción 2: Por correo ── */}
        <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-700 dark:bg-slate-600 flex items-center justify-center shrink-0">
              <Mail size={20} color="#fff" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Opción 2
              </p>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Por correo electrónico
              </h2>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Si no podés acceder a la app, enviá un correo desde la dirección
            asociada a tu cuenta:
          </p>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2 text-sm">
            <p><span className="font-semibold text-slate-700 dark:text-slate-300">Para:</span>{' '}
              <a href={`mailto:${CONTACT_EMAIL}?subject=Solicitud%20de%20eliminaci%C3%B3n%20de%20cuenta&body=Hola%2C%20solicito%20la%20eliminaci%C3%B3n%20de%20mi%20cuenta%20y%20datos%20personales%20en%20MedicGet.%0A%0ACorreo%20de%20la%20cuenta%3A%20%5Btu%20correo%5D`}
                className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a>
            </p>
            <p><span className="font-semibold text-slate-700 dark:text-slate-300">Asunto:</span>{' '}
              <span className="text-slate-600 dark:text-slate-400 font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                Solicitud de eliminación de cuenta
              </span>
            </p>
            <p><span className="font-semibold text-slate-700 dark:text-slate-300">Incluí en el cuerpo:</span>{' '}
              <span className="text-slate-600 dark:text-slate-400">
                tu nombre completo y el correo asociado a tu cuenta.
              </span>
            </p>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
            Procesamos las solicitudes por correo dentro de los{' '}
            <strong>5 días hábiles</strong> siguientes a la recepción.
          </p>
        </div>

        {/* ── Qué pasa con tus datos ── */}
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4">¿Qué pasa con mis datos al eliminar la cuenta?</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Tipo de dato</th>
                  <th className="text-left px-4 py-3 font-semibold">Qué ocurre</th>
                  <th className="text-left px-4 py-3 font-semibold">Plazo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="px-4 py-3">Perfil visible (nombre, foto, bio)</td>
                  <td className="px-4 py-3">Eliminado / ocultado de inmediato</td>
                  <td className="px-4 py-3">Inmediato</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Citas activas (pendientes / próximas)</td>
                  <td className="px-4 py-3">Canceladas automáticamente; se notifica a las partes</td>
                  <td className="px-4 py-3">Inmediato</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Token de notificaciones push</td>
                  <td className="px-4 py-3">Eliminado</td>
                  <td className="px-4 py-3">Inmediato</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Datos personales del perfil</td>
                  <td className="px-4 py-3">Anonimizados</td>
                  <td className="px-4 py-3">Hasta 30 días</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Historia clínica y notas de citas</td>
                  <td className="px-4 py-3">Anonimizados</td>
                  <td className="px-4 py-3">Hasta 30 días</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Documento de licencia (médicos)</td>
                  <td className="px-4 py-3">Eliminado</td>
                  <td className="px-4 py-3">Hasta 30 días</td>
                </tr>
                <tr className="bg-amber-50/60 dark:bg-amber-900/10">
                  <td className="px-4 py-3">Registros de pagos y transacciones</td>
                  <td className="px-4 py-3">Conservados de forma anonimizada por obligación fiscal</td>
                  <td className="px-4 py-3 text-amber-700 dark:text-amber-400 font-medium">7 años (ley)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
            Los registros de pago se conservan durante 7 años en formato anonimizado
            (sin nombre, correo ni datos de contacto) por obligación de la normativa
            fiscal ecuatoriana. No es posible eximirse de este requisito legal.
          </p>
        </div>

        {/* ── Footer de contacto ── */}
        <div className="mt-12 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            ¿Tenés dudas sobre el proceso o querés conocer más sobre cómo
            tratamos tus datos?
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2.5 text-sm font-semibold transition"
            >
              <Mail size={14} /> Contactar soporte
            </a>
            <Link
              to="/privacidad"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2.5 text-sm font-semibold transition"
            >
              Ver Política de Privacidad
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
