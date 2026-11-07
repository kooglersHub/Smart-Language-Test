# Smart Language Test – Entwurf der ersten Version

Stand: 7. November 2026. Status: Entwurf zur Freigabe, noch keine Implementierung.

## Zweck

Eine deutschsprachige Web-App prüft in einem etwa zehnminütigen KI-Dialog, ob die Deutschkenntnisse einer Person auf B2 hindeuten. Es gibt einen Gesprächsmodus mit Mikrofon und einen Textmodus. Das Ergebnis ist eine begründete, unverbindliche GER-Einschätzung und kein Prüfungszertifikat.

Der Nutzer hat bestätigt: nur Deutsch, Gesprächsinhalte über eine Markdown-Datei beeinflussbar, Transkript mit Antwortzeiten und zusätzlicher Textmodus. Die übrigen Festlegungen in diesem Dokument sind Umsetzungsvorschläge.

## Ansätze und Empfehlung

1. **Gespräch im Browser plus Textmodus (empfohlen):** Gemeinsame Prüfungslogik, getrennte Ein- und Ausgabe für Audio und Text. Erfüllt die gewünschten Modi ohne Telefonanschluss. Audio erfordert eine Echtzeitverbindung und Mikrofonfreigabe.
2. **Textmodus zuerst, Audio später:** Geringerer technischer Aufwand für den ersten Start, deckt die gewünschte Gesprächsprüfung zunächst aber nicht ab.
3. **Echte Telefonanrufe:** Zusätzliche Telefonieintegration und laufende Kosten; für die erste Version ohne Mehrwert gegenüber einem Browsergespräch.

Dieser Entwurf konkretisiert Ansatz 1 aus der bisherigen Vorlage. Ein eigener kleiner Aufbau vermeidet die Übernahme einer kompletten Entwicklerkonsole. Falls Bibliotheken oder Vorlagenteile übernommen werden, bleiben ihre Lizenzhinweise erhalten.

## Umfang und Grenzen

- Responsive Website mit Start, Prüfung und Ergebnis; Bedienoberfläche und Testsprache Deutsch.
- Audio- und Textmodus nutzen denselben konfigurierbaren Prüfungsplan.
- Standarddauer zehn Minuten; frühzeitiges Beenden ist möglich.
- Themenkonfiguration, nachvollziehbares Transkript, Zeitmessung und Download gehören zur ersten Version.
- Keine Benutzerkonten, Datenbank, dauerhafte Testhistorie oder Telefonnummer in der ersten Version.
- Keine angeblich echte Bewertung aus fest verdrahteten Beispielen. Ohne eingerichteten KI-Zugang zeigt die App einen klaren Konfigurationshinweis; eine optionale Demo muss als Demo gekennzeichnet sein.

## Ablauf

### Start

Die Person wählt „Gespräch“ oder „Textchat“. Angezeigt werden Dauer, Zielniveau B2 und das aktive Gesprächsprofil. Optional kann sie eine andere `.md`-Datei laden; deren Titel, Themen und Aufgaben werden vor dem Start zusammengefasst.

Vor der ersten Übertragung bestätigt sie die Verarbeitung durch den eingebundenen KI-Dienst. Der Audiomodus prüft Mikrofonberechtigung und Audioausgabe vor Beginn der Prüfungszeit. Die App speichert keine Rohaufnahme.

### Prüfung

Die Standardprüfung besteht aus Einstieg (0–2 Minuten), begründeter Stellungnahme (2–5), adaptiven Rückfragen (5–8) und Transferaufgabe (8–10). Die KI stellt jeweils eine Frage, lässt die Person antworten und passt die Schwierigkeit zwischen B1 und C1 an. Sie prüft Sprache, nicht das Fachwissen über das gewählte Thema.

Der Gesprächsmodus zeigt Verbindungsstatus, Mikrofonzustand, verbleibende Zeit und das laufende Transkript. Die Person kann ihr Mikrofon stummschalten oder den Test beenden. Das Stummschalten hält die Prüfungszeit nicht an. Unterbrechungen während der KI-Ausgabe stoppen die Ausgabe, soweit der gewählte Dienst das unterstützt, und werden im Transkript markiert.

