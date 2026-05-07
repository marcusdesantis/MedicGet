/**
 * PayPhone client wrapper.
 *
 *   PayPhone is Ecuador's main payment processor (https://www.payphone.com).
 *   We use their "Payment Box" flow:
 *
 *     1. Server  POST /api/Sale            → returns paymentId + redirectUrl
 *     2. Client  is redirected to redirectUrl, pays on PayPhone-hosted page
 *     3. PayPhone redirects back to our PAYMENT_RETURN_URL with `id` and
 *        `clientTransactionId` query params
 *     4. Server  POST /api/Sale/Confirm    → returns final status (Approved /
 *        Rejected / Cancelled). Idempotent — safe to call twice.
 *     5. Server  POST /api/Sale/Cancel     → optional, for refunds
 *
 *   The merchant token is provisioned per-store from PayPhone's commercial
 *   panel and lives in the PAYPHONE_TOKEN env var. The store id (numeric)
 *   goes in PAYPHONE_STORE_ID. The base URL switches between sandbox and
 *   production via PAYPHONE_BASE_URL — both PayPhone environments share the
 *   same auth scheme.
 *
 *   Stub fallback:
 *     If PAYPHONE_TOKEN is empty, this module returns a simulated success
 *     response so the rest of the app can be exercised end-to-end without a
 *     live merchant account. The redirect URL points to our own
 *     `/payment/return?fakeOk=1` route so the dev flow stays clickable.
 */

const STUB_BASE_URL = 'http://localhost:5173/payment/return';

export interface PrepareSaleArgs {
  /** Total in CENTS (PayPhone uses cents — $10.00 → 1000). */
  amountCents:           number;
  /** Subtotal that's subject to taxes. Same unit as `amountCents`. */
  amountWithTaxCents?:   number;
  /** Tax amount (already included in `amountCents`). */
  taxCents?:             number;
  /** Our internal id — survives the round trip via `clientTransactionId`. */
  clientTransactionId:   string;
  /** Where PayPhone redirects the user after payment (success OR failure). */
  responseUrl:           string;
  /** Where PayPhone redirects if the user explicitly cancels. */
  cancellationUrl:       string;
  /** Free-form description shown on PayPhone's UI. */
  reference:             string;
  /** Optional patient e-mail. */
  email?:                string;
  /** Optional patient phone. */
  phoneNumber?:          string;
  /** Optional patient document (DNI / RUC). */
  documentId?:           string;
}

export interface PrepareSaleResult {
  ok:        true;
  paymentId: string;   // numeric id (we store it as a string for safety)
  token:     string;
  /** URL to redirect the user to. Open in same window or new tab. */
  redirectUrl: string;
}

export interface PrepareSaleError {
  ok:    false;
  error: string;
}

