import { authorizeRequest, errorResponse, sessionFrom, sessions, HttpError } from '@/server/guard';
import { liveCredentials } from '@/server/provider';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    authorizeRequest(request);
    const session = sessionFrom(request);
    if (session.mode !== 'voice') throw new HttpError(400, 'Diese Sitzung ist kein Audiotest.');
    sessions.consume(session.id);
    return Response.json(await liveCredentials(session.profile), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
