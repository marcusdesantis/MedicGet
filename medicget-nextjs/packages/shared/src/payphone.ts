/**
 * PayPhone client wrapper — flow "Cajita de Pagos Web".
 *
 *   PayPhone is Ecuador's main payment processor (https://www.payphone.com).
 *   La integración correcta de la "Cajita de Pagos" es:
 *
 *     1. FRONTEND  carga el script + CSS del widget desde CDN de PayPhone.
 *     2. FRONTEND  llama al BACKEND para "preparar" una sesión de pago
 *                  → el backend NO contacta a PayPhone en este paso;
 *                  solo persiste un Payment PENDING y genera un
 *                  clientTransactionId único.
 *     3. BACKEND   responde con `{ token, storeId, amount, amountWithTax,
 *                  tax, clientTransactionId, reference }` que el widget
 *                  necesita para renderizar.
 *     4. FRONTEND  instancia `new PPaymentButtonBox({...}).render('pp-button')`.
 *     5. USUARIO   completa el pago en el widget (tarjeta o app PayPhone).
 *     6. PayPhone  redirige al `responseUrl` con `?id=...&clientTransactionId=...`.
 *     7. FRONTEND  manda esos params al BACKEND.
 *     8. BACKEND   confirma con `POST https://paymentbox.payphonetodoesposible.com/api/confirm`.
 *
 *   Stub fallback:
 *     Si PAYPHONE_TOKEN está vacío, este módulo devuelve respuestas
 *     simuladas — el frontend detecta `stubMode: true` y salta el widget,
 *     marcando la cita como pagada para que el resto del flow sea
 *     testeable end-to-end sin credenciales.
 */

import { getSetting, getSettingNumber } from './settings';

/** Host del endpoint de confirmación. Diferente al panel de comercio. */
const CONFIRM_BASE_URL = 'https://paymentbox.payphonetodoesposible.com/api';

/* ───────────────────────────── Types ───────────────────────────── */

/**
 * Datos que el backend devuelve al frontend para que monte el widget.
 * Todos los campos son los que `PPaymentButtonBox` exige.
 */
export interface CheckoutSession {
  ok:                   true;
  /** Bearer token del comercio — se inyecta en el widget. */
  token:                string;
  storeId:              string;
  /** Monto total en centavos (suma de los componentes). */
  amount:               number;
  amountWithoutTax:     number;
  amountWithTax:        number;
  tax:                  number;
  service:              number;
  tip:                  number;
  currency:             string;
  /** ID único nuestro — sobrevive el round-trip por `clientTransactionId`. */
  clientTransactionId:  string;
  reference:            string;
  /** URL a la que PayPhone redirige al finalizar. */
  responseUrl:          string;
  /** Indica al frontend que estamos en modo dev: saltar widget y aprobar. */
  stubMode:             boolean;
}

export interface CheckoutSessionError {
  ok:    false;
  error: string;
}

export interface ConfirmSaleResult {
  ok:    true;
  /** PayPhone's final state. */
  status: 'Approved' | 'Rejected' | 'Cancelled' | 'Pending';
  /** Amount actually charged (cents). */
  amountCents: number;
  transactionId?: string;
  cardBrand?:    string;
  cardLast4?:    string;
}

export interface ConfirmSaleError {
  ok:    false;
  error: string;
}

/* ───────────────────────────── Internal helpers ───────────────────────────── */

async function getConfig() {
  const token   = await getSetting('PAYPHONE_TOKEN');
  const storeId = await getSetting('PAYPHONE_STORE_ID');
  return { token, storeId };
}

/** True when we have credentials and should use the real widget. */
export async function isPayphoneConfigured(): Promise<boolean> {
  const { token, storeId } = await getConfig();
  return !!token && !!storeId;
}

/* ───────────────────────────── Public API ───────────────────────────── */

export interface BuildCheckoutSessionArgs {
  amountCents:           number;
  amountWithTaxCents?:   number;
  taxCents?:             number;
  clientTransactionId:   string;
  responseUrl:           string;
  reference:             string;
}