export interface ConfirmSaleResult {
  ok:    true;
  /** PayPhone's final state. We map it to our PaymentStatus. */
  status: 'Approved' | 'Rejected' | 'Cancelled' | 'Pending';
  /** Amount actually charged (cents). May differ if PayPhone adjusts. */
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

import { getSetting, getSettingNumber } from './settings';

async function getConfig() {
  const token   = await getSetting('PAYPHONE_TOKEN');
  const storeId = await getSetting('PAYPHONE_STORE_ID');
  const baseUrl = await getSetting(
    'PAYPHONE_BASE_URL',
    'https://pay.payphonetodoesposible.com/api',
  );
  return { token, storeId, baseUrl: baseUrl! };
}

/** True when we have credentials and should hit the real PayPhone API. */
export async function isPayphoneConfigured(): Promise<boolean> {
  const { token, storeId } = await getConfig();
  return !!token && !!storeId;
}

async function payphoneFetch<T>(
  path:   string,
  body:   Record<string, unknown>,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const { token, baseUrl } = await getConfig();
  if (!token) {
    return { ok: false, error: 'PayPhone not configured (PAYPHONE_TOKEN missing)' };
  }

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method:  'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, error: `PayPhone ${res.status}: ${text.slice(0, 200)}` };
    }
    const json = text ? JSON.parse(text) : {};
    return { ok: true, data: json as T };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/* ───────────────────────────── Public API ───────────────────────────────── */

export const payphone = {
  /**
   * Step 1 — register the sale with PayPhone and get a redirect URL.
   *
   * In stub mode (no token), returns a fake URL pointing back at our own
   * return endpoint with `?fakeOk=1` so the rest of the flow is testable.
   */
  async prepareSale(args: PrepareSaleArgs): Promise<PrepareSaleResult | PrepareSaleError> {
    const { token, storeId } = await getConfig();

    if (!token) {
      // Stub: simulate a successful registration immediately. The "redirect
      // URL" loops straight back to our return endpoint with a magic
      // `fakeOk=1` flag the frontend uses to short-circuit the confirm.
      const fakeId = `stub-${Date.now()}`;
      const url = new URL(args.responseUrl);
      url.searchParams.set('id',                fakeId);
      url.searchParams.set('clientTransactionId', args.clientTransactionId);
      url.searchParams.set('fakeOk', '1');
      return {
        ok:           true,
        paymentId:    fakeId,
        token:        'stub-token',
        redirectUrl:  url.toString(),
      };
    }

    const body = {
      amount:            args.amountCents,
      amountWithoutTax:  0,
      amountWithTax:     args.amountWithTaxCents ?? args.amountCents,
      tax:               args.taxCents ?? 0,
      service:           0,
      tip:               0,
      currency:          'USD',
      storeId,
      clientTransactionId: args.clientTransactionId,
      responseUrl:         args.responseUrl,
      cancellationUrl:     args.cancellationUrl,
      reference:           args.reference,
      ...(args.email       && { email:        args.email }),
      ...(args.phoneNumber && { phoneNumber:  args.phoneNumber }),
      ...(args.documentId  && { documentId:   args.documentId }),
    };

    const res = await payphoneFetch<{
      payWithCard: string;
      paymentId:   number;
      paymentToken: string;
    }>('/Sale', body);

    if (!res.ok) return { ok: false, error: res.error };

    return {
      ok:          true,
      paymentId:   String(res.data.paymentId),
      token:       res.data.paymentToken,
      redirectUrl: res.data.payWithCard,
    };
  },

  /**
   * Step 2 — confirm the sale once the user has returned. Idempotent;
   * safe to call from both the redirect handler and a webhook.
   *
   * In stub mode (`fakeOk=1`) we approve unconditionally so devs can
   * exercise the post-payment flow.
   */
  async confirmSale(
    payphonePaymentId: string,
    clientTransactionId: string,
    fakeOk = false,
  ): Promise<ConfirmSaleResult | ConfirmSaleError> {
    const { token } = await getConfig();
    if (!token || fakeOk) {
      return {
        ok:          true,
        status:      'Approved',
        amountCents: 0, // caller should keep the original quoted amount
        transactionId: payphonePaymentId,
        cardBrand:   'STUB',
        cardLast4:   '0000',
      };
    }

    const res = await payphoneFetch<{
      transactionStatus: 'Approved' | 'Rejected' | 'Cancelled' | 'Pending';
      transactionId:     string;
      amount:            number;
      cardBrand?:        string;
      lastDigits?:       string;
    }>('/Sale/Confirm', {
      id:                  Number(payphonePaymentId),
      clientTxId:          clientTransactionId,
      clientTransactionId,
    });

    if (!res.ok) return { ok: false, error: res.error };

    return {
      ok:            true,
      status:        res.data.transactionStatus,
      amountCents:   res.data.amount,
      transactionId: res.data.transactionId,
      cardBrand:     res.data.cardBrand,
      cardLast4:     res.data.lastDigits,
    };
  },

  /**
   * Step 3 (optional) — issue a refund. PayPhone returns the full amount
   * to the original card; partial refunds are not supported in this
   * endpoint (use a separate /CashOut call if needed in the future).
   */
  async cancelSale(payphonePaymentId: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const { token } = await getConfig();
    if (!token) {
      // Stub: pretend refund succeeded
      return { ok: true };
    }
    const res = await payphoneFetch<unknown>('/Sale/Cancel', {
      id: Number(payphonePaymentId),
    });
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true };
  },
};

/* ───────────────────────── Money / fee helpers ─────────────────────────── */

/**
 * Resolve the platform retention percentage. Defaults to 10% if the
 * setting/env is missing or unparseable. Clamped 0..100 to prevent
 * obvious mis-configuration from charging more than 100%.
 *
 * Async because the value lives in AppSettings (DB-first) so the
 * superadmin can change it from the panel.
 */
export async function getPlatformFeePct(): Promise<number> {
  const n = await getSettingNumber('PLATFORM_FEE_PCT', 10);
  if (n < 0) return 10;
  return Math.min(100, n);
}

export async function splitAmount(amount: number): Promise<{ platformFee: number; doctorAmount: number }> {
  const pct = await getPlatformFeePct();
  const platformFee = Math.round(amount * pct) / 100;
  const doctorAmount = Math.round((amount - platformFee) * 100) / 100;
  return { platformFee, doctorAmount };
}

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}
