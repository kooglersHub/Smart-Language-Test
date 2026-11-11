import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  GET as adminGet,
  POST as adminPost,
} from '@/app/api/admin/[...path]/route';
import { POST as start, DELETE as cancel } from '@/app/api/session/route';
import { POST as progress } from '@/app/api/progress/route';
import { POST as assess } from '@/app/api/assess/route';
import { adminStore } from '@/server/admin-store';
import { evaluate } from '@/server/provider';

vi.mock('@/server/provider', () => ({ client: () => ({}), evaluate: vi.fn() }));
function req(
  path: string,
  data: unknown,
  headers: Record<string, string> = {},
) {
  return new Request(`http://localhost:3000/api/${path}`, {
    method: 'POST',
    headers: {
      origin: 'http://localhost:3000',
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(data),
  });
}
beforeAll(() => {
  vi.stubEnv('DATABASE_PATH', ':memory:');
  vi.stubEnv('ADMIN_USERNAME', 'admin');
  vi.stubEnv('ADMIN_PASSWORD', 'ein-sehr-langes-passwort');
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('ACCESS_CODE', '');
});
describe('Vollständiger Einladungsablauf', () => {
  it('gibt den Link frei, wenn die Audiovorbereitung abgebrochen wird', async () => {
    const profile = adminStore().createProfile('## Themen\n- Alltag');
    const invitation = adminStore().createInvitation(profile.id, '', 14);
    const input = {
      mode: 'voice',
      markdown: '## Themen\n- Alltag',
      consent: true,
      invitationToken: invitation.token,
    };
    const session = (await (await start(req('session', input))).json()).id;
    const request = new Request('http://localhost:3000/api/session', {
      method: 'DELETE',
      headers: {
        origin: 'http://localhost:3000',
        authorization: `Bearer ${session}`,
      },
    });
    expect((await cancel(request)).status).toBe(200);
    expect((await start(req('session', input))).status).toBe(200);
  });
  it('meldet einen Speicherfehler und speichert die Auswertung bei Wiederholung', async () => {
    const profile = adminStore().createProfile('## Themen\n- Alltag');
    const invitation = adminStore().createInvitation(profile.id, 'Test', 14);
    const started = await start(
      req('session', {
        mode: 'text',
        markdown: '## Themen\n- Alltag',
        consent: true,
        invitationToken: invitation.token,
      }),
    );
    const session = (await started.json()).id;
    const turns = Array.from({ length: 5 }, (_, index) => ({
      id: `turn-${index}`,
      role: 'user',
      text: 'Ich begründe meine Meinung mit einem Beispiel.',
      phase: index === 4 ? 'transfer' : 'argument',
      status: 'final',
    }));
    vi.mocked(evaluate).mockResolvedValue({
      level: 'B2',
      b2: 'wahrscheinlich',
      summary: 'Klar.',
      strengths: [],
      improvements: [],
      criteria: [],
      evidence: [],
    });
    const failing = vi
      .spyOn(adminStore(), 'saveProgress')
      .mockImplementationOnce(() => {
        throw new Error('disk failure');
      });
    const input = { turns, elapsedMs: 6000 };
    expect(
      (
        await assess(
          req('assess', input, { authorization: `Bearer ${session}` }),
        )
      ).status,
    ).toBe(502);
    expect(
      (
        await assess(
          req('assess', input, { authorization: `Bearer ${session}` }),
        )
      ).status,
    ).toBe(200);
    expect(adminStore().getInvitation(invitation.id)?.status).toBe('completed');
    failing.mockRestore();
  });
  it('schützt Ergebnisse und speichert einen einmaligen Test nach Einwilligung', async () => {
    const denied = await adminGet(
      new Request('http://localhost:3000/api/admin/invitations'),
    );
    expect(denied.status).toBe(401);
    const login = await adminPost(
      req('admin/login', {
        username: 'admin',
        password: 'ein-sehr-langes-passwort',
      }),
    );
    expect(login.status).toBe(200);
    const cookie = login.headers.get('set-cookie')!.split(';')[0];
    const adminHeaders = { cookie };
    const created = await adminPost(
      req(
        'admin/profiles',
        { markdown: '---\ntitle: Studium\n---\n## Themen\n- Universität' },
        adminHeaders,
      ),
    );
    expect(created.status).toBe(200);
    const profile = (await created.json()).profile;
    const invited = await adminPost(
      req(
        'admin/invitations',
        { profileId: profile.id, name: 'Anna', days: 14 },
        adminHeaders,
      ),
    );
    expect(invited.status).toBe(200);
    const invitation = (await invited.json()).invitation;
    expect(invitation.token.length).toBeGreaterThanOrEqual(43);
    const input = {
      mode: 'text',
      markdown: '## Themen\n- manipuliert',
      consent: true,
      invitationToken: invitation.token,
    };
    const started = await start(req('session', input));
    expect(started.status).toBe(200);
    const session = (await started.json()).id;
    expect((await start(req('session', input))).status).toBe(410);
    const turn = {
      id: 'a',
      role: 'user',
      text: 'Ich studiere Deutsch an einer Universität.',
      phase: 'warmup',
      status: 'final',
      startMs: 1000,
      endMs: 5000,
    };
    expect(
      (
        await progress(
          req(
            'progress',
            { turns: [turn], elapsedMs: 6000 },
            { authorization: `Bearer ${session}` },
          ),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await assess(
          req(
            'assess',
            { turns: [turn], elapsedMs: 6000 },
            { authorization: `Bearer ${session}` },
          ),
        )
      ).status,
    ).toBe(200);
    const details = await adminGet(
      new Request(
        `http://localhost:3000/api/admin/invitations/${invitation.id}`,
        { headers: adminHeaders },
      ),
    );
    const saved = (await details.json()).invitation;
    expect(saved.status).toBe('completed');
    expect(JSON.parse(saved.turns)[0].text).toBe(turn.text);
    expect(JSON.parse(saved.assessment).level).toBe('nicht beurteilbar');
    expect(saved.markdown).toContain('Universität');
  });
  it('verweigert fremde Origins auch bei korrektem Login', async () => {
    const response = await adminPost(
      req(
        'admin/login',
        { username: 'admin', password: 'ein-sehr-langes-passwort' },
        { origin: 'https://fremd.example' },
      ),
    );
    expect(response.status).toBe(403);
  });
});
