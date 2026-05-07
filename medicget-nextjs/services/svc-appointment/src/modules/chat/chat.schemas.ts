import { z } from 'zod';

/**
 * Body accepted by `POST /api/v1/appointments/:id/messages`.
 *
 * `content` is required (no empty messages) but capped at 2k chars to keep
 * single-line bubbles readable. Attachments are optional metadata that
 * point to a previously-uploaded asset — we don't multipart-upload through
 * this endpoint, the URL must already be public.
 */
export const sendMessageSchema = z.object({
  content:        z.string().min(1).max(2000),
  attachmentUrl:  z.string().url().optional(),
  attachmentName: z.string().max(255).optional(),
  attachmentMime: z.string().max(120).optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
