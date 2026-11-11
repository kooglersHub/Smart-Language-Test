import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { ExamProfile, Mode } from '@/lib/types';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function authorizeOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const url = new URL(request.url);
  // Next can reconstruct the internal URL with localhost even for a loopback
  // request to 127.0.0.1. The browser-visible Host is the CSRF boundary.
  const expectedOrigin =
    process.env.APP_ORIGIN ||
    `${url.protocol}//${request.headers.get('host') || url.host}`;
  if (!origin || origin !== expectedOrigin)
    throw new HttpError(403, 'Diese Anfrage stammt nicht von der Testseite.');
  return expectedOrigin;
}
export function authorizeRequest(request: Request, invitation = false) {
  const expectedOrigin = authorizeOrigin(request);
  const sessionId =
    request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/)?.[1] ?? '';
  if (invitation || (sessionId && sessions.get(sessionId).invitation)) return;
  const code = process.env.ACCESS_CODE ?? '';
  if (process.env.NODE_ENV === 'production' && code.length < 16)
    throw new HttpError(
      503,
      'Für den Produktivbetrieb muss ein ACCESS_CODE mit mindestens 16 Zeichen eingerichtet sein.',
    );
  if (code) {
    const supplied = Buffer.from(request.headers.get('x-access-code') ?? '');
    const expected = Buffer.from(code);
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    )
      throw new HttpError(401, 'Bitte gib den richtigen Zugangscode ein.');
  } else if (
    !['localhost', '127.0.0.1', '[::1]'].includes(
      new URL(expectedOrigin).hostname,
    )
  ) {
    throw new HttpError(
      503,
      'Öffentlicher Zugriff erfordert einen Zugangscode.',
    );
  }
}

export async function readBody(
  request: Request,
  limit = 131072,
): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Die Anfrage enthält keine Daten.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new HttpError(413, 'Die Anfrage ist zu groß.');
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'Die Anfrage enthält ungültiges JSON.');
  } finally {
    reader.releaseLock();
  }
}

interface ServerSession {
  id: string;
  mode: Mode;
  profile: ExamProfile;
  createdAt: number;
  requests: number;
  busy: boolean;
  replies: Map<string, string>;
  assessment?: unknown;
  invitation?: boolean;
}
export class SessionStore {
  private sessions = new Map<string, ServerSession>();
  private expirations = new Map<string, ReturnType<typeof setTimeout>>();
  private starts: number[] = [];
  constructor(private now = () => Date.now()) {}
  create(mode: Mode, profile: ExamProfile) {
    for (const [id, session] of this.sessions)
      if (this.now() - session.createdAt > 1800000) this.delete(id);
    this.starts = this.starts.filter((t) => this.now() - t < 60000);
    if (this.starts.length >= 10 || this.sessions.size >= 100)
      throw new HttpError(
        429,
        'Momentan sind zu viele Prüfungen aktiv. Bitte versuche es später erneut.',
      );
    this.starts.push(this.now());
    const session: ServerSession = {
      id: randomUUID(),
      mode,
      profile,
      createdAt: this.now(),
      requests: 0,
      busy: false,
      replies: new Map(),
    };
    this.sessions.set(session.id, session);
    const expiration = setTimeout(() => this.delete(session.id), 1800000);
    expiration.unref();
    this.expirations.set(session.id, expiration);
    return session;
  }
  get(id: string) {
    const session = this.sessions.get(id);
    if (!session || this.now() - session.createdAt > 1800000) {
      this.delete(id);
      throw new HttpError(
        401,
        'Die Sitzung ist abgelaufen. Bitte exportiere dein Transkript und starte neu.',
      );
    }
    return session;
  }
  consume(id: string) {
    const session = this.get(id);
    if (++session.requests > 40)
      throw new HttpError(
        429,
        'Das Anfragelimit dieser Sitzung wurde erreicht.',
      );
    return session;
  }
  delete(id: string) {
    clearTimeout(this.expirations.get(id));
    this.expirations.delete(id);
    this.sessions.delete(id);
  }
}
const globalStore = globalThis as typeof globalThis & {
  examSessions?: SessionStore;
};
export const sessions = (globalStore.examSessions ??= new SessionStore());
export function sessionFrom(request: Request) {
  const token =
    request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  return sessions.get(token);
}
export function errorResponse(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && error.name === 'ZodError')
    return Response.json(
      { error: 'Die übermittelten Prüfungsdaten sind ungültig.' },
      { status: 400 },
    );
  // Provider errors may include request data. Only an error category reaches logs.
  console.error(
    'exam_request_failed',
    error instanceof Error ? error.name : 'UnknownError',
  );
  return Response.json(
    {
      error:
        'Der KI-Dienst konnte die Anfrage nicht abschließen. Prüfe Zugang, Modell und Kontingent und versuche es erneut.',
    },
    { status: 502 },
  );
}
