import {
  AudioLines,
  Mic,
  MicOff,
  Send,
  Square,
  Download,
  LoaderCircle,
  WifiOff,
} from 'lucide-react';
import type { ExamController } from '@/hooks/use-exam';
import { clock } from '@/lib/timing';
import { phaseAt, phaseLabels } from '@/lib/exam';
import type { Phase } from '@/lib/types';
import { Transcript } from './transcript';
export function ExamView({ exam }: { exam: ExamController }) {
  const record = exam.record!;
  const phase = phaseAt(exam.elapsed);
  return (
    <div className="exam-layout">
      <aside className="exam-sidebar">
        <div className="eyebrow">DEUTSCH · ZIEL B2</div>
        <h1>
          Raum für
          <br />
          <span>deine Gedanken.</span>
        </h1>
        <p className="muted">{record.profile.title}</p>
        <div className="timer-box">
          <span className="small-label">
            {exam.elapsed < 600000 ? 'VERBLEIBENDE ZEIT' : 'ABSCHLUSSFRIST'}
          </span>
          <strong>
            {clock(
              exam.elapsed < 600000
                ? 600000 - exam.elapsed
                : 660000 - exam.elapsed,
            )}
          </strong>
          <span>
            {exam.paused
              ? 'Verbindung unterbrochen · Timer pausiert'
              : exam.elapsed < 600000
                ? 'Nimm dir Zeit für deine Antworten.'
                : 'Beende jetzt deine begonnene Antwort.'}
          </span>
        </div>
        <ol className="phase-list">
          {(Object.entries(phaseLabels) as [Phase, string][]).map(
            ([key, label], i) => (
              <li className={key === phase ? 'active' : ''} key={key}>
                <span>{i + 1}</span>
                {label}
                {key === phase && <span className="tiny-dot" />}
              </li>
            ),
          )}
        </ol>
        <button className="secondary" onClick={() => exam.download('md')}>
          <Download size={15} /> Transkript sichern
        </button>
        <p className="sidebar-note">
          Du kannst jederzeit beenden. Eine kurze Prüfung lässt sich
          möglicherweise nicht ausreichend beurteilen.
        </p>
      </aside>
      <section className="conversation-card">
        <div className="conversation-heading">
          <div>
            <span className={`status-dot ${exam.paused ? 'offline' : ''}`} />
            <strong>
              {record.mode === 'voice' ? 'Dein Gespräch' : 'Dein Textchat'}
            </strong>
          </div>
          <span className="language-badge">
            {record.mode === 'voice' ? 'Audio · Live' : 'Schriftlich'}
          </span>
        </div>
        {record.mode === 'voice' && (
          <div className={`call-display ${exam.activity}`}>
            <div className="small-orb">
              <AudioLines size={35} strokeWidth={1.3} />
            </div>
            <p>
              {exam.paused
                ? 'Verbindung wird wiederhergestellt …'
                : exam.muted
                  ? 'Dein Mikrofon ist stumm.'
                  : exam.activity === 'speaking'
                    ? 'Sprachraum spricht …'
                    : 'Ich höre dir zu.'}
            </p>
            <small>Sprich natürlich. Du darfst auch kurz nachdenken.</small>
            {exam.paused && (
              <button className="secondary" onClick={() => void exam.resume()}>
                <WifiOff size={15} /> Verbindung erneut versuchen
              </button>
            )}
          </div>
        )}
        <Transcript turns={record.turns} mode={record.mode} autoScroll />
        {exam.busy && (
          <p className="thinking" role="status">
            <LoaderCircle size={15} className="spin" /> Sprachraum denkt nach …
          </p>
        )}
        {exam.error && record.mode === 'text' && (
          <button
            className="secondary retry"
            disabled={exam.busy}
            onClick={() => void exam.question()}
          >
            Letzte Anfrage erneut versuchen
          </button>
        )}
        <div className="conversation-bottom">
          {record.mode === 'text' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void exam.send();
              }}
            >
              <label className="sr-only" htmlFor="answer">
                Deine Antwort
              </label>
              <div className="composer">
                <textarea
                  id="answer"
                  rows={3}
                  maxLength={6000}
                  placeholder="Schreibe deine Antwort …"
                  value={exam.draft}
                  onChange={(e) => exam.changeDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === 'Enter' &&
                      !e.shiftKey &&
                      !e.nativeEvent.isComposing
                    ) {
                      e.preventDefault();
                      void exam.send();
                    }
                  }}
                />
                <button
                  className="send-button"
                  aria-label="Antwort senden"
                  disabled={
                    exam.busy ||
                    !exam.draft.trim() ||
                    record.turns.at(-1)?.role !== 'assistant'
                  }
                >
                  <Send size={19} />
                </button>
              </div>
              <small>
                Enter zum Senden · Umschalt + Enter für einen Absatz · bis 6.000
                Zeichen
              </small>
            </form>
          ) : (
            <div className="call-controls">
              <button
                className={exam.muted ? 'mute-button muted' : 'mute-button'}
                onClick={exam.toggleMute}
                aria-label={
                  exam.muted ? 'Mikrofon einschalten' : 'Mikrofon stummschalten'
                }
                aria-pressed={exam.muted}
              >
                {exam.muted ? <MicOff size={22} /> : <Mic size={22} />}
              </button>
              <span>Audiozeiten sind näherungsweise gemessen.</span>
            </div>
          )}
          <div className="end-row">
            <span>
              {record.mode === 'text'
                ? 'Deine abgeschickten Antworten und Zeiten werden protokolliert.'
                : 'Live-Transkript · keine Audioaufnahme in der App'}
            </span>
            <button className="end-button" onClick={() => void exam.finish()}>
              <Square size={12} fill="currentColor" /> Test beenden
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
