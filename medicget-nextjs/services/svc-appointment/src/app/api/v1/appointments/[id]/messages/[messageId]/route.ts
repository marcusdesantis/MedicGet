import { NextRequest } from 'next/server';
import { withAuth } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { chatService } from '@/modules/chat/chat.service';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/v1/appointments/:id/messages/:messageId
 *
 * Soft-deletes a message authored by the caller. The row stays in the
 * DB so audit trails are preserved but the UI hides it ("This message
 * was deleted"). Only the sender can delete their own message.
 */
export const DELETE = withAuth<{ id: string; messageId: string }>(
  async (_req: NextRequest, { user, params }) => {
    const { id, messageId } = params;
    const result = await chatService.deleteMessage(id, messageId, user);
    if (!result.ok) return apiError(result.code, result.message);
    return apiOk(result.data, 'Message deleted');
  },
);
