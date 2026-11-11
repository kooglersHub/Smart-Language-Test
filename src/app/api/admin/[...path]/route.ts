import { z } from 'zod';
import { adminStore } from '@/server/admin-store';
import {
  authorizeOrigin,
  errorResponse,
  HttpError,
  readBody,
} from '@/server/guard';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cookieValue(request: Request) {
  return (
    request.headers
      .get('cookie')
      ?.split(';')
      .map((v) => v.trim())
      .find((v) => v.startsWith('sprachraum_admin='))
      ?.slice('sprachraum_admin='.length) ?? ''
  );
}
function pathParts(request: Request) {
  return new URL(request.url).pathname.split('/').filter(Boolean).slice(2);
}
function cookie(value: string, maxAge: number) {
  return `sprachraum_admin=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}
function authorized(request: Request) {
  if (!adminStore().isAuthenticated(cookieValue(request)))
    throw new HttpError(401, 'Bitte melde dich an.');
}

export async function GET(request: Request) {
  try {
    const [resource, id] = pathParts(request);
    if (resource === 'session')
      return Response.json(
        { authenticated: adminStore().isAuthenticated(cookieValue(request)) },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    authorized(request);
    if (resource === 'profiles')
      return Response.json({ profiles: adminStore().listProfiles() });
    if (resource === 'invitations' && id) {
      const invitation = adminStore().getInvitation(id);
      if (!invitation) throw new HttpError(404, 'Einladung nicht gefunden.');
      return Response.json(
        { invitation },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    if (resource === 'invitations')
      return Response.json(
        { invitations: adminStore().listInvitations() },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    throw new HttpError(404, 'Nicht gefunden.');
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    authorizeOrigin(request);
    const [resource, id, action] = pathParts(request);
    if (resource === 'login') {
      const input = z
        .object({
          username: z.string().max(120),
          password: z.string().max(1024),
        })
        .parse(await readBody(request, 4096));
      const store = adminStore();
      store.bootstrap(
        process.env.ADMIN_USERNAME ?? '',
        process.env.ADMIN_PASSWORD ?? '',
      );
      const session = store.login(
        input.username,
        input.password,
        'admin-login',
      );
      return Response.json(
        { ok: true },
        {
          headers: {
            'Set-Cookie': cookie(session, 28800),
            'Cache-Control': 'no-store',
          },
        },
      );
    }
    authorized(request);
    if (resource === 'logout') {
      adminStore().logout(cookieValue(request));
      return Response.json(
        { ok: true },
        { headers: { 'Set-Cookie': cookie('', 0) } },
      );
    }
    if (resource === 'profiles') {
      const input = z
        .object({ markdown: z.string().max(32768) })
        .parse(await readBody(request, 65536));
      try {
        return Response.json({
          profile: adminStore().createProfile(input.markdown),
        });
      } catch (error) {
        throw new HttpError(
          400,
          error instanceof Error ? error.message : 'Ungültiges Profil.',
        );
      }
    }
    if (resource === 'invitations' && id && action === 'revoke') {
      adminStore().revokeInvitation(id);
      return Response.json({ ok: true });
    }
    if (resource === 'invitations') {
      const input = z
        .object({
          profileId: z.string().uuid(),
          name: z.string().trim().max(120),
          days: z.number().int().min(1).max(90),
        })
        .parse(await readBody(request, 4096));
      return Response.json(
        {
          invitation: adminStore().createInvitation(
            input.profileId,
            input.name,
            input.days,
          ),
        },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    throw new HttpError(404, 'Nicht gefunden.');
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(request: Request) {
  try {
    authorizeOrigin(request);
    authorized(request);
    const [resource, id] = pathParts(request);
    if (!id) throw new HttpError(400, 'Kennung fehlt.');
    if (resource === 'profiles') adminStore().deleteProfile(id);
    else if (resource === 'invitations') adminStore().deleteInvitation(id);
    else throw new HttpError(404, 'Nicht gefunden.');
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
