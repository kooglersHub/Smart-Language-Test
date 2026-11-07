import { afterEach, describe, expect, it, vi } from 'vitest';
import { authorizeRequest, readBody, SessionStore, HttpError } from '@/server/guard';
import { conversationInstruction, assessmentInstruction } from '@/server/prompts';
import { parseProfile } from '@/lib/profile';

afterEach(() => vi.unstubAllEnvs());
const request = (origin = 'http://localhost:3000', code = '') => new Request('http://localhost:3000/api/session', { method: 'POST', headers: { origin, 'x-access-code': code }, body: '{}' });

describe('API-Zugriff', () => {
  it('verweigert fremde Origins und im Produktionsbetrieb fehlende Zugangscodes', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ACCESS_CODE', '');
    expect(() => authorizeRequest(request('https://fremd.example'))).toThrow(HttpError);
    expect(() => authorizeRequest(request())).not.toThrow();
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => authorizeRequest(request())).toThrow(HttpError);
  });
  it('verlangt den konfigurierten Zugangscode auch lokal', () => {
    vi.stubEnv('ACCESS_CODE', 'sehr-langer-geheimer-code');
    expect(() => authorizeRequest(request())).toThrow();
    expect(() => authorizeRequest(request('http://localhost:3000', 'sehr-langer-geheimer-code'))).not.toThrow();
  });
  it('begrenzt den eingelesenen Body tatsächlich statt nur dem Header zu vertrauen', async () => {
    await expect(readBody(new Request('http://localhost', { method: 'POST', body: 'x'.repeat(50) }), 32)).rejects.toThrow();
    await expect(readBody(new Request('http://localhost', { method: 'POST', body: '{"a":1}' }), 32)).resolves.toEqual({ a: 1 });
  });
});

describe('Flüchtige Sitzungen', () => {
  const profile = parseProfile('## Themen\n- Umwelt');
  it('bindet Modus und Profil, begrenzt Aufrufe und läuft ab', () => {
    let now = 100;
    const store = new SessionStore(() => now);
    const session = store.create('text', profile);
    expect(store.get(session.id).profile.topics).toEqual(['Umwelt']);
    for (let i = 0; i < 40; i++) store.consume(session.id);
    expect(() => store.consume(session.id)).toThrow();
    now = 31 * 60 * 1000;
    expect(() => store.get(session.id)).toThrow();
  });
  it('lässt fremde oder gelöschte Sitzungen nicht passieren', () => {
    const store = new SessionStore();
    expect(() => store.get('falsch')).toThrow();
    const session = store.create('voice', profile);
    store.delete(session.id);
    expect(() => store.get(session.id)).toThrow();
  });
});

describe('Feste Bewertungsanweisungen', () => {
  it('hält Gesprächsmaterial aus Systemanweisungen heraus und bewertet Text als schriftliche Interaktion', () => {
    expect(conversationInstruction('text')).toContain('Deutsch');
    expect(assessmentInstruction('text')).toContain('schriftliche');
    expect(assessmentInstruction('text')).toContain('Aussprache');
  });
});
