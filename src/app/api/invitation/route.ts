import { z } from 'zod';
import { adminStore } from '@/server/admin-store';
import { authorizeOrigin, errorResponse, readBody } from '@/server/guard';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    authorizeOrigin(request);
    const { token } = z
      .object({ token: z.string().max(100) })
      .parse(await readBody(request, 2048));
    const invitation = adminStore().invitationByToken(token);
    return Response.json(
      {
        name: invitation.name,
        markdown: invitation.markdown,
        title: invitation.profile_title,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Referrer-Policy': 'no-referrer',
        },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
