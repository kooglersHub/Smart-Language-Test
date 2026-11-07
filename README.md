# Sprachraum · Smart Language Test

Deutscher B2-Sprachcheck als responsive Web-App: zehn Minuten KI-Gespräch oder Textchat, ein anpassbares Markdown-Gesprächsprofil und eine unabhängige, begründete GER-Voreinschätzung.

## Lokal starten

Voraussetzungen: Node.js 24 LTS, pnpm 11.25 und ein Gemini-API-Zugang mit Zugriff auf die eingestellten Modelle.

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
# GEMINI_API_KEY in .env.local eintragen
pnpm dev
```

Öffne <http://127.0.0.1:3000>. Ohne API-Schlüssel ist die Oberfläche sichtbar; eine echte Prüfung bleibt gesperrt. Es gibt keine simulierten Testergebnisse im Produkt. Schlüssel gehören ausschließlich in `.env.local` oder die Serverumgebung.

Der Server bindet standardmäßig nur an `127.0.0.1`. Audio benötigt Mikrofonfreigabe und einen sicheren Browserkontext: localhost/Loopback oder HTTPS. Für Gespräche werden AudioWorklet, Web Audio und WebSocket benötigt; aktuelle Chromium-Browser sind die Referenz für die automatisierte Browserprüfung.

## Was enthalten ist

- Gespräch im Browser mit Mikrofon, Audioausgabe, Stummschaltung und Live-Transkript.
- Textmodus mit Entwürfen, Enter zum Senden und Umschalt+Enter für Absätze.
- Vier Phasen: Einstieg, Argumentation, Gegenargumente und Transfer.
- Zehn Minuten Prüfungszeit; bereits begonnene Antworten dürfen höchstens 60 Sekunden überziehen.
- Markdown-Profile aus dem Repository oder als lokaler Upload vor einer Prüfung.
- Transkript mit Sprecher, Fragezuordnung, relativen Zeiten, Status und Sitzungsereignissen.
- Markdown-/JSON-Downloads auch bei vorzeitigem Ende und fehlgeschlagener Auswertung.
- Separate Auswertungsanfrage mit festen Kriterien und geprüften Originalzitaten.

## Gesprächsinhalt konfigurieren

Bearbeite [`config/exam.de.md`](config/exam.de.md). Ohne Vorspann gelten Ziel B2 und zehn Minuten. Das Standardprofil wird beim Build eingelesen; nach Änderungen den Produktionsbuild erneuern. Ein Upload gilt nur für die aktuelle Sitzung und verändert die Datei im Repository nicht.

```markdown
---
title: Studieren und Lernen
targetLevel: B2
durationMinutes: 10
---

## Kontext

Ein Gespräch über das Studium. Fachwissen ist nicht erforderlich.

## Themen

- Lernen im Alltag
- Studium in Deutschland

## Aufgaben

- Erzähle von einer schwierigen Lernsituation.
- Vergleiche Lernen allein und in einer Gruppe. Begründe deine Meinung.

## Transferaufgabe

