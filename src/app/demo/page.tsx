import Link from 'next/link';

export default function DemoPage() {
  return (
    <main className="site-shell">
      <header className="site-header">
        <Link className="brand" href="/demo">
          sprachraum<span>.</span>
        </Link>
      </header>
      <div className="setup-grid">
        <section className="intro">
          <p className="eyebrow">PROTOTYP FÜR DIE PERSONALABTEILUNG</p>
          <h1>
            Deutsch im <span>Berufsalltag.</span>
          </h1>
          <p className="intro-copy">
            Sprachraum zeigt, wie ein kurzer Sprachtest vor einem persönlichen
            Gespräch aussehen kann. Das Beispiel greift eine typische Situation
            im Fahrgastkontakt auf.
          </p>
          <p className="sidebar-note">
            Die Vorschau verwendet fiktive Antworten. Die Einschätzung dient als
            Orientierung für ein Folgegespräch.
          </p>
        </section>
        <section className="setup-card" aria-label="Beispielablauf">
          <h2>Vom Testlink zur Einschätzung</h2>
          <details className="profile-details" open>
            <summary>
              <strong>Einladung und Thema</strong>
            </summary>
            <div className="profile-content">
              <p>
                Die Personalabteilung wählt das Profil „Fahrgastservice“ und
                versendet einen individuellen Link. Die Testperson wählt
                Gespräch oder Textchat.
              </p>
            </div>
          </details>
          <details className="profile-details">
            <summary>
              <strong>Beispiel aus dem Gespräch</strong>
            </summary>
            <div className="profile-content">
              <p>
                <strong>Frage:</strong> Eine Bahn fällt aus. Wie erklären Sie
                einem verärgerten Fahrgast, welche Verbindung er stattdessen
                nehmen kann?
              </p>
              <p>
                <strong>Fiktive Antwort:</strong> Ich würde mich zuerst für die
                Umstände entschuldigen. Dann würde ich nach dem Ziel fragen und
                erklären, von welcher Haltestelle der Ersatzbus fährt.
              </p>
              <p>
                Beispiel einer Rückfrage: Was tun Sie, wenn der Fahrgast die
                Haltestelle nicht findet?
              </p>
            </div>
          </details>
          <details className="profile-details">
            <summary>
              <strong>Beispiel für die Ergebnisansicht</strong>
            </summary>
            <div className="profile-content">
              <p>
                <strong>Mögliche Beobachtung:</strong> Die Antwort ist
                nachvollziehbar aufgebaut und verwendet passenden Wortschatz. Im
                Folgegespräch ließe sich prüfen, wie die Person auf unerwartete
                Rückfragen eingeht.
              </p>
              <p>
                Die Verwaltung zeigt zum abgeschlossenen Test eine Einschätzung,
                das Transkript und die gemessenen Antwortzeiten. Für dieses
                kurze Beispiel wird kein Niveau vergeben.
              </p>
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}
