import { DatabaseSync } from 'node:sqlite';
import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { parseProfile } from '@/lib/profile';
import type { Assessment, Mode, Turn, SessionEvent } from '@/lib/types';
import { HttpError } from './guard';

const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('base64url');
const retention = 90 * 86400000;
type ProfileRow = {
  id: string;
  title: string;
  markdown: string;
  created_at: number;
};
type InviteRow = {
  id: string;
  token_hash: string;
  name: string;
  markdown: string;
  profile_title: string;
  created_at: number;
  expires_at: number;
  updated_at: number;
  status: string;
  session_id: string | null;
  mode: Mode | null;
  turns: string;
  events: string;
  assessment: string | null;
  elapsed_ms: number;
  completed_at: number | null;
};

export class AdminStore {
  private db: DatabaseSync;
  private cleanupTimer: ReturnType<typeof setInterval>;
  constructor(filename: string) {
    if (filename !== ':memory:')
      mkdirSync(path.dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, title TEXT NOT NULL, markdown TEXT NOT NULL, created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS invitations (id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, name TEXT NOT NULL, markdown TEXT NOT NULL, profile_title TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, status TEXT NOT NULL, session_id TEXT UNIQUE, mode TEXT, turns TEXT NOT NULL DEFAULT '[]', assessment TEXT, elapsed_ms INTEGER NOT NULL DEFAULT 0, completed_at INTEGER);
      CREATE TABLE IF NOT EXISTS admin_account (id INTEGER PRIMARY KEY CHECK(id=1), username TEXT NOT NULL, salt TEXT NOT NULL, password_hash TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires_at INTEGER NOT NULL);`);
    const columns = this.db.prepare('PRAGMA table_info(invitations)').all() as {
      name: string;
    }[];
    if (!columns.some((column) => column.name === 'events'))
      this.db.exec(
        "ALTER TABLE invitations ADD COLUMN events TEXT NOT NULL DEFAULT '[]'",
      );
    this.cleanup();
    this.cleanupTimer = setInterval(() => this.cleanup(), 3600000);
    this.cleanupTimer.unref();
  }
  close() {
    clearInterval(this.cleanupTimer);
    this.db.close();
  }
  bootstrap(username: string, password: string) {
    if (this.db.prepare('SELECT id FROM admin_account WHERE id=1').get())
      return;
    if (!username.trim() || password.length < 16)
      throw new HttpError(
        503,
        'ADMIN_USERNAME und ein ADMIN_PASSWORD mit mindestens 16 Zeichen müssen eingerichtet sein.',
      );
    const salt = randomBytes(16).toString('hex');
    const digest = scryptSync(password, salt, 64).toString('hex');
    this.db
      .prepare('INSERT OR IGNORE INTO admin_account VALUES (1, ?, ?, ?)')
      .run(username.trim(), salt, digest);
  }
  login(username: string, password: string, attemptKey: string) {
    const now = Date.now();
    this.db
      .prepare('DELETE FROM login_attempts WHERE expires_at <= ?')
      .run(now);
    const key = hash(attemptKey);
    const attempts = this.db
      .prepare('SELECT attempts FROM login_attempts WHERE key=?')
      .get(key) as { attempts: number } | undefined;
    if ((attempts?.attempts ?? 0) >= 8)
      throw new HttpError(
        429,
        'Zu viele Anmeldeversuche. Bitte warte 15 Minuten.',
      );
    const account = this.db
      .prepare(
        'SELECT username,salt,password_hash FROM admin_account WHERE id=1',
      )
      .get() as
      { username: string; salt: string; password_hash: string } | undefined;
    const salt = account?.salt ?? '00000000000000000000000000000000';
    const candidate = scryptSync(password.slice(0, 1024), salt, 64);
    const expected = Buffer.from(
      account?.password_hash ?? '0'.repeat(128),
      'hex',
    );
    if (
      !account ||
      account.username !== username ||
      !timingSafeEqual(candidate, expected)
    ) {
      this.db
        .prepare(
          'INSERT INTO login_attempts VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1',
        )
        .run(key, now + 900000);
      throw new HttpError(401, 'Benutzername oder Passwort ist falsch.');
    }
    this.db.prepare('DELETE FROM login_attempts WHERE key=?').run(key);
    const value = token();
    this.db
      .prepare('INSERT INTO admin_sessions VALUES (?,?)')
      .run(hash(value), now + 8 * 3600000);
    return value;
  }
  isAuthenticated(value: string) {
    if (!value) return false;
    return Boolean(
      this.db
        .prepare(
          'SELECT token_hash FROM admin_sessions WHERE token_hash=? AND expires_at>?',
        )
        .get(hash(value), Date.now()),
    );
  }
  logout(value: string) {
    this.db
      .prepare('DELETE FROM admin_sessions WHERE token_hash=?')
      .run(hash(value));
  }
  createProfile(markdown: string) {
    const profile = parseProfile(markdown);
    const row = {
      id: randomUUID(),
      title: profile.title,
      markdown,
      created_at: Date.now(),
    };
    this.db
      .prepare('INSERT INTO profiles VALUES (?,?,?,?)')
      .run(row.id, row.title, row.markdown, row.created_at);
    return row;
  }
  listProfiles() {
    return this.db
      .prepare(
        'SELECT id,title,created_at FROM profiles ORDER BY created_at DESC',
      )
      .all();
  }
  deleteProfile(id: string) {
    this.db.prepare('DELETE FROM profiles WHERE id=?').run(id);
  }
  createInvitation(profileId: string, name: string, days: number) {
    const profile = this.db
      .prepare('SELECT * FROM profiles WHERE id=?')
      .get(profileId) as ProfileRow | undefined;
    if (!profile)
      throw new HttpError(404, 'Das Themenprofil wurde nicht gefunden.');
    const value = token();
    const id = randomUUID();
    const now = Date.now();
    this.db
      .prepare(
        "INSERT INTO invitations (id,token_hash,name,markdown,profile_title,created_at,expires_at,updated_at,status) VALUES (?,?,?,?,?,?,?,?,'pending')",
      )
      .run(
        id,
        hash(value),
        name.trim(),
        profile.markdown,
        profile.title,
        now,
        now + days * 86400000,
        now,
      );
    return { id, token: value };
  }
  invitationByToken(value: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(value))
      throw new HttpError(
        404,
        'Dieser Einladungslink ist ungültig oder abgelaufen.',
      );
    const row = this.db
      .prepare('SELECT * FROM invitations WHERE token_hash=?')
      .get(hash(value)) as InviteRow | undefined;
    if (!row || row.status !== 'pending' || row.expires_at <= Date.now())
      throw new HttpError(
        410,
        'Dieser Einladungslink ist abgelaufen oder wurde bereits verwendet.',
      );
    return row;
  }
  startInvitation(value: string, sessionId: string, mode: Mode) {
    const row = this.invitationByToken(value);
    const result = this.db
      .prepare(
        "UPDATE invitations SET status='started',session_id=?,mode=?,updated_at=? WHERE id=? AND status='pending' AND expires_at>?",
      )
      .run(sessionId, mode, Date.now(), row.id, Date.now());
    if (result.changes !== 1)
      throw new HttpError(409, 'Dieser Test wurde bereits gestartet.');
    return row;
  }
  releaseInvitation(sessionId: string) {
    this.db
      .prepare(
        "UPDATE invitations SET status='pending',session_id=NULL,mode=NULL,updated_at=? WHERE session_id=? AND status='started' AND turns='[]' AND events='[]' AND elapsed_ms=0 AND expires_at>?",
      )
      .run(Date.now(), sessionId, Date.now());
  }
  saveProgress(
    sessionId: string,
    turns: Turn[],
    assessment: Assessment | undefined,
    elapsedMs: number,
    completed: boolean,
    events?: SessionEvent[],
  ) {
    const result = this.db
      .prepare(
        "UPDATE invitations SET turns=?, events=COALESCE(?,events), assessment=COALESCE(?,assessment), elapsed_ms=?, status=CASE WHEN ? THEN 'completed' ELSE status END, completed_at=CASE WHEN ? THEN ? ELSE completed_at END,updated_at=? WHERE session_id=? AND status='started' AND (?=1 OR elapsed_ms<=?)",
      )
      .run(
        JSON.stringify(turns),
        events ? JSON.stringify(events) : null,
        assessment ? JSON.stringify(assessment) : null,
        elapsedMs,
        completed ? 1 : 0,
        completed ? 1 : 0,
        Date.now(),
        Date.now(),
        sessionId,
        completed ? 1 : 0,
        elapsedMs,
      );
    if (completed && result.changes !== 1)
      throw new HttpError(
        409,
        'Das Ergebnis konnte nicht gespeichert werden. Die Einladung ist nicht mehr aktiv.',
      );
  }
  listInvitations() {
    this.cleanup();
    return this.db
      .prepare(
        "SELECT id,name,profile_title,created_at,expires_at,updated_at,CASE WHEN status='pending' AND expires_at<=? THEN 'expired' ELSE status END AS status,mode,assessment,elapsed_ms,completed_at FROM invitations ORDER BY created_at DESC",
      )
      .all(Date.now()) as unknown as InviteRow[];
  }
  getInvitation(id: string) {
    return this.db
      .prepare(
        'SELECT id,name,profile_title,markdown,created_at,expires_at,updated_at,status,mode,turns,events,assessment,elapsed_ms,completed_at FROM invitations WHERE id=?',
      )
      .get(id) as InviteRow | undefined;
  }
  revokeInvitation(id: string) {
    this.db
      .prepare(
        "UPDATE invitations SET status='revoked',updated_at=? WHERE id=? AND status='pending'",
      )
      .run(Date.now(), id);
  }
  deleteInvitation(id: string) {
    this.db.prepare('DELETE FROM invitations WHERE id=?').run(id);
  }
  cleanup() {
    const now = Date.now();
    this.db.prepare('DELETE FROM admin_sessions WHERE expires_at<=?').run(now);
    this.db.prepare('DELETE FROM login_attempts WHERE expires_at<=?').run(now);
    this.db
      .prepare(
        "DELETE FROM invitations WHERE (status IN ('completed','started','revoked') AND updated_at<?) OR (status='pending' AND expires_at<?)",
      )
      .run(now - retention, now - retention);
  }
}
const globalDb = globalThis as typeof globalThis & { adminStore?: AdminStore };
export function adminStore() {
  return (globalDb.adminStore ??= new AdminStore(
    process.env.DATABASE_PATH ||
      path.join(process.cwd(), 'data', 'sprachraum.sqlite'),
  ));
}
