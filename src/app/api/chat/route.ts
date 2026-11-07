import { authorizeRequest, readBody, errorResponse, sessionFrom, sessions, HttpError } from '@/server/guard';
import { nextQuestion } from '@/server/provider';
import { chatSchema } from '@/server/schemas';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  let unlock: (() => void) | undefined;
  try {
    authorizeRequest(request);
    const session = sessionFrom(request);
    if (session.mode !== 'text') throw new HttpError(400, 'Diese Sitzung ist kein Texttest.');
    const input = chatSchema.parse(await readBody(request));
    const cached = session.replies.get(input.requestId);
    if (cached) return Response.json({ text: cached });
    if (input.elapsedMs >= 600000) return Response.json({ text: '', finished: true });
    if (session.busy) throw new HttpError(409, 'Die vorherige Anfrage wird noch verarbeitet.');
    sessions.consume(session.id); session.busy = true; unlock = () => { session.busy = false; };
    const text = await nextQuestion(session.profile, input.turns, input.elapsedMs);
    session.replies.set(input.requestId, text);
    return Response.json({ text });
  } catch (error) { return errorResponse(error); }
  finally { unlock?.(); }
}
