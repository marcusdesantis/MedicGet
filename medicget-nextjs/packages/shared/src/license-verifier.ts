/**
 * License Verifier — verificación automática de habilitación médica.
 *
 * Abstrae el "¿este profesional está habilitado para ejercer medicina?".
 * Hoy el único provider es ACESS (Ecuador), pero la interface permite
 * sumar otros (SENESCYT, KYC pago, otro país) sin tocar los callers.
 *
 * CONTRATO CLAVE — fail-safe:
 *   Esta función NUNCA lanza. Ante CUALQUIER problema (feature off, red
 *   caída, formato inesperado, timeout, resultado ambiguo) devuelve
 *   `UNAVAILABLE`. El caller interpreta UNAVAILABLE como "no pude
 *   confirmar automáticamente → mandá a revisión manual". Así el scraper
 *   frágil de ACESS jamás bloquea a un médico legítimo.
 *
 *   Solo devuelve VERIFIED cuando el match es INEQUÍVOCO: la cédula
 *   aparece, el estado indica habilitado/activo, y (si se pasó el nombre)
 *   coincide. Cualquier ambigüedad → UNAVAILABLE (no NOT_FOUND), para no
 *   "rechazar" por una lectura dudosa del scraper.
 */

import { optionalEnv } from './env';
import { isValidEcuadorianCedula } from './cedula';

export type LicenseVerificationOutcome = 'VERIFIED' | 'NOT_FOUND' | 'UNAVAILABLE';

export interface LicenseVerificationResult {
  outcome: LicenseVerificationOutcome;
  /** Quién resolvió. Hoy siempre 'ACESS_AUTO' cuando hubo respuesta real. */
  source:  'ACESS_AUTO' | 'NONE';
  /** Motivo legible (para UNAVAILABLE/NOT_FOUND) o resumen del match. */
  reason:  string;
  /** Snapshot crudo para auditoría — se guarda en Doctor.licenseVerificationEvidence. */
  evidence?: Record<string, unknown>;
}

export interface VerifyInput {
  cedula:    string;
  /** Nombre completo del perfil — si se pasa, se exige coincidencia para el match inequívoco. */
  fullName?: string;
}

/** Timeout duro para no colgar el registro del médico esperando a ACESS. */
const ACESS_TIMEOUT_MS = 8000;

// ─── Calibración ACESS ──────────────────────────────────────────────────────
// OJO: estos valores fueron escritos contra las convenciones estándar de
// PrimeFaces/JSF pero NO se pudieron testear contra el sitio real (los
// servidores .gob.ec bloquean IPs fuera de Ecuador). Antes de poner
// ACESS_ENABLED=true en producción, CALIBRAR desde el VPS:
//   1. curl -i "$ACESS_BASE_URL"  → ver el form: id real, name del input,
//      name del botón, y confirmar que el hidden es `javax.faces.ViewState`.
//   2. Hacer una consulta manual con DevTools abierto → copiar el POST real
//      (form data) y ajustar buildSearchBody() para que lo replique.
//   3. Ver el formato de la respuesta (¿partial-response XML de PrimeFaces?
//      ¿HTML completo?) y ajustar parseResult().
// Mientras ACESS_ENABLED != 'true', este provider devuelve UNAVAILABLE
// siempre y todo cae al flujo de revisión manual (cero riesgo).
const ACESS_DEFAULT_URL =
  'http://www.calidadsalud.gob.ec/acess-app-servicio-ciudadano/public/titulo/consulta.jsf';

function acessConfig() {
  return {
    enabled: optionalEnv('ACESS_ENABLED', 'false') === 'true',
    baseUrl: optionalEnv('ACESS_BASE_URL', ACESS_DEFAULT_URL),
    // Nombres de campos del form JSF — overridables por env por si en la
    // calibración resultan distintos a lo asumido.
    formId:      optionalEnv('ACESS_FORM_ID', 'formConsulta'),
    inputName:   optionalEnv('ACESS_INPUT_NAME', 'formConsulta:identificacion'),
    buttonName:  optionalEnv('ACESS_BUTTON_NAME', 'formConsulta:btnConsultar'),
  };
}

/**
 * Punto de entrada único. Fail-safe garantizado.
 */