Du organisierst eine Lerngruppe mit unterschiedlichen Lernzielen.
Wie würdest du die Zusammenarbeit gestalten?
```

UTF-8, maximal 32 KiB, maximal 20 Einträge je Themen-/Aufgabenabschnitt. Der Titel darf höchstens 120 Zeichen lang sein. Andere Metadaten, andere Zielniveaus oder andere Dauern werden zurückgewiesen. Mindestens ein Thema oder eine Aufgabe ist erforderlich. Markdown wird als Text verarbeitet: keine Skripte, HTML-Ausführung oder externen Dateizugriffe. Die festen Prüfungs- und Bewertungsanweisungen lassen sich über ein Profil nicht ändern; KI-Ausgaben bleiben dennoch probabilistisch.

## Zeitmessung verstehen

| Messwert      | Audio                                                     | Text                                              |
| ------------- | --------------------------------------------------------- | ------------------------------------------------- |
| Reaktionszeit | Ende der abgespielten Frage bis erkannter Sprechbeginn    | Sichtbare Frage bis erste inhaltliche Eingabe     |
| Antwortdauer  | Erkannter Sprechbeginn bis letztes erkanntes Sprachsignal | Erste Eingabe bis Absenden, einschließlich Pausen |
| Gesamtzeit    | Frageende bis Antwortende                                 | Sichtbare Frage bis Absenden                      |

Audiozeiten sind Näherungen mit lokaler Aktivitätserkennung. Sie hängen nicht vom Empfangszeitpunkt fertiger Transkripte ab. Unterbrechungen, fehlende Ereignisse, Verbindungslücken und Hintergrundaktivität werden markiert; nicht vergleichbare Reaktionszeiten bleiben leer. Die App erfasst Zeitereignisse und gesendeten Text, keine einzelnen Tastenanschläge oder gelöschten Entwürfe. Während einer KI-Antwort darf im Textmodus bereits ein Entwurf entstehen; ein solcher früher Beginn liefert keine vergleichbare Reaktionszeit.

Beim Audioabschluss endet die Aufnahme sofort. Bereits gesendete Sprache bekommt bis zu drei Sekunden Zeit für die letzte Transkription. Fehlende Endtranskripte werden ausdrücklich als unterbrochen markiert. Verbindungsfehler pausieren die aktive Prüfungszeit. Automatische Wiederaufnahme versucht es bis zu 30 Sekunden, sofern der Dienst einen gültigen Wiederaufnahmetoken geliefert hat; danach ist eine bewusste Wiederaufnahme oder ein Abschluss nötig.

## KI-Konfiguration

| Variable                  | Bedeutung                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`          | Dauerhafter Schlüssel, ausschließlich serverseitig                                                       |
| `GEMINI_TEXT_MODEL`       | Textdialog; Standard `gemini-3.8-flash`                                                                  |
| `GEMINI_ASSESSMENT_MODEL` | Separate Auswertung; Standard `gemini-3.8-flash`                                                         |
| `GEMINI_LIVE_MODEL`       | Audio; Standard `gemini-3.8-live`                                                                        |
| `ACCESS_CODE`             | Gemeinsamer Zugangscode; im Produktionsbetrieb mindestens 16 Zeichen                                     |
| `APP_ORIGIN`              | Externe Origin hinter einem Reverse-Proxy, z. B. `https://test.example` ohne abschließenden Schrägstrich |

Modellzugang, Kontingente und Preise hängen vom Anbieter und Konto ab. Die App verspricht keinen kostenlosen Dauerbetrieb. Die Modelle können über Umgebungsvariablen gewechselt werden. Die Auswertung ist eine getrennte Anfrage mit eigener Anweisung; standardmäßig nutzt sie dieselbe Textmodellfamilie und ist kein unabhängig trainierter Zweitprüfer.