Der Textmodus bietet Nachrichtenverlauf, mehrzeilige Eingabe und einen Senden-Knopf. Enter sendet, Umschalt+Enter erzeugt einen Zeilenumbruch. Während die KI antwortet, kann ein Entwurf geschrieben, aber keine weitere Nachricht abgeschickt werden. Ein Moduswechsel während einer Prüfung ist nicht vorgesehen.

Bei Ablauf der zehn Minuten beginnt keine neue Frage. Eine bereits begonnene Antwort darf bis zu 60 Sekunden überziehen; danach wird abgeschlossen. Die Zeit bis zum Ende und eine eventuelle Überziehung werden getrennt ausgewiesen. Eine fehlende Abschlussantwort wird nicht erfunden.

### Ergebnis

Ein separater KI-Aufruf bewertet das abgeschlossene Transkript; die Gesprächsinstanz bewertet sich nicht selbst. Audioindikatoren werden nur einbezogen, wenn sie tatsächlich erfasst und für diesen Zweck geeignet sind. Ein separates Modell ist bevorzugt, aber nicht Voraussetzung: getrennte Anfrage und getrennte Bewertungsanweisung sind verbindlich.

Ergebnis: geschätztes Niveau oder „nicht ausreichend beurteilbar“, Einschätzung zu B2, kurze Begründung, Stärken, Lernfelder und Belege mit Verweisen auf Teilnehmerantworten. Ein kurzer oder abgebrochener Test wird entsprechend gekennzeichnet. Als Mindestgrundlage werden fünf inhaltliche Teilnehmerantworten und mindestens eine Argumentations- sowie eine Transferaufgabe verlangt; das ist eine Produktregel und keine wissenschaftlich validierte Schwelle.

Im Audiomodus werden Wortschatz, Korrektheit, Kohärenz und Interaktion beurteilt. Zeitmerkmale können Hinweise auf Flüssigkeit liefern, erlauben allein aber keine belastbare Bewertung. Aussprache und Hörverstehen werden ohne geeignete Audioauswertung nicht als gemessen ausgewiesen. Im Textmodus beziehen sich alle Ergebnisse auf schriftliche Interaktion; Tipptempo wird nicht als mündliche Flüssigkeit bewertet. Es gibt zunächst keine ausgedachten GER-Prozentwerte oder numerische Konfidenz.

## Gesprächsinhalte über Markdown

Standarddatei: `config/exam.de.md`. Sie liegt im Repository und kann ohne Änderung des Anwendungscodes angepasst werden. Zusätzlich ist vor einer Prüfung ein lokaler Upload möglich, der nur für diese Sitzung gilt und die Repository-Datei nicht überschreibt.

Die Datei enthält optional einen eingeschränkten YAML-Vorspann sowie lesbare Abschnitte für Kontext, Themen und Aufgaben. Beispiel:

````markdown
---
title: Alltag und Arbeitswelt
targetLevel: B2
durationMinutes: 10
---

## Kontext
Ein Gespräch mit einer erwachsenen Person über Alltag und Beruf.

## Themen
- Lernen und Weiterbildung
- Zusammenarbeit im Homeoffice

## Aufgaben
- Beschreibe eine Erfahrung, bei der du etwas Neues lernen musstest.
- Wäge Vor- und Nachteile von Homeoffice ab und begründe deine Meinung.
- Reagiere auf das Gegenargument, dass Zusammenarbeit nur im Büro funktioniert.

## Transferaufgabe
Du organisierst die Zusammenarbeit eines neuen Teams. Schlage Regeln vor
und erkläre, wie du unterschiedliche Bedürfnisse berücksichtigen würdest.
````

`title` ist optional und höchstens 120 Zeichen lang. `targetLevel` darf in Version 1 nur B2 sein, `durationMinutes` nur 10; fehlende Werte erhalten diese Standards. Der Upload akzeptiert UTF-8-Markdown bis 32 KiB, höchstens 20 Themen/Aufgaben pro Abschnitt, und zeigt Validierungsfehler vor dem Start. Mindestens ein Thema oder eine Aufgabe muss vorhanden sein. Eine fehlende Transferaufgabe ergänzt die KI passend zum Thema.

Die Konfiguration liefert ausschließlich Gesprächsmaterial. Sie kann Bewertungsmaßstäbe, Einwilligung, Testsprache, Sicherheitsregeln oder das Ergebnis nicht überschreiben. Unbekannte Metadaten erzeugen einen verständlichen Validierungsfehler. Es gibt keine ausführbaren YAML-Tags, kein HTML-Rendering und kein Nachladen externer Dateien oder Links. Teilnehmerantworten und Profilinhalt bleiben im Modellkontext als untrusted data von festen Anweisungen getrennt. Die Auswertung verwendet die feste Rubrik und überprüft Zitate gegen das tatsächliche Transkript.

