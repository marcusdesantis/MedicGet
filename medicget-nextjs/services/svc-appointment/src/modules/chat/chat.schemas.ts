import { z } from 'zod';

/** Tipos MIME permitidos para adjuntos del chat. */
const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
] as const;

/** ~6.7 MB para cubrir un PDF de 5 MB en base64 + headers del dataURL. */
const MAX_ATTACHMENT_BYTES = 7_000_000;

/**
 * Body accepted by `POST /api/v1/appointments/:id/messages`.
 *
 * `content` puede estar VACÍO si hay un attachment (ej: el usuario
 * sólo manda una imagen sin texto). Si NO hay attachment, content
 * debe tener al menos 1 char.
 *
 * `attachmentUrl` acepta dataURL (`data:image/jpeg;base64,...`)
 * generado client-side, o una URL https si en el futuro migramos a
 * S3/Cloudinary. El MIME se valida contra ALLOWED_MIMES — sólo
 * imágenes y PDFs.
 */
export const sendMessageSchema = z
  .object({
    // `content` requerido pero puede ser string vacío. Sin `.default()`
    // ni `.optional()` para que TS infiera el output type como
    // `content: string` (no `string | undefined`) y los call sites no
    // tengan que manejar el caso undefined.
    content:        z.string().max(2000),
    attachmentUrl:  z.string().max(MAX_ATTACHMENT_BYTES).optional(),
    attachmentName: z.string().max(255).optional(),
    attachmentMime: z.enum(ALLOWED_MIMES).optional(),
  })
  .refine(
    (v) => v.content.trim().length > 0 || (v.attachmentUrl && v.attachmentMime),
    { message: 'El mensaje debe tener texto o un archivo adjunto.' },
  );

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