Verwendete offizielle Schnittstellen: [Live API](https://ai.google.dev/gemini-api/docs/live-api/capabilities), [kurzlebige Tokens](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens), [Sitzungswiederaufnahme](https://ai.google.dev/gemini-api/docs/live-api/session-management), [Modelle](https://ai.google.dev/gemini-api/docs/models), [Daten- und Nutzungsbedingungen](https://ai.google.dev/gemini-api/terms).

## Betrieb und Daten

```powershell
pnpm build
# ACCESS_CODE mit mindestens 16 Zeichen und GEMINI_API_KEY konfigurieren
pnpm start
```

Für eine Veröffentlichung ist ein Node-Server mit HTTPS erforderlich. Der Browser baut die Audio-WebSocket-Verbindung mit einem eingeschränkten kurzlebigen Token direkt zum Anbieter auf. Statisches GitHub-Pages-Hosting reicht nicht. Das Zugangscodefeld ist ein einfacher Schutz für eine begrenzte Testgruppe, kein Benutzerkontensystem.

Sitzungen und Limits liegen im Arbeitsspeicher eines einzelnen Serverprozesses: bis zu 100 aktive Sitzungen, zehn neue Sitzungen pro Minute, 40 KI-Anfragen je Sitzung und 30 Minuten Sitzungslebensdauer. Für mehrere Instanzen oder Serverless wäre ein gemeinsamer Sitzungs-/Limit-Speicher nötig. Nach Serverneustart können laufende Prüfungen nicht fortgesetzt werden; vorhandene Browsertranskripte lassen sich weiterhin exportieren.

Die App speichert keine Audiorohaufnahme und verwendet keine dauerhafte Browserablage für Gesprächsdaten. Transkript und Ergebnis liegen während der Sitzung im Browser-Arbeitsspeicher. Serverseitig werden Profil, Antwortcache und gegebenenfalls das Ergebnis nur flüchtig für die Sitzung gehalten. Nach Ende eine neue Sitzung über „Sitzungsdaten löschen & neu starten“ beginnen, um die Daten in der App zu löschen; ansonsten verfallen Serversitzungen nach 30 Minuten. Neuladen verliert den Browserverlauf. Bereits beim KI-Anbieter verarbeitete Daten unterliegen dessen Bedingungen; auch Sitzungspuffer für Wiederaufnahme können dort aufbewahrt werden. Technische Fehlerlogs enthalten keine absichtlich protokollierten Gesprächsinhalte oder API-Schlüssel.

Es werden keine externen Schriftarten oder Analytics geladen. Vor einem öffentlichen Einsatz müssen Betreiberdaten, Datenschutzhinweise und die konkrete Anbieter-/Kontokonfiguration für den beabsichtigten Einsatz ergänzt werden.

## Tests und Qualität

```powershell
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build
```

Unit- und Integrationstests prüfen Profile, Zeitberechnung, Phasen, Auswertung, API-Schutz, Idempotenz, Audiozuordnung und verzögerte Abschluss-Transkription. Browsertests ersetzen nur die externen API-Antworten und prüfen die reale Oberfläche einschließlich Textdialog, Upload, Timer, Export, Fehlerbehandlung und verzögert abgelehnter Mikrofonfreigabe. Sie ersetzen keinen echten Ende-zu-Ende-Test gegen Gemini mit Mikrofon. Ohne Schlüssel und Mikrofontest darf Live-Audio nicht als praktisch verifiziert betrachtet werden.

CI führt Formatprüfung, Lint, Typprüfung, Tests, Produktionsbuild und Browsertests aus. TypeScript 6 wird verwendet, weil die gewählte Linterintegration TypeScript 7 noch nicht unterstützt. Das optionale Installationsskript von `protobufjs` bleibt deaktiviert; der SDK-Pfad wurde über Import, Typprüfung und Build geprüft.

## Architektur

- `src/lib`: Profile, Prüfungsphasen, Zeitmessung, Transkript und Auswertungsschema.
- `src/lib/audio`: PCM-Aufnahme, Wiedergabe, Live-Verbindung und Transkriptzuordnung.
- `src/server`: KI-Adapter, feste Anweisungen, Sitzungsspeicher und Eingabe-/Zugriffsschutz.
- `src/app/api`: schlanke API-Endpunkte.
- `src/hooks/use-exam.ts`: Lebenszyklus einer Prüfung, monotone Zeit und Abbruchschutz.
- `src/components`: Start, Prüfung, Ergebnis und gemeinsames Transkript.

## Aussagekraft

Der Textmodus beurteilt schriftliche Interaktion. Im Audiomodus stützt sich die Einstufung auf das Transkript; Aussprache und Hörverstehen werden nicht belastbar gemessen. Zeitmerkmale allein belegen keine mündliche Flüssigkeit. Mindestens fünf inhaltliche Antworten mit Argumentation und Transfer sind eine interne Mindestregel, keine wissenschaftlich validierte GER-Schwelle. Für eine belastbare Anwendung muss die Bewertung mit unabhängig eingestuften Testpersonen kalibriert werden. Die App stellt kein offizielles Sprachzertifikat aus.