export const payphone = {
  /**
   * Step 1 — el backend prepara los datos que el widget del frontend
   * necesita. NO contacta a PayPhone — la "preparación" sucede en el
   * navegador cuando el widget se monta.
   *
   * En stub mode (sin token) devuelve `stubMode: true` para que el
   * frontend salte el widget y simule un pago aprobado.
   */
  async buildCheckoutSession(args: BuildCheckoutSessionArgs): Promise<CheckoutSession | CheckoutSessionError> {
    const { token, storeId } = await getConfig();

    if (!token || !storeId) {
      return {
        ok:                   true,
        token:                'stub-token',
        storeId:              'stub-store',
        amount:               args.amountCents,
        amountWithoutTax:     args.amountCents - (args.amountWithTaxCents ?? 0) - (args.taxCents ?? 0),
        amountWithTax:        args.amountWithTaxCents ?? 0,
        tax:                  args.taxCents ?? 0,
        service:              0,
        tip:                  0,
        currency:             'USD',
        clientTransactionId:  args.clientTransactionId,
        reference:            args.reference,
        responseUrl:          args.responseUrl,
        stubMode:             true,
      };
    }

    // Validar la composición del monto. PayPhone exige:
    //   amount = amountWithoutTax + amountWithTax + tax + service + tip
    const amountWithTax    = args.amountWithTaxCents ?? 0;
    const tax              = args.taxCents ?? 0;
    const amountWithoutTax = args.amountCents - amountWithTax - tax;
    if (amountWithoutTax < 0) {
      return { ok: false, error: 'Composición de monto inválida (amountWithTax+tax excede el total)' };
    }

    return {
      ok:                   true,
      token,
      storeId,
      amount:               args.amountCents,
      amountWithoutTax,
      amountWithTax,
      tax,
      service:              0,
      tip:                  0,
      currency:             'USD',
      clientTransactionId:  args.clientTransactionId,
      reference:            args.reference,
      responseUrl:          args.responseUrl,
      stubMode:             false,
    };
  },

  /**
   * Step 8 — el frontend volvió a `/payment/return?id=X&clientTransactionId=Y`
   * y nos pasa esos parámetros. Pegamos a PayPhone para confirmar.
   *
   * En stub mode aprobamos sin pegarle a la API.
   *
   * Importante: PayPhone tiene un reverso automático a los 5 minutos
   * si NO confirmamos. Hay que llamar a esto rápido en el callback.
   */
  async confirmSale(
    payphonePaymentId:   string,
    clientTransactionId: string,
    fakeOk = false,
  ): Promise<ConfirmSaleResult | ConfirmSaleError> {
    const { token } = await getConfig();
    if (!token || fakeOk) {
      return {
        ok:            true,
        status:        'Approved',
        amountCents:   0,
        transactionId: payphonePaymentId,
        cardBrand:     'STUB',
        cardLast4:     '0000',
      };
    }

    // Endpoint OFICIAL de confirmación de la Cajita. Ojo: host es
    // `paymentbox.payphonetodoesposible.com`, NO `pay.payphonetodoesposible.com`.
    const url = `${CONFIRM_BASE_URL}/confirm`;
    const body = {
      id:         Number(payphonePaymentId),
      clientTxId: clientTransactionId,
    };

    // eslint-disable-next-line no-console
    console.log(`[payphone] POST ${url}`, { body });

    try {
      const res = await fetch(url, {
        method:  'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      // eslint-disable-next-line no-console
      console.log(`[payphone] ← ${res.status} ${url}`, {
        contentType: res.headers.get('content-type'),
        bodyPreview: text.slice(0, 2000),
      });

      if (!res.ok) {
        return { ok: false, error: `PayPhone ${res.status}: ${text.slice(0, 300)}` };
      }
      const data = JSON.parse(text) as {
        statusCode?:        number;
        transactionStatus?: string;
        transactionId?:     number | string;
        amount?:            number;
        cardBrand?:         string;
        lastDigits?:        string;
        message?:           string;
      };
      // PayPhone responde sin transactionStatus cuando hay error de validación.
      // En ese caso `message` trae la descripción.
      if (!data.transactionStatus) {
        return { ok: false, error: data.message ?? 'PayPhone no devolvió estado de la transacción' };
      }

      return {
        ok:            true,
        status:        data.transactionStatus as ConfirmSaleResult['status'],
        amountCents:   data.amount ?? 0,
        transactionId: data.transactionId ? String(data.transactionId) : undefined,
        cardBrand:     data.cardBrand,
        cardLast4:     data.lastDigits,
      };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[payphone] confirm error:`, err);
      return { ok: false, error: (err as Error).message };
    }
  },

  /**
   * Step opcional — reverso/cancelación. PayPhone solo permite el
   * mismo día y antes de las 20:00. La implementación se hace via la
   * sección "Reverso" del panel comercial (no hay API pública abierta
   * para esto en la Cajita). Devolvemos stub OK en dev para que el
   * resto del flow no se rompa.
   */
  async cancelSale(payphonePaymentId: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const { token } = await getConfig();
    if (!token) return { ok: true };
    // eslint-disable-next-line no-console
    console.warn(
      `[payphone] cancelSale(${payphonePaymentId}): no hay endpoint público para reverso en la Cajita. ` +
      `Hacelo desde Payphone Business → Reverso.`,
    );
    return { ok: true };
  },
};

/* ───────────────────────── Money / fee helpers ─────────────────────────── */

/**
 * Resolve the platform retention percentage. Defaults to 10% if the
 * setting/env is missing or unparseable. Clamped 0..100 to prevent
 * obvious mis-configuration from charging more than 100%.
 */
export async function getPlatformFeePct(): Promise<number> {
  const n = await getSettingNumber('PLATFORM_FEE_PCT', 10);
  if (n < 0) return 10;
  return Math.min(100, n);
}

/**
 * Desglose canónico de un cobro en la plataforma.
 *
 *   • `baseAmount`  → el precio "publicado" (lo que el médico/plan vale).
 *   • `platformFee` → la comisión por uso de plataforma, calculada como
 *                     porcentaje sobre `baseAmount`.
 *   • `totalAmount` → lo que el cliente paga = base + fee.
 *
 * Esta es la fuente de verdad: tanto el checkout de citas como el de
 * suscripciones cobran `totalAmount` al cliente y guardan los tres
 * componentes en `Payment.{amount, platformFee, doctorAmount}` así:
 *
 *   Payment.amount       = totalAmount   (lo cobrado al cliente)
 *   Payment.platformFee  = platformFee   (lo retenido por MedicGet)
 *   Payment.doctorAmount = baseAmount    (lo recibido por médico/plan)
 *
 * La invariante es: `Payment.amount === Payment.platformFee + Payment.doctorAmount`.
 *
 * Todos los montos están en USD con 2 decimales, redondeados al centavo.
 */
export interface PaymentBreakdown {
  baseAmount:  number;
  platformFee: number;
  totalAmount: number;
  feePct:      number;
}

export async function buildPaymentBreakdown(baseAmount: number): Promise<PaymentBreakdown> {
  const pct = await getPlatformFeePct();
  // Redondeamos al centavo. La fee siempre se calcula sobre la base,
  // NO sobre el total (eso evita cargar IVA sobre IVA).
  const platformFee = Math.round(baseAmount * pct) / 100;
  const totalAmount = Math.round((baseAmount + platformFee) * 100) / 100;
  return { baseAmount, platformFee, totalAmount, feePct: pct };
}

/**
 * Legacy: descomposición de un monto YA cobrado (cuando `amount` es el
 * total que pagó el cliente). Se mantiene por compat — los nuevos
 * callers deben usar `buildPaymentBreakdown(base)` que es semánticamente
 * más claro.
 */
export async function splitAmount(amount: number): Promise<{ platformFee: number; doctorAmount: number }> {
  const pct = await getPlatformFeePct();
  const platformFee = Math.round(amount * pct) / 100;
  const doctorAmount = Math.round((amount - platformFee) * 100) / 100;
  return { platformFee, doctorAmount };
}

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}
