'use client';
import Link from 'next/link';
import { AudioLines, ArrowUpRight, LoaderCircle } from 'lucide-react';
import { useExam } from '@/hooks/use-exam';
import { Setup } from './setup';
import { ExamView } from './exam-view';
import { ResultView } from './result-view';
export function LanguageTest({
  defaultMarkdown,
  invitationToken,
}: {
  defaultMarkdown: string;
  invitationToken?: string;
}) {
  const exam = useExam(invitationToken);
  return (
    <div className="site-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Sprachraum Startseite">
          <span className="brand-icon">
            <AudioLines size={22} />
          </span>
          sprachraum<span className="brand-period">.</span>
        </Link>
        <div className="header-right">
          <span>Sprache verbindet.</span>
          <Link href="/verwaltung">Für Teams</Link>
          <a
            href="https://www.coe.int/en/web/common-european-framework-reference-languages"
            target="_blank"
            rel="noreferrer"
          >
            Über den GER <ArrowUpRight size={14} />
          </a>
        </div>
      </header>
      <main>
        {exam.error && (
          <div className="global-error" role="alert">
            {exam.error}
          </div>
        )}
        {exam.step === 'setup' && (
          <Setup
            exam={exam}
            defaultMarkdown={defaultMarkdown}
            invited={Boolean(invitationToken)}
          />
        )}
        {exam.step === 'connecting' && (
          <section className="connecting" role="status">
            <div className="voice-orb">
              <LoaderCircle size={36} className="spin" />
            </div>
            <h1>
              Ein Moment für
              <br />
              <span>dein Deutsch.</span>
            </h1>
            <p>
              Wir bereiten deinen Test vor.
              {exam.record?.mode === 'voice' &&
                ' Erlaube den Mikrofonzugriff im Browser.'}
            </p>
            <button className="secondary" onClick={exam.reset}>
              Abbrechen
            </button>
          </section>
        )}
        {exam.step === 'finishing' && (
          <section className="connecting" role="status">
            <LoaderCircle size={32} className="spin" />
            <h2>Dein Transkript wird abgeschlossen.</h2>
            <p>
              Wir übernehmen noch die letzte Antwort. Das dauert höchstens
              wenige Sekunden.
            </p>
          </section>
        )}
        {exam.step === 'running' && exam.record && <ExamView exam={exam} />}
        {exam.step === 'result' && exam.record && (
          <ResultView exam={exam} invited={Boolean(invitationToken)} />
        )}
      </main>
      <footer className="site-footer">
        <span>Ein kleiner Schritt. Mehr Sprachgefühl.</span>
        <span>
          Deutsch · B2-Voreinschätzung <span className="footer-dot">·</span> Mit
          KI
        </span>
      </footer>
    </div>
  );
}
