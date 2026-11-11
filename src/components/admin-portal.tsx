'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  AudioLines,
  ArrowLeft,
  ArrowUpRight,
  Check,
  Clipboard,
  FileText,
  Link2,
  LockKeyhole,
  LogOut,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import type { Assessment, Turn, SessionEvent } from '@/lib/types';
import { Transcript } from './transcript';

type Profile = { id: string; title: string; created_at: number };
type Invitation = {
  id: string;
  name: string;
  profile_title: string;
  created_at: number;
  expires_at: number;
  status: string;
  mode: 'voice' | 'text' | null;
  assessment: string | null;
  turns?: string;
  events?: string;
  completed_at?: number | null;
  elapsed_ms: number;
  markdown?: string;
};
const labels: Record<string, string> = {
  pending: 'Bereit',
  started: 'In Bearbeitung',
  completed: 'Abgeschlossen',
  revoked: 'Widerrufen',
  expired: 'Abgelaufen',
};
const date = (value: number) =>
  new Date(value).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
const dateTime = (value: number) =>
  new Date(value).toLocaleString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export function AdminPortal() {
  const [authenticated, setAuthenticated] = useState<boolean>();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [selectedProfile, setSelectedProfile] = useState('');
  const [name, setName] = useState('');
  const [days, setDays] = useState(14);
  const [createdLink, setCreatedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [detail, setDetail] = useState<Invitation>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const call = useCallback(
    async <T,>(path: string, options?: RequestInit): Promise<T> => {
      const response = await fetch(`/api/admin/${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        cache: 'no-store',
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? 'Die Anfrage ist fehlgeschlagen.');
      return body;
    },
    [],
  );
  const refresh = useCallback(async () => {
    const [profileData, inviteData] = await Promise.all([
      call<{ profiles: Profile[] }>('profiles'),
      call<{ invitations: Invitation[] }>('invitations'),
    ]);
    setProfiles(profileData.profiles);
    setInvitations(inviteData.invitations);
    setSelectedProfile((previous) =>
      profileData.profiles.some((profile) => profile.id === previous)
        ? previous
        : profileData.profiles[0]?.id || '',
    );
  }, [call]);
  useEffect(() => {
    void call<{ authenticated: boolean }>('session')
      .then((result) => {
        setAuthenticated(result.authenticated);
        if (result.authenticated)
          void refresh().catch((reason) => setError(reason.message));
      })
      .catch(() => {
        setAuthenticated(false);
        setError('Der Verwaltungsbereich ist nicht erreichbar.');
      });
  }, [call, refresh]);
  const perform = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Die Aktion ist fehlgeschlagen.',
      );
    } finally {
      setBusy(false);
    }
  };
  const login = (event: React.FormEvent) => {
    event.preventDefault();
    void perform(async () => {
      await call('login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setPassword('');
      setAuthenticated(true);
      await refresh();
    });
  };
  const logout = () =>
    void perform(async () => {
      await call('logout', { method: 'POST' });
      setAuthenticated(false);
      setDetail(undefined);
      setCreatedLink('');
    });
  const upload = (file?: File) => {
    if (!file) return;
    void perform(async () => {
      if (!file.name.toLowerCase().endsWith('.md') || file.size > 32768)
        throw new Error('Bitte wähle eine Markdown-Datei bis 32 KiB.');
      const markdown = new TextDecoder('utf-8', { fatal: true }).decode(
        await file.arrayBuffer(),
      );
      await call('profiles', {
        method: 'POST',
        body: JSON.stringify({ markdown }),
      });
      await refresh();
    });
  };
  const create = (event: React.FormEvent) => {
    event.preventDefault();
    void perform(async () => {
      const result = await call<{ invitation: { token: string } }>(
        'invitations',
        {
          method: 'POST',
          body: JSON.stringify({ profileId: selectedProfile, name, days }),
        },
      );
      setCreatedLink(
        `${window.location.origin}/bewerbung#${result.invitation.token}`,
      );
      setCopied(false);
      setName('');
      await refresh();
    });
  };
  const action = (path: string, method: 'POST' | 'DELETE') =>
    void perform(async () => {
      await call(path, { method });
      setDetail(undefined);
      await refresh();
    });
  const openDetail = (id: string) =>
    void perform(async () => {
      const result = await call<{ invitation: Invitation }>(
        `invitations/${id}`,
      );
      setDetail(result.invitation);
    });
  const copy = () =>
    void perform(async () => {
      await navigator.clipboard.writeText(createdLink);
      setCopied(true);
    });
  const assessment: Assessment | undefined = detail?.assessment
    ? JSON.parse(detail.assessment)
    : undefined;
  const turns: Turn[] = detail?.turns ? JSON.parse(detail.turns) : [];
  const events: SessionEvent[] = detail?.events
    ? JSON.parse(detail.events)
    : [];
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link className="brand" href="/">
          <span className="brand-icon">
            <AudioLines size={22} />
          </span>
          sprachraum<span className="brand-period">.</span>
        </Link>
        <div className="admin-header-right">
          <span className="admin-header-label">VERWALTUNG</span>
          {authenticated && (
            <button className="admin-link" onClick={logout}>
              <LogOut size={16} /> Abmelden
            </button>
          )}
        </div>
      </header>
      {authenticated === undefined ? (
        <main className="admin-loading">Verwaltung wird geladen …</main>
      ) : !authenticated ? (
        <main className="admin-login-wrap">
          <section className="admin-login">
            <div className="admin-lock">
              <LockKeyhole size={23} />
            </div>
            <div className="eyebrow">DEIN GESCHÜTZTER BEREICH</div>
            <h1>
              Willkommen
              <br />
              <span>zurück.</span>
            </h1>
            <p>Verwalte Themen, Einladungen und Ergebnisse an einem Ort.</p>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <form onSubmit={login}>
              <label className="admin-field">
                Benutzername
                <input
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </label>
              <label className="admin-field">
                Passwort
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>
              <button className="primary admin-full" disabled={busy}>
                {busy ? 'Einen Moment …' : 'Anmelden'}{' '}
                <ArrowUpRight size={17} />
              </button>
            </form>
            <Link href="/" className="admin-back">
              <ArrowLeft size={15} /> Zum Sprachtest
            </Link>
          </section>
          <div className="admin-login-aside">
            <span>SPRACHRAUM FÜR TEAMS</span>
            <h2>
              Gute Gespräche
              <br />
              <em>beginnen hier.</em>
            </h2>
            <p>
              Ein klarer Überblick über jede Einladung – vom ersten Kontakt bis
              zur persönlichen Einschätzung.
            </p>
            <div className="admin-decoration">
              <AudioLines size={100} strokeWidth={0.8} />
            </div>
          </div>
        </main>
      ) : (
        <main className="admin-main">
          <div className="admin-title-row">
            <div>
              <div className="eyebrow">
                <span className="tiny-dot" /> DEIN ARBEITSBEREICH
              </div>
              <h1>
                Menschen im <span>Mittelpunkt.</span>
              </h1>
              <p>Verwalte deine Sprachtests, Einladungen und Ergebnisse.</p>
            </div>
            <button
              className="secondary"
              onClick={() => void perform(refresh)}
              disabled={busy}
            >
              <RefreshCw size={15} /> Aktualisieren
            </button>
          </div>
          {error && (
            <div className="error admin-error" role="alert">
              {error}
            </div>
          )}
          <div className="admin-metrics">
            <div>
              <span>THEMENPROFILE</span>
              <strong>{profiles.length.toString().padStart(2, '0')}</strong>
              <FileText size={19} />
            </div>
            <div>
              <span>OFFENE EINLADUNGEN</span>
              <strong>
                {invitations
                  .filter((i) => i.status === 'pending')
                  .length.toString()
                  .padStart(2, '0')}
              </strong>
              <Link2 size={19} />
            </div>
            <div>
              <span>ABGESCHLOSSENE TESTS</span>
              <strong>
                {invitations
                  .filter((i) => i.status === 'completed')
                  .length.toString()
                  .padStart(2, '0')}
              </strong>
              <Users size={19} />
            </div>
          </div>
          <div className="admin-columns">
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <div>
                  <span className="small-label">01 · GRUNDLAGE</span>
                  <h2>Deine Themen</h2>
                  <p>Bestimme, worüber gesprochen wird.</p>
                </div>
                <FileText size={20} />
              </div>
              <label className="admin-upload">
                <Upload size={21} />
                <strong>Markdown-Datei hochladen</strong>
                <span>.md · maximal 32 KiB</span>
                <input
                  type="file"
                  accept=".md,text/markdown"
                  disabled={busy}
                  onChange={(e) => {
                    upload(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </label>
              {profiles.length ? (
                <div className="admin-profile-list">
                  {profiles.map((profile) => (
                    <div key={profile.id}>
                      <span className="admin-file-icon">
                        <FileText size={16} />
                      </span>
                      <span>
                        <strong>{profile.title}</strong>
                        <small>Hinzugefügt am {date(profile.created_at)}</small>
                      </span>
                      <button
                        aria-label={`${profile.title} löschen`}
                        className="icon-button"
                        onClick={() => {
                          if (
                            window.confirm(
                              'Dieses Themenprofil löschen? Bestehende Einladungen bleiben erhalten.',
                            )
                          )
                            action(`profiles/${profile.id}`, 'DELETE');
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="admin-empty">
                  Noch kein Profil vorhanden. Lade deine erste Themen-Datei
                  hoch.
                </p>
              )}
            </section>
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <div>
                  <span className="small-label">02 · EINLADEN</span>
                  <h2>Link erstellen</h2>
                  <p>Ein persönlicher Zugang für einen Test.</p>
                </div>
                <Link2 size={20} />
              </div>
              <form onSubmit={create}>
                <label className="admin-field">
                  Themenprofil
                  <select
                    value={selectedProfile}
                    onChange={(e) => setSelectedProfile(e.target.value)}
                    required
                  >
                    <option value="">Profil auswählen</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  Name oder Kennzeichnung <small>optional</small>
                  <input
                    value={name}
                    maxLength={120}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="z. B. Anna M."
                  />
                </label>
                <label className="admin-field">
                  Gültigkeit
                  <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                  >
                    <option value={7}>7 Tage</option>
                    <option value={14}>14 Tage</option>
                    <option value={30}>30 Tage</option>
                    <option value={90}>90 Tage</option>
                  </select>
                </label>
                <button
                  className="primary admin-full"
                  disabled={!selectedProfile || busy}
                >
                  <Plus size={17} /> Einladungslink erstellen
                </button>
              </form>
              {createdLink && (
                <div className="created-link">
                  <strong>Dein Link ist bereit</strong>
                  <p>
                    Kopiere ihn jetzt. Aus Sicherheitsgründen wird er nur einmal
                    angezeigt.
                  </p>
                  <div>
                    <input
                      readOnly
                      value={createdLink}
                      aria-label="Erstellter Einladungslink"
                    />
                    <button className="secondary" onClick={copy}>
                      {copied ? <Check size={16} /> : <Clipboard size={16} />}
                      {copied ? 'Kopiert' : 'Kopieren'}
                    </button>
                  </div>
                  {window.location.hostname === '127.0.0.1' ||
                  window.location.hostname === 'localhost' ? (
                    <small>
                      Dieser lokale Link funktioniert nur auf diesem Computer.
                      Öffentliches Hosting ist noch erforderlich.
                    </small>
                  ) : null}
                </div>
              )}
            </section>
          </div>
          <section className="admin-panel admin-results">
            <div className="admin-panel-heading">
              <div>
                <span className="small-label">03 · ÜBERBLICK</span>
                <h2>Einladungen & Ergebnisse</h2>
                <p>Alle Tests und ihr aktueller Stand.</p>
              </div>
              <Users size={20} />
            </div>
            {invitations.length ? (
              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>BEWERBER/IN</th>
                      <th>THEMA</th>
                      <th>ERSTELLT</th>
                      <th>STATUS</th>
                      <th>ERGEBNIS</th>
                      <th>MODUS</th>
                      <th>ABGESCHLOSSEN</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map((invite) => {
                      const result = invite.assessment
                        ? (JSON.parse(invite.assessment) as Assessment)
                        : undefined;
                      return (
                        <tr key={invite.id}>
                          <td>
                            <strong>{invite.name || 'Ohne Namen'}</strong>
                          </td>
                          <td>{invite.profile_title}</td>
                          <td>{date(invite.created_at)}</td>
                          <td>
                            <span className={`admin-status ${invite.status}`}>
                              {labels[invite.status] ?? invite.status}
                            </span>
                          </td>
                          <td>{result?.level ?? '–'}</td>
                          <td>
                            {invite.mode === 'voice'
                              ? 'Gespräch'
                              : invite.mode === 'text'
                                ? 'Textchat'
                                : '–'}
                          </td>
                          <td>
                            {invite.completed_at
                              ? dateTime(invite.completed_at)
                              : '–'}
                          </td>
                          <td>
                            <button
                              className="admin-link"
                              onClick={() => openDetail(invite.id)}
                            >
                              Ansehen <ArrowUpRight size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-empty-state">
                <div>
                  <Users size={24} />
                </div>
                <strong>Hier beginnt dein Überblick.</strong>
                <p>
                  Erstelle deinen ersten Einladungslink. Sobald ein Test
                  abgeschlossen ist, findest du das Ergebnis hier.
                </p>
              </div>
            )}
          </section>
          {detail && (
            <div className="admin-overlay" onClick={() => setDetail(undefined)}>
              <section
                className="admin-detail"
                role="dialog"
                aria-modal="true"
                aria-label="Ergebnisdetails"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="admin-detail-head">
                  <div>
                    <span className="small-label">ERGEBNISDETAILS</span>
                    <h2>{detail.name || 'Ohne Namen'}</h2>
                    <p>
                      {detail.profile_title} · {labels[detail.status]}
                    </p>
                  </div>
                  <button
                    className="secondary"
                    onClick={() => setDetail(undefined)}
                  >
                    Schließen
                  </button>
                </div>
                {assessment ? (
                  <div className="admin-assessment">
                    <span>
                      {assessment.level === 'nicht beurteilbar'
                        ? '?'
                        : assessment.level}
                    </span>
                    <div>
                      <strong>
                        {assessment.level === 'nicht beurteilbar'
                          ? 'Nicht ausreichend beurteilbar'
                          : `B2 ${assessment.b2}`}
                      </strong>
                      <p>{assessment.summary}</p>
                    </div>
                  </div>
                ) : (
                  <div className="config-notice">
                    {detail.status === 'started'
                      ? 'Der Test wurde begonnen. Eine Auswertung liegt noch nicht vor.'
                      : 'Für diese Einladung liegt noch kein Ergebnis vor.'}
                  </div>
                )}
                {assessment && (
                  <div className="feedback-grid">
                    <div>
                      <h3>Stärken</h3>
                      <ul>
                        {assessment.strengths.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3>Lernfelder</h3>
                      <ul>
                        {assessment.improvements.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                {assessment?.criteria.map((c) => (
                  <div className="criterion" key={c.name}>
                    <strong>{c.name}</strong>
                    <p>{c.observation}</p>
                  </div>
                ))}
                {assessment?.evidence.map((e, i) => (
                  <blockquote key={i}>
                    „{e.quote}“<footer>{e.explanation}</footer>
                  </blockquote>
                ))}
                <h3 className="admin-transcript-title">
                  Transkript & Antwortzeiten
                </h3>
                <Transcript turns={turns} mode={detail.mode ?? 'text'} />
                {events.length > 0 && (
                  <details>
                    <summary>Sitzungsereignisse</summary>
                    <ul>
                      {events.map((event, index) => (
                        <li key={index}>
                          {Math.floor(event.atMs / 60000)}:
                          {Math.floor((event.atMs / 1000) % 60)
                            .toString()
                            .padStart(2, '0')}{' '}
                          · {event.type}
                          {event.detail ? `: ${event.detail}` : ''}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                <details>
                  <summary>Themenprofil anzeigen</summary>
                  <pre className="admin-markdown">{detail.markdown}</pre>
                </details>
                <div className="admin-detail-actions">
                  {detail.status === 'pending' && (
                    <button
                      className="secondary"
                      onClick={() =>
                        action(`invitations/${detail.id}/revoke`, 'POST')
                      }
                    >
                      Link widerrufen
                    </button>
                  )}
                  <button
                    className="admin-danger"
                    onClick={() => {
                      if (
                        window.confirm(
                          'Diese Einladung und alle zugehörigen Ergebnisse unwiderruflich löschen?',
                        )
                      )
                        action(`invitations/${detail.id}`, 'DELETE');
                    }}
                  >
                    <Trash2 size={15} /> Löschen
                  </button>
                </div>
              </section>
            </div>
          )}
        </main>
      )}
      <footer className="site-footer">
        <span>Sprachraum · Verwaltung</span>
        <span>Ein kleiner Schritt. Mehr Sprachgefühl.</span>
      </footer>
    </div>
  );
}
