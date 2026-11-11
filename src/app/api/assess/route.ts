import { z } from 'zod';
import {
  authorizeRequest,
  readBody,
  errorResponse,
  sessionFrom,
  sessions,
  HttpError,
} from '@/server/guard';
import { evaluate } from '@/server/provider';
import { hasEvidence, insufficientAssessment } from '@/lib/assessment';
import { eventsSchema, transcriptSchema } from '@/server/schemas';
import { adminStore } from '@/server/admin-store';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  let unlock: (() => void) | undefined;
  try {
    authorizeRequest(request);
    const session = sessionFrom(request);
    const input = z
      .object({
        turns: transcriptSchema,
        elapsedMs: z.number().min(0).max(660000).optional(),
        events: eventsSchema.optional(),
      })
      .parse(await readBody(request));
    if (!hasEvidence(input.turns)) {
      const assessment = insufficientAssessment();
      if (session.invitation)
        adminStore().saveProgress(
          session.id,
          input.turns,
          assessment,
          input.elapsedMs ?? 0,
          true,
          input.events,
        );
      return Response.json({ assessment });
    }
    if (session.assessment)
      return Response.json({ assessment: session.assessment });
    if (session.busy)
      throw new HttpError(
        409,
        'Die vorherige Anfrage wird noch verarbeitet. Bitte wiederhole die Auswertung kurz danach.',
      );
    sessions.consume(session.id);
    session.busy = true;
    unlock = () => {
      session.busy = false;
    };
    const assessment = await evaluate(session.mode, input.turns);
    if (session.invitation)
      adminStore().saveProgress(
        session.id,
        input.turns,
        assessment,
        input.elapsedMs ?? 0,
        true,
        input.events,
      );
    session.assessment = assessment;
    return Response.json({ assessment });
  } catch (error) {
    return errorResponse(error);
  } finally {
    unlock?.();
  }
}