export async function verifyMedicalLicense(input: VerifyInput): Promise<LicenseVerificationResult> {
  const cedula = (input.cedula ?? '').trim();

  if (!isValidEcuadorianCedula(cedula)) {
    return { outcome: 'UNAVAILABLE', source: 'NONE', reason: 'Cédula con formato inválido.' };
  }

  const cfg = acessConfig();
  if (!cfg.enabled) {
    return {
      outcome: 'UNAVAILABLE',
      source:  'NONE',
      reason:  'Verificación automática deshabilitada (ACESS_ENABLED=false). Revisión manual.',
    };
  }

  try {
    return await queryAcess(cedula, input.fullName, cfg);
  } catch (err) {
    // Cualquier excepción → UNAVAILABLE. Logueamos para diagnóstico.
    // eslint-disable-next-line no-console
    console.error('[licenseVerifier] ACESS query failed:', err);
    return {
      outcome: 'UNAVAILABLE',
      source:  'NONE',
      reason:  'No se pudo consultar ACESS en este momento. Revisión manual.',
    };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  ACESS provider (scraper JSF) — CALIBRAR antes de habilitar en prod.
 * ═══════════════════════════════════════════════════════════════════════════ */

async function queryAcess(
  cedula:   string,
  fullName: string | undefined,
  cfg:      ReturnType<typeof acessConfig>,
): Promise<LicenseVerificationResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ACESS_TIMEOUT_MS);

  try {
    // ── Paso 1: GET de la página para obtener cookie de sesión + ViewState ──
    const getRes = await fetch(cfg.baseUrl, {
      method:  'GET',
      headers: { 'User-Agent': 'MedicGet-LicenseVerifier/1.0' },
      signal:  controller.signal,
    });
    const html = await getRes.text();
    const cookie = extractSetCookie(getRes);
    const viewState = extractViewState(html);

    if (!viewState) {
      // El form cambió o no es el esperado → no arriesgamos, manual.
      return { outcome: 'UNAVAILABLE', source: 'NONE', reason: 'No se encontró ViewState en ACESS (form cambió). Revisión manual.' };
    }

    // ── Paso 2: POST emulando el submit JSF (PrimeFaces partial AJAX) ──────
    const body = buildSearchBody(cedula, viewState, cfg);
    const postRes = await fetch(cfg.baseUrl, {
      method:  'POST',
      headers: {
        'Content-Type':           'application/x-www-form-urlencoded; charset=UTF-8',
        'Faces-Request':          'partial/ajax',
        'X-Requested-With':       'XMLHttpRequest',
        'User-Agent':             'MedicGet-LicenseVerifier/1.0',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body,
      signal: controller.signal,
    });
    const responseText = await postRes.text();

    return parseResult(responseText, cedula, fullName);
  } finally {
    clearTimeout(timer);
  }
}

function extractSetCookie(res: Response): string | null {
  const sc = res.headers.get('set-cookie');
  if (!sc) return null;
  // Nos quedamos con el par nombre=valor (sin atributos Path/HttpOnly).
  return sc.split(',').map((c) => c.split(';')[0].trim()).filter(Boolean).join('; ');
}

function extractViewState(html: string): string | null {
  // JSF embebe <input ... name="javax.faces.ViewState" ... value="...">
  const m =
    /name="javax\.faces\.ViewState"[^>]*value="([^"]*)"/.exec(html) ||
    /id="javax\.faces\.ViewState[^"]*"[^>]*value="([^"]*)"/.exec(html) ||
    /<update id="javax\.faces\.ViewState[^"]*"><!\[CDATA\[([^\]]*)\]\]><\/update>/.exec(html);
  return m ? m[1] : null;
}

function buildSearchBody(
  cedula:    string,
  viewState: string,
  cfg:       ReturnType<typeof acessConfig>,
): string {
  // Cuerpo típico de un submit AJAX de PrimeFaces. CALIBRAR los nombres
  // contra el POST real visto en DevTools.
  const params = new URLSearchParams();
  params.set('javax.faces.partial.ajax', 'true');
  params.set('javax.faces.source', cfg.buttonName);
  params.set('javax.faces.partial.execute', '@all');
  params.set('javax.faces.partial.render', cfg.formId);
  params.set(cfg.buttonName, cfg.buttonName);
  params.set(cfg.formId, cfg.formId);
  params.set(cfg.inputName, cedula);
  params.set('javax.faces.ViewState', viewState);
  return params.toString();
}

/**
 * Interpreta la respuesta de ACESS. Conservador por diseño:
 *   • Señales positivas claras + cédula presente + (nombre coincide si se pasó)
 *     → VERIFIED.
 *   • Señal explícita de "no encontrado" → NOT_FOUND.
 *   • Cualquier otra cosa (vacío, ambiguo, múltiples, formato raro)
 *     → UNAVAILABLE (cae a manual; nunca "rechazamos" por duda).
 */
function parseResult(
  responseText: string,
  cedula:       string,
  fullName?:    string,
): LicenseVerificationResult {
  const text = responseText.toUpperCase();
  const evidence: Record<string, unknown> = {
    queriedAt: new Date().toISOString(),
    cedula,
    rawLength: responseText.length,
    snippet:   responseText.slice(0, 2000),
  };

  const notFound =
    text.includes('NO SE HAN ENCONTRADO') ||
    text.includes('NO SE ENCONTR') ||
    text.includes('NINGÚN RESULTADO') ||
    text.includes('NINGUN RESULTADO') ||
    text.includes('SIN RESULTADOS');
  if (notFound) {
    return { outcome: 'NOT_FOUND', source: 'ACESS_AUTO', reason: 'ACESS no tiene registro para esta cédula.', evidence };
  }

  const negative =
    text.includes('SUSPENDIDO') || text.includes('INACTIVO') ||
    text.includes('NO HABILITADO') || text.includes('CANCELADO');

  const positive =
    text.includes('HABILITADO') || text.includes('VIGENTE') ||
    text.includes('ACTIVO') || text.includes('REGISTRADO');

  const cedulaPresent = responseText.includes(cedula);
  const nameOk = !fullName || namePresent(responseText, fullName);

  // Match INEQUÍVOCO: cédula presente, señal positiva, sin señales
  // negativas, y nombre coincide (si fue provisto). Cualquier desviación
  // → UNAVAILABLE para forzar revisión humana.
  if (cedulaPresent && positive && !negative && nameOk) {
    return {
      outcome:  'VERIFIED',
      source:   'ACESS_AUTO',
      reason:   'ACESS confirma habilitación profesional vigente.',
      evidence,
    };
  }

  return {
    outcome: 'UNAVAILABLE',
    source:  'NONE',
    reason:  'Respuesta de ACESS no concluyente. Revisión manual.',
    evidence,
  };
}

/** Coincidencia laxa de nombre: todos los tokens >2 chars del perfil aparecen. */
function namePresent(haystack: string, fullName: string): boolean {
  const hay = stripAccents(haystack.toUpperCase());
  const tokens = stripAccents(fullName.toUpperCase())
    .split(/\s+/)
    .filter((t) => t.length > 2);
  if (tokens.length === 0) return true;
  return tokens.every((t) => hay.includes(t));
}

function stripAccents(s: string): string {
  // U+0300–U+036F = combining diacritical marks.
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}
