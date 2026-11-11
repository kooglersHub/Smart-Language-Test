import { z } from 'zod';
import { parseProfile } from '@/lib/profile';
import {
  authorizeRequest,
  authorizeOrigin,
  readBody,
  errorResponse,
  sessions,
  sessionFrom,
  HttpError,
} from '@/server/guard';
import { client } from '@/server/provider';
import { adminStore } from '@/server/admin-store';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    authorizeOrigin(request);
    const input = z
      .object({
        mode: z.enum(['voice', 'text']),
        markdown: z.string().max(32768),
        consent: z.literal(true),
        invitationToken: z.string().max(100).optional(),
      })
      .parse(await readBody(request, 65536));
    authorizeRequest(request, Boolean(input.invitationToken));
    const invitation = input.invitationToken
      ? adminStore().invitationByToken(input.invitationToken)
      : undefined;
    let profile;
    try {
      profile = parseProfile(invitation?.markdown ?? input.markdown);
    } catch (error) {
      throw new HttpError(
        400,
        error instanceof Error ? error.message : 'Ungültiges Gesprächsprofil.',
      );
    }
    client();
    const session = sessions.create(input.mode, profile);
    if (input.invitationToken) {
      try {
        adminStore().startInvitation(
          input.invitationToken,
          session.id,
          input.mode,
        );
        session.invitation = true;
      } catch (error) {
        sessions.delete(session.id);
        throw error;
      }
    }
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
    if (session.invitation) adminStore().releaseInvitation(session.id);
    sessions.delete(session.id);
    return Response.json({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
