import { z } from 'zod';

export const checkoutSchema = z.object({
  /**
   * Where PayPhone should redirect the user once they finish (or cancel)
   * the payment. Must be an absolute URL pointing to our frontend's
   * `/payment/return` page. We accept it from the body (rather than
   * hardcoding it) because the frontend lives on a different host than
   * the API in production.
   */
  responseUrl:     z.string().url(),
  cancellationUrl: z.string().url().optional(),
}).strict();

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const confirmSchema = z.object({
  /** PayPhone's numeric paymentId, returned in the redirect query. */
  payphonePaymentId: z.string().min(1),
  /**
   * Stub flag. When PAYPHONE_TOKEN is empty the prepareSale call returns
   * `fakeOk=1` in the redirect URL. The frontend forwards it here so the
   * confirm logic short-circuits and approves immediately.
   */
  fakeOk: z.boolean().optional(),
}).strict();

export type ConfirmInput = z.infer<typeof confirmSchema>;
