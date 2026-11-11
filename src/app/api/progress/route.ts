import { z } from 'zod';
import { adminStore } from '@/server/admin-store';
import {
  authorizeRequest,
  errorResponse,
  HttpError,
  readBody,
  sessionFrom,
} from '@/server/guard';
import { eventsSchema, transcriptSchema } from '@/server/schemas';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    authorizeRequest(request);
    const session = sessionFrom(request);
    if (!session.invitation)
      throw new HttpError(403, 'Diese Sitzung hat keine Einladung.');
    const input = z
      .object({
        turns: transcriptSchema,
        elapsedMs: z.number().min(0).max(660000),
        events: eventsSchema.optional(),
      })
      .parse(await readBody(request));
    adminStore().saveProgress(
      session.id,
      input.turns,
      undefined,
      input.elapsedMs,
      false,
      input.events,
    );
    return Response.json({ saved: true });
  } catch (error) {
    return errorResponse(error);
  }
}
