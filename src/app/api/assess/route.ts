import { z } from 'zod';
import { authorizeRequest, readBody, errorResponse, sessionFrom, sessions, HttpError } from '@/server/guard';
import { evaluate } from '@/server/provider';
import { hasEvidence, insufficientAssessment } from '@/lib/assessment';
import { transcriptSchema } from '@/server/schemas';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  let unlock: (() => void) | undefined;
  try {
    authorizeRequest(request);
    const session = sessionFrom(request);
    const input = z.object({ turns: transcriptSchema }).parse(await readBody(request));
    if (!hasEvidence(input.turns)) return Response.json({ assessment: insufficientAssessment() });
    if (session.assessment) return Response.json({ assessment: session.assessment });
    if (session.busy) throw new HttpError(409, 'Die vorherige Anfrage wird noch verarbeitet. Bitte wiederhole die Auswertung kurz danach.');
    sessions.consume(session.id); session.busy = true; unlock = () => { session.busy = false; };
    session.assessment = await evaluate(session.mode, input.turns);
    return Response.json({ assessment: session.assessment });
  } catch (error) { return errorResponse(error); }
  finally { unlock?.(); }
}
