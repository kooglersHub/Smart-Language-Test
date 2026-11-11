'use client';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  AudioLines,
  Check,
  Clock3,
  FileText,
  MessageSquare,
  Upload,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { parseProfile } from '@/lib/profile';
import type { Mode } from '@/lib/types';
import type { ExamController } from '@/hooks/use-exam';

interface ApiStatus {
  configured: boolean;
  needsAccessCode: boolean;
  productionReady: boolean;
}
export function Setup({
  exam,
  defaultMarkdown,
  invited = false,
}: {
  exam: ExamController;
  defaultMarkdown: string;
  invited?: boolean;
}) {
  const [mode, setMode] = useState<Mode>('voice');
  const [markdown, setMarkdown] = useState(defaultMarkdown);
  const [profileError, setProfileError] = useState('');
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<ApiStatus>();
  const [statusError, setStatusError] = useState('');
  const profileResult = (() => {
    try {
      return { profile: parseProfile(markdown), error: '' };
    } catch (failure) {
      return {
        profile: undefined,
        error:
          failure instanceof Error
            ? failure.message
            : 'Ungültiges Standardprofil.',
      };
    }
  })();
  useEffect(() => {
    const abort = new AbortController();
    void fetch('/api/status', { signal: abort.signal })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setStatus)
      .catch((error) => {
        if (error.name !== 'AbortError')
          setStatusError(
            'Der Serverstatus konnte nicht geladen werden. Lade die Seite erneut.',
          );
      });
    return () => abort.abort();
  }, []);
  const upload = async (file?: File) => {
    if (!file) return;
    try {
      if (!file.name.toLowerCase().endsWith('.md'))
        throw new Error('Bitte wähle eine .md-Datei.');
      if (file.size > 32768)
        throw new Error('Die Datei darf höchstens 32 KiB groß sein.');
      const source = new TextDecoder('utf-8', { fatal: true }).decode(
        await file.arrayBuffer(),
      );
      parseProfile(source);
      setMarkdown(source);
      setProfileError('');
    } catch (failure) {
      setProfileError(
        failure instanceof Error
          ? failure.message
          : 'Die Datei konnte nicht gelesen werden.',
      );
    }
  };
  return (
    <div className="setup-grid">
      <section className="intro">
        <div className="eyebrow">
          <span className="tiny-dot" /> DEUTSCH ENTDECKEN · B2
        </div>
        <h1>
          Dein Deutsch.
          <br />
          <span>Im Gespräch.</span>
        </h1>
        <p className="intro-copy">
          Du kannst mehr, als du denkst. Finde heraus, wo du stehst – in einem
          entspannten Austausch mit deiner KI-Prüfungsbegleitung.
        </p>
        <div className="facts">
          <span>
            <Clock3 size={16} /> 10 Minuten
          </span>
          <span>
            <Check size={16} /> Ohne Anmeldung
          </span>
        </div>
        <div className="journey">
          <p className="small-label">DEIN WEG ZUR EINSCHÄTZUNG</p>
          {[
            ['01', 'Ankommen', 'Erzähl ein bisschen von dir.'],
            [
              '02',
              'Gedanken teilen',
              'Begründe, hinterfrage und entwickle Ideen.',
            ],
            [
              '03',
              'Klarheit gewinnen',
              'Entdecke Stärken und nächste Lernschritte.',
            ],
          ].map(([n, title, text]) => (
            <div className="journey-step" key={n}>
              <span>{n}</span>
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="honesty">
          <ShieldCheck size={20} />
          <p>
            Eine Orientierung für deinen Lernweg.
            <br />
            Kein offizielles Sprachzertifikat.
          </p>
        </div>
      </section>
      <section className="setup-card" aria-label="Test vorbereiten">
        <div className="card-top">
          <span className="small-label">DEIN DEUTSCH-CHECK</span>
          <span className="language-badge">
            <span /> Deutsch
          </span>
        </div>
        <div className="orb-scene" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="voice-orb">
            <AudioLines size={46} strokeWidth={1.3} />
          </div>
          <span className="orb-caption">Ein Gespräch. Neue Perspektiven.</span>
        </div>
        <h2>Wie möchtest du starten?</h2>
        <p className="muted">Wähle die Art, die zu dir passt.</p>
        <div className="mode-picker">
          <button
            className={mode === 'voice' ? 'mode selected' : 'mode'}
            onClick={() => setMode('voice')}
            aria-pressed={mode === 'voice'}
          >
            <AudioLines size={23} />
            <strong>Gespräch</strong>
            <small>Sprechen & zuhören</small>
            <span className="selection-dot">
              {mode === 'voice' && <Check size={11} />}
            </span>
          </button>
          <button
            className={mode === 'text' ? 'mode selected' : 'mode'}
            onClick={() => setMode('text')}
            aria-pressed={mode === 'text'}
          >
            <MessageSquare size={23} />
            <strong>Textchat</strong>
            <small>In Ruhe schreiben</small>
            <span className="selection-dot">
              {mode === 'text' && <Check size={11} />}
            </span>
          </button>
        </div>
        <details className="profile-details">
          <summary>
            <span>
              <FileText size={17} /> Gesprächsprofil{' '}
              <strong>
                {profileResult.profile?.title ?? 'Ungültiges Profil'}
              </strong>
            </span>
            <ChevronDown size={16} />
          </summary>
          <div className="profile-content">
            <p>{profileResult.profile?.topics.join(' · ')}</p>
            {profileResult.profile?.tasks.length ? (
              <p>{profileResult.profile.tasks.length} vorbereitete Aufgaben</p>
            ) : null}
            {!invited && (
              <label className="upload-button">
                <Upload size={15} /> Eigenes Markdown laden
                <input
                  type="file"
                  accept=".md,text/markdown"
                  onChange={(e) => {
                    void upload(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </label>
            )}
            <small>Themen, Kontext und Aufgaben · UTF-8 · bis 32 KiB</small>
            {markdown !== defaultMarkdown && (
              <button
                className="text-button"
                onClick={() => {
                  setMarkdown(defaultMarkdown);
                  setProfileError('');
                }}
              >
                Standardprofil verwenden
              </button>
            )}
          </div>
        </details>
        {(profileError || profileResult.error) && (
          <p className="error" role="alert">
            {profileError || profileResult.error}
          </p>
        )}
        {statusError && (
          <p className="error" role="alert">
            {statusError}
          </p>
        )}
        {status && !status.configured && (
          <div className="config-notice">
            {invited ? (
              <>
                <strong>Der Test ist derzeit nicht verfügbar.</strong>
                <p>Bitte wende dich an die Person, die dich eingeladen hat.</p>
              </>
            ) : (
              <>
                <strong>Fast bereit – der KI-Zugang fehlt noch.</strong>
                <p>
                  Trage <code>GEMINI_API_KEY</code> in <code>.env.local</code>{' '}
                  ein und starte den Server neu.
                </p>
              </>
            )}
          </div>
        )}
        {status && !status.productionReady && !invited && (
          <p className="error" role="alert">
            Für den Produktivbetrieb muss ein Zugangscode mit mindestens 16
            Zeichen eingerichtet sein.
          </p>
        )}
        {status?.needsAccessCode && !invited && (
          <label className="field-label">
            Zugangscode
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              placeholder="Dein Zugang zur Prüfung"
            />
          </label>
        )}
        <label className="consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            Ich bin mit der Verarbeitung meiner{' '}
            {mode === 'voice' ? 'Sprach- und Textdaten' : 'Texteingaben'} durch
            Google Gemini für diesen Test einverstanden.{' '}
            {invited &&
              'Mein Transkript, meine Antwortzeiten und das Ergebnis werden vom einladenden Betreiber gespeichert und sind für ihn einsehbar. '}
            <a
              href="https://ai.google.dev/gemini-api/terms"
              target="_blank"
              rel="noreferrer"
            >
              Nutzungs- und Datenbedingungen
            </a>
          </span>
        </label>
        <button
          className="primary start-button"
          disabled={
            !consent ||
            !status?.configured ||
            (!invited && !status.productionReady) ||
            Boolean(profileError || profileResult.error) ||
            (!invited && status.needsAccessCode && !code.trim())
          }
          onClick={() => void exam.begin(mode, markdown, code)}
        >
          Test starten <ArrowRight size={19} />
        </button>
        <p className="privacy-note">
          {invited
            ? 'Keine Audioaufnahme in der App. Das Transkript wird für den Betreiber gespeichert.'
            : 'Keine Audioaufnahme in der App. Transkript nur für diese Sitzung.'}
          <br />
          Beim KI-Anbieter gelten dessen Datenbedingungen.
        </p>
      </section>
    </div>
  );
}
