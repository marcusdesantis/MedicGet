import { NextRequest } from 'next/server';
import { withAuth } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { parseBody } from '@medicget/shared/validate';
import { chatService } from '@/modules/chat/chat.service';
import { sendMessageSchema } from '@/modules/chat/chat.schemas';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/appointments/:id/messages?since=<ISO>
 *
 * Returns the chat thread for a CHAT-modality appointment along with the
 * "peer" descriptor (doctor or patient as seen from the caller's
 * perspective). Pass `since` to incrementally poll for new messages
 * without re-fetching the whole thread — the endpoint also flips the
 * `readAt` flag on messages authored by the OTHER participant as a side
 * effect, so receipts update on each call.
 */
export const GET = withAuth<{ id: string }>(
  async (req: NextRequest, { user, params }) => {
    const { id }    = params;
    const since     = req.nextUrl.searchParams.get('since') ?? undefined;
    const result    = await chatService.list(id, user, since);
    if (!result.ok) return apiError(result.code, result.message);
    return apiOk(result.data);
  },
);

/**
 * POST /api/v1/appointments/:id/messages
 *
 * Body: { content, attachmentUrl?, attachmentName?, attachmentMime? }
 *
 * Refuses to persist once the appointment is in a terminal status
 * (COMPLETED / CANCELLED / NO_SHOW). The chat thread stays visible
 * read-only after that point.
 */
export const POST = withAuth<{ id: string }>(
  async (req: NextRequest, { user, params }) => {
    const { id }   = params;
    const parsed   = await parseBody(req, sendMessageSchema);
    if ('error' in parsed) return parsed.error;
    const result   = await chatService.send(id, user, parsed.data);
    if (!result.ok) return apiError(result.code, result.message);
    return apiOk(result.data, 'Message sent', { status: 201 });
  },
);