## Transkript und Zeitmessung

Jede Sitzung erhält eine Kennung, Startzeit in UTC, Modus, Profil-Snapshot und Konfigurationsversion. Jede Äußerung erhält eine stabile ID, Sprecher, Text, Status (vorläufig, final, unterbrochen), Zuordnung zur Frage und relative Zeitmarken seit Sitzungsbeginn. Die Anzeige nutzt lokale Uhrzeiten; Zeitdifferenzen stammen aus einer monotonen Uhr.

Für eine vollständige Frage-Antwort-Runde werden getrennt erfasst:

| Messwert | Gespräch | Textchat |
| --- | --- | --- |
| Frage vollständig angekommen | Ende der tatsächlich abgespielten KI-Ausgabe | Ende der sichtbaren KI-Ausgabe |
| Antwortbeginn | Erster erkannter Sprechbeginn nach der Frage | Erste inhaltliche Eingabe in den Antwortentwurf |
| Reaktionszeit | Sprechbeginn minus Frageende | Eingabebeginn minus Frageende |
| Antwortdauer | Ende minus Beginn der erkannten Sprache | Absenden minus Eingabebeginn |
| Gesamte Antwortzeit | Antwortende minus Frageende | Absenden minus Frageende |

Diese Metriken werden verständlich benannt: etwa „Nach 2,4 s angefangen · 31 s gesprochen“ oder „Nach 4 s angefangen · nach insgesamt 47 s abgesendet“. Im Textmodus wird die Antwortdauer als Bearbeitungsdauer bezeichnet, da sie auch Pausen enthält. Die App erfasst Zeitereignisse und abgeschickten Text, keine Folge einzelner Tastendrücke und keine gelöschten Entwürfe.

Bei bereits während der KI-Ausgabe begonnener Antwort, Unterbrechung, fehlenden Ereignissen oder Verbindungsproblemen wird die Reaktionszeit als nicht vergleichbar beziehungsweise nicht messbar ausgewiesen. Es gibt keine negativen oder ersatzweise geschätzten Zahlen. Die Rohzeitmarken bleiben erhalten. Im Textmodus zählt auch Einfügen als Eingabebeginn; die App behauptet keine Erkennung unerlaubter Hilfsmittel. Im Hintergrund verbrachte Zeit wird markiert.

Audioerkennung und Netzwerklatenz begrenzen die Genauigkeit. Die Anzeige nennt Audiozeiten daher näherungsweise; Audio-Sprechbeginn und -ende stammen bevorzugt aus lokalen Aktivitätsereignissen, nicht aus dem verspäteten Eingang fertiger Transkripte. Modell-Antwortlatenz und Teilnehmer-Reaktionszeit werden getrennt gehalten.

Download: lesbares Markdown mit Gespräch und Zeiten sowie JSON mit sämtlichen Ereignissen, Messwerten, Statusinformationen, Profil und Ergebnis. Kein Download von Audiorohdaten. Abgebrochene Sitzungen können ebenfalls exportiert werden.

## Fehler, Verbindungsabbrüche und Datenschutz

- Ein abgelehntes Mikrofon führt zu einer verständlichen Meldung; vor dem Start kann auf Text gewechselt werden.
- Bei API- oder Kontingentfehlern bleibt das bisherige Transkript erhalten. Die Oberfläche erklärt den Fehler und bietet Wiederholen oder Beenden an.
- Verbindungsunterbrechungen unterbrechen die aktive Prüfungszeit. Die App versucht eine Wiederaufnahme bis zu 30 Sekunden; danach ist bewusstes Fortsetzen oder Abschließen erforderlich. Wiederaufnahme und Lücke werden markiert; betroffene Antwortzeiten gelten als nicht vergleichbar.
- Beim Abschluss stoppen Mikrofon, Ausgabe und Verbindung. Eine fehlgeschlagene Auswertung kann ohne Wiederholung der Prüfung erneut angefordert werden.
- Ein Neuladen der Seite beendet die Sitzung in Version 1; darauf weist die App bei laufender Prüfung hin. Es wird keine dauerhafte Wiederherstellung versprochen.
- Transkript und Ergebnis verbleiben während der Sitzung im Arbeitsspeicher; keine standardmäßige persistente Browser- oder Serverablage. Der Nutzer kann sie herunterladen oder löschen. Löschung beendet auch offene Verarbeitung in der App, soweit technisch möglich; bereits beim KI-Anbieter verarbeitete Daten unterliegen dessen Bedingungen.
- Serverlogs enthalten technische Fehlerkennungen, aber keine API-Schlüssel, Gesprächsinhalte oder Rohaufnahmen. Dienst, Datenverarbeitung und gegebenenfalls dessen Aufbewahrung müssen vor einem öffentlichen Start konkret dokumentiert werden.

