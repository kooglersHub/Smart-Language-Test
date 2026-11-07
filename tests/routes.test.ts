import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as create } from '@/app/api/session/route';
import { POST as chat } from '@/app/api/chat/route';
import { POST as assess } from '@/app/api/assess/route';
import { GET as status } from '@/app/api/status/route';
import { sessions } from '@/server/guard';

const fake = vi.hoisted(() => ({ nextQuestion: vi.fn(), evaluate: vi.fn() }));
vi.mock('@/server/provider', () => ({
  client: () => {
    if (!process.env.GEMINI_API_KEY) throw new Error('MissingKey');
  },
  nextQuestion: fake.nextQuestion,
  evaluate: fake.evaluate,
}));
const ids: string[] = [];
function request(path: string, body: unknown, id = '') {
  return new Request(`http://localhost:3000/api/${path}`, {
    method: 'POST',
    headers: { origin: 'http://localhost:3000', authorization: `Bearer ${id}` },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('ACCESS_CODE', '');
  vi.stubEnv('GEMINI_API_KEY', 'test-secret-never-return');
  fake.nextQuestion.mockReset();
  fake.evaluate.mockReset();
});
afterEach(() => {
  ids.forEach((id) => sessions.delete(id));
  ids.length = 0;
  vi.unstubAllEnvs();
});
async function start() {
  const response = await create(
    request('session', {
      mode: 'text',
      markdown: '## Themen\n- Alltag',
      consent: true,
    }),
  );
  const result = await response.json();
  ids.push(result.id);
  return result.id as string;
}
describe('Sitzung und Textdialog über echte Routehandler', () => {
  it('gibt den API-Schlüssel niemals im Status zurück', async () => {
    const body = await status().text();
    expect(body).toContain('"configured":true');
    expect(body).not.toContain('test-secret');
  });
  it('verweigert fehlende Einwilligung und ungültige Profile vor dem Start', async () => {
    expect(
      (
        await create(
          request('session', {
            mode: 'text',
            markdown: '## Themen\n- Alltag',
            consent: false,
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await create(
          request('session', {
            mode: 'text',
            markdown: '# Leer',
            consent: true,
          }),
        )
      ).status,
    ).toBe(400);
  });
  it('liefert bei Wiederholung desselben Requests dieselbe Frage ohne erneute Generierung', async () => {
    const id = await start();
    fake.nextQuestion
      .mockResolvedValueOnce('Was lernst du gerade?')
      .mockRejectedValue(new Error('MustNotRun'));
    const input = {
      turns: [],
      elapsedMs: 0,
      requestId: 'c6fa7b91-1d47-4fb6-8711-75ea5fb9a34d',
    };
    expect(await (await chat(request('chat', input, id))).json()).toEqual({
      text: 'Was lernst du gerade?',
    });
    expect(await (await chat(request('chat', input, id))).json()).toEqual({
      text: 'Was lernst du gerade?',
    });
  });
  it('stellt nach Ablauf keine neue Frage und stuft ein leeres Transkript nicht ein', async () => {
    const id = await start();
    expect(
      await (
        await chat(
          request(
            'chat',
            {
              turns: [],
              elapsedMs: 600000,
              requestId: 'c6fa7b91-1d47-4fb6-8711-75ea5fb9a34d',
            },
            id,
          ),
        )
      ).json(),
    ).toEqual({ text: '', finished: true });
    expect(
      (await (await assess(request('assess', { turns: [] }, id))).json())
        .assessment.level,
    ).toBe('nicht beurteilbar');
  });
});
