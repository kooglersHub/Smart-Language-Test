import { z } from 'zod';
import { parseProfile } from '@/lib/profile';
import {
  authorizeRequest,
  readBody,
  errorResponse,
  sessions,
  sessionFrom,
  HttpError,
} from '@/server/guard';
import { client } from '@/server/provider';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    authorizeRequest(request);
    const input = z
      .object({
        mode: z.enum(['voice', 'text']),
        markdown: z.string().max(32768),
        consent: z.literal(true),
      })
      .parse(await readBody(request, 65536));
    let profile;
    try {
      profile = parseProfile(input.markdown);
    } catch (error) {
      throw new HttpError(
        400,
        error instanceof Error ? error.message : 'Ungültiges Gesprächsprofil.',
      );
    }
    client();
    const session = sessions.create(input.mode, profile);
    return Response.json(
      { id: session.id },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(request: Request) {
  try {
    authorizeRequest(request);
    const session = sessionFrom(request);
    sessions.delete(session.id);
    return Response.json({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