## Technischer Vorschlag

Next.js mit TypeScript für Oberfläche und kleine serverseitige Endpunkte. Prüfungszustand, Profilvalidierung, Zeitberechnung, Exporte und Bewertungsvalidierung werden getrennte Module. Ein Provider-Adapter kapselt Textdialog, Live-Audio und separate Auswertung.

Der KI-Anbieter wird vor der Implementierung anhand seiner offiziellen aktuellen Dokumentation geprüft: verfügbare Modelle, Audiotranskripte, Unterbrechungen, kurzlebige Sitzungstokens, Wiederaufnahme, Limits und Kosten. Gemini Live aus der Vorlage ist ein Kandidat; ein dauerhaft kostenloser Betrieb wird nicht zugesichert. Die konkrete Modellkennung bleibt konfigurierbar.

Dauerhafte API-Schlüssel bleiben auf dem Server. Direkte Audioverbindungen aus dem Browser sind nur mit kurzlebiger, eingeschränkter Autorisierung vorgesehen. Falls das der gewählte Dienst nicht ermöglicht, ist ein geeigneter Server-Relay nötig und die Hostingentscheidung muss WebSockets unterstützen. Statisches GitHub-Pages-Hosting allein reicht für diese Architektur nicht.

Zur ersten lokalen Version gehört eine `.env.example`, niemals ein echter Schlüssel im Repository. Eine öffentliche Freischaltung setzt serverseitige Sitzungs- und Anfragelimits, Eingabegrenzen und einen Schutz gegen unbeschränkten API-Verbrauch voraus. Ohne eingerichteten Schutz bleibt der Echtbetrieb lokal. Hosting und Veröffentlichung sind noch nicht festgelegt.

## Prüfbarkeit und Abnahme

- Tests für gültige/ungültige Profile einschließlich Grenzen und unzulässiger Metadaten.
- Tests der Zeitberechnung für Audio, Text, vorzeitige Eingabe, Unterbrechung, fehlende Ereignisse und Wiederaufnahme.
- Tests für Phasenwechsel, Ablauf, 60-Sekunden-Abschlussfrist und Beenden ohne weitere KI-Frage.
- Tests für feste Auswertungsrubrik, unzureichende Evidenz, ungültige Modellausgaben und Transkriptbelege.
- Integrationstests mit simuliertem Provider für beide Modi, Fehler, erneute Auswertung und Export. Wiederholungen dürfen Äußerungen oder Auswertung nicht duplizieren.
- Browserprüfung für Start, Profil-Upload, Textdialog, Abschluss, Downloads und mobile Bedienung. Audio wird zusätzlich mit echtem Mikrofon und eingerichteter API manuell überprüft; ohne diese Prüfung wird Audio nicht als vollständig verifiziert bezeichnet.
- Linter, Typprüfung, automatisierte Tests und Produktionsbuild laufen in CI. README dokumentiert Einrichtung, Start, Tests, Providerkonfiguration, Markdownformat und Grenzen der Einstufung.
- Vor einer belastbaren B2-Aussage muss die Bewertung mit unabhängig eingestuften Testpersonen beziehungsweise Transkripten verglichen werden. Die technische Umsetzung allein belegt keine diagnostische Validität.

## Noch zu bestätigen

Dieser Entwurf nimmt eine lokale, funktionsfähige erste Version mit beiden Modi und optionalem Profil-Upload an. Nach inhaltlicher Freigabe folgen der konkrete Implementierungsplan und die Umsetzung. Anbieterwahl und Hosting werden anhand der technischen Anforderungen und verfügbarer Zugänge festgelegt.

