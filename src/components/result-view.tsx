import {
  ArrowRight,
  Download,
  FileJson,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import type { ExamController } from '@/hooks/use-exam';
import { clock } from '@/lib/timing';
import { Transcript } from './transcript';
export function ResultView({
  exam,
  invited = false,
}: {
  exam: ExamController;
  invited?: boolean;
}) {
  const record = exam.record!;
  const assessment = record.assessment;
  return (
    <div className="result-layout">
      <section className="result-intro">
        <div className="eyebrow">
          <Sparkles size={15} /> DEIN NÄCHSTER SCHRITT
        </div>
        <h1>
          Jedes Gespräch
          <br />
          <span>bringt dich weiter.</span>
        </h1>
        <p className="intro-copy">
          Du hast dir Zeit für dein Deutsch genommen. Hier findest du eine
          Orientierung für deinen weiteren Lernweg.
        </p>
        <div className="facts">
          <span>{record.mode === 'text' ? 'Textchat' : 'Gespräch'}</span>
          <span>{clock(record.elapsedMs)}</span>
          <span>
            {record.turns.filter((t) => t.role === 'user').length} Antworten
          </span>
        </div>
        {record.endedEarly && (
          <p className="notice">
            Vorzeitig beendet. Das kann die Aussagekraft der Einschätzung
            begrenzen.
          </p>
        )}
        <div className="export-buttons">
          <button className="secondary" onClick={() => exam.download('md')}>
            <Download size={17} /> Markdown herunterladen
          </button>
          <button className="secondary" onClick={() => exam.download('json')}>
            <FileJson size={17} /> JSON herunterladen
          </button>
        </div>
        {!invited && (
          <button className="text-button new-test" onClick={exam.reset}>
            Sitzungsdaten löschen & neu starten <ArrowRight size={17} />
          </button>
        )}
        <p className="sidebar-note">
          {invited
            ? 'Dein Ergebnis und Transkript werden für den einladenden Betreiber gespeichert. Lade dein Transkript herunter, wenn du eine eigene Kopie behalten möchtest.'
            : 'Beim Verlassen gehen die Daten in dieser App verloren. Lade dein Transkript vorher herunter, wenn du es behalten möchtest.'}
        </p>
      </section>
      <section className="result-card">
        <div className="card-top">
          <h2>Deine Einschätzung</h2>
          <span className="language-badge">
            Deutsch · {record.mode === 'text' ? 'schriftlich' : 'Gespräch'}
          </span>
        </div>
        {exam.busy ? (
          <div className="assessment-loading" role="status">
            <LoaderCircle className="spin" size={30} />
            <p>Dein Gespräch wird unabhängig ausgewertet …</p>
          </div>
        ) : assessment ? (
          <>
            <div className="level-display">
              <span
                className={
                  assessment.level === 'nicht beurteilbar'
                    ? 'level unresolved'
                    : 'level'
                }
              >
                {assessment.level === 'nicht beurteilbar'
                  ? '?'
                  : assessment.level}
              </span>
              <div>
                <span className="small-label">
                  UNVERBINDLICHE GER-EINSCHÄTZUNG
                </span>
                <h3>
                  {assessment.level === 'nicht beurteilbar'
                    ? 'Nicht ausreichend beurteilbar'
                    : `B2 ${assessment.b2}`}
                </h3>
              </div>
            </div>
            <p className="assessment-summary">{assessment.summary}</p>
            <div className="feedback-grid">
              {assessment.strengths.length > 0 && (
                <div>
                  <h3>Das gelingt dir gut</h3>
                  <ul>
                    {assessment.strengths.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {assessment.improvements.length > 0 && (
                <div>
                  <h3>Hier kannst du ansetzen</h3>
                  <ul>
                    {assessment.improvements.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {assessment.criteria.map((c) => (
              <div className="criterion" key={c.name}>
                <strong>{c.name}</strong>
                <p>{c.observation}</p>
              </div>
            ))}
            {assessment.evidence.length > 0 && (
              <div className="evidence">
                <h3>Belege aus deinen Antworten</h3>
                {assessment.evidence.map((e, i) => (
                  <blockquote key={i}>
                    <p>„{e.quote}“</p>
                    <footer>
                      {e.explanation}{' '}
                      <a href={`#turn-${e.turnId}`}>Antwort ansehen</a>
                    </footer>
                  </blockquote>
                ))}
              </div>
            )}
            <div className="honesty">
              <ShieldCheck size={21} />
              <p>
                Eine Orientierung, kein offizieller B2-Nachweis.{' '}
                {record.mode === 'text'
                  ? 'Dieser Test beurteilt schriftliche Interaktion.'
                  : 'Die Einschätzung stützt sich auf das Transkript.'}{' '}
                Aussprache und Hörverstehen wurden nicht verlässlich gemessen.
              </p>
            </div>
          </>
        ) : (
          <div className="assessment-loading">
            <p>
              Die Auswertung konnte noch nicht erstellt werden. Dein Transkript
              bleibt verfügbar.
            </p>
            <button className="secondary" onClick={() => void exam.assess()}>
              <RotateCcw size={16} /> Auswertung erneut versuchen
            </button>
          </div>
        )}
      </section>
      <section className="full-transcript">
        <h2>Dein Gespräch zum Nachlesen</h2>
        <Transcript turns={record.turns} mode={record.mode} />
        <details>
          <summary>Sitzungsereignisse & Zeitmessung</summary>
          <p>
            Audio: Zeit von Frageende bis Sprechbeginn, Sprechdauer und
            Gesamtzeit. Text: Zeit von sichtbarer Frage bis erster Eingabe,
            Bearbeitungsdauer und Zeit bis zum Absenden. Netzwerk- oder
            Hintergrundereignisse können Messungen unbrauchbar machen.
          </p>
          <ul>
            {record.events.map((e, i) => (
              <li key={i}>
                {clock(e.atMs)} · {e.type}
              </li>
            ))}
          </ul>
        </details>
      </section>
    </div>
  );
}
