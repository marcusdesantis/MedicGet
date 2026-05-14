import { z } from 'zod';

export const checkoutSchema = z.object({
  /**
   * URL absoluta a la que PayPhone redirige cuando termina (o cancela)
   * el pago. Apunta al `/payment/return` del frontend. Sirve también
   * para que el widget (`PPaymentButtonBox`) sepa a dónde mandar al
   * usuario tras completar el formulario.
   */
  responseUrl:     z.string().url(),
}).strict();

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/**
 * Schema del confirm. Aceptamos tanto `payphoneId` (nombre nuevo) como
 * `payphonePaymentId` (legado) para no romper integraciones viejas. La
 * validación de "al menos uno presente" la hace el service para
 * mantener el output del schema compatible con `parseBody`.
 */
export const confirmSchema = z.object({
  payphoneId:        z.string().min(1).optional(),
  payphonePaymentId: z.string().min(1).optional(),
  fakeOk:            z.boolean().optional(),
}).strict();

export type ConfirmInput = z.infer<typeof confirmSchema>;
