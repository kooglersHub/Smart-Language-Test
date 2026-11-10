# Bewerberverwaltung für Sprachraum

Stand: 11. November 2026. Status: Entwurf zur Freigabe.

## Ziel und Entscheidung

Eine gemeinsame Anwendung umfasst den bestehenden deutschen Sprachtest und einen geschützten Verwaltungsbereich. Die verantwortliche Person lädt Themenprofile hoch, erstellt individuelle Bewerberlinks und sieht eingegangene Ergebnisse samt Transkript und Antwortzeiten ein. Die bestehenden Audio- und Textmodi bleiben verfügbar. Gewählt wurde eine integrierte Anwendung statt zweier separat betriebener Anwendungen.

Der bisherige Server speichert Prüfungen nur flüchtig. Daher erhält die Anwendung einen dauerhaften Datenspeicher. Für die erste Version wird SQLite auf einem persistenten Serverlaufwerk vorgeschlagen. Das funktioniert lokal und auf einem einzelnen geeigneten Server; vergängliche Dateisysteme und mehrere Serverinstanzen erfordern später einen anderen Speicher. Öffentlich nutzbare Links erfordern ein gesondert einzurichtendes Hosting mit HTTPS. Ein Hostinganbieter und kostenpflichtige Dienste werden dadurch nicht beauftragt.

## Verwaltungsbereich

- Anmeldung mit einem Administrator-Benutzernamen und Passwort. Das erste Konto wird bei der Installation über Umgebungsvariablen eingerichtet; keine öffentliche Registrierung.
- Passwort sicher gehasht speichern bzw. initial sicher verarbeiten, kryptografisch zufällige serverseitige Sitzungen, `HttpOnly`-, `SameSite`- und im HTTPS-Betrieb `Secure`-Cookies. Schutz gegen CSRF und begrenzte Anmeldeversuche. Keine Zugangsdaten oder Sitzungstokens in Logs.
- Abmeldung beendet die Sitzung. Verwaltungsendpunkte prüfen die Anmeldung serverseitig.
- Markdown-Profile hochladen, validieren, benennen, ansehen und für neue Einladungen auswählen. Vorhandene Profilvalidierung und feste Bewertungsregeln gelten weiter. Jeder Link erhält einen unveränderlichen Profil-Snapshot, sodass spätere Änderungen einen bereits erstellten Test nicht verändern.
- Pro Bewerber einen einmaligen, zufälligen Link erstellen. Optionaler Anzeigename und Ablaufdatum; Standardgültigkeit 14 Tage. Der vollständige Link wird nur unmittelbar nach der Erstellung angezeigt und kopiert; später ist ein unbenutzter Link widerrufbar und kann durch einen neu erstellten ersetzt werden. Der Link selbst ist ein Zugangstoken und darf nicht in Logs oder externe Analysewerkzeuge gelangen.
- Ergebnisliste mit Anzeigename, Status, Erstellungs- und Abschlusszeit, Modus und geschätztem Niveau. Detailansicht mit Bewertung, Transkript, Zeitmessungen und den verwendeten Themen. Ergebnisse und unbenutzte Einladungen können einzeln gelöscht werden.

## Bewerberablauf

- Der Bewerber öffnet seinen Link ohne Administratorkonto. Die Seite zeigt die Sprache, den Ablauf, die Prüfungsmodi und vor Beginn den Hinweis, welche Daten an den Betreiber und den KI-Anbieter übermittelt werden und dass das Ergebnis einschließlich Transkript beim Betreiber gespeichert wird. Erst eine ausdrückliche Einwilligung startet den Test.
- Ein gültiger Link ermöglicht genau eine abgeschlossene Prüfung. Vor Ablauf darf eine begonnene Prüfung bei einem technischen Fehler wiederaufgenommen werden, soweit vorhandene Sitzungsdaten dies sicher erlauben. Ein Link kann nicht gleichzeitig mehrere Prüfungen starten. Verbrauchte, widerrufene und abgelaufene Links zeigen einen verständlichen Zustand. Abbruch und Wiederaufnahme dürfen keine zweite Ergebniszeile erzeugen.
- Der vorhandene zehnminütige Prüfungsablauf und die drei Auswertungszustände bleiben bestehen. Audio wird nicht als Rohaufnahme gespeichert. Transkript, Antwortzeiten, Ergebnis, Modus und die zum Verständnis nötigen Ereignisse werden dauerhaft gespeichert, sobald sie anfallen, sodass ein Auswertungsfehler den Gesprächsverlauf nicht vernichtet. Eine fehlgeschlagene Auswertung kann erneut angestoßen werden.
- Das Ergebnis ist eine unverbindliche GER-Voreinschätzung, kein offizielles Zertifikat. Aussprache und Hörverstehen werden weiterhin nicht als zuverlässig gemessen ausgegeben.

## Datenschutz und Lebenszyklus

Ergebnisse enthalten personenbezogene Daten. Der Betreiber sieht nur seine eigenen Prüfungen; Version 1 hat genau ein Administratorkonto. Im Interface sollen keine Analytics oder externen Schriftarten eingebunden werden. Die Standardaufbewahrung beträgt 90 Tage nach Abschluss. Bei begonnenen oder ohne erfolgreiche Auswertung abgebrochenen Prüfungen beginnt die Frist nach der letzten Aktivität; danach werden auch ihre Transkripte und Einladungen gelöscht. Der Server entfernt abgelaufene Datensätze automatisch und bietet sofortige manuelle Löschung. Unbenutzte Links verfallen zum gewählten Ablaufdatum und werden spätestens 90 Tage später gelöscht. Backups und Betriebsumgebung müssen dieselbe Löschfrist berücksichtigen; darüber ist in der Betriebsdokumentation zu informieren.

Die Einwilligung zum Speichern ist vom bisherigen rein flüchtigen Test unterscheidbar. Der bestehende freie Test speichert weiterhin keine Ergebnisse dauerhaft. Der konkrete Betreiber muss für einen öffentlichen Betrieb seine Datenschutzhinweise und die Anbieterbedingungen ergänzen.

## Sicherheit und Grenzen

- Tokens für Einladungen sind mindestens 256 Bit zufällig, werden in der Datenbank nur gehasht abgelegt und sind über eine sichere Verbindung zu übertragen. Kein Token in Referer-Headern an externe Ziele; keine personenbezogenen Daten in der URL.
- Eingaben und Dateigrößen serverseitig prüfen; Anfragen, Tokenversuche und KI-Nutzung begrenzen. Einladungen sind durch atomare Zustandswechsel gegen parallele Starts geschützt.
- Der Gemini-Schlüssel bleibt ausschließlich auf dem Server. Die vorhandene Beschränkung auf die tatsächlichen Kontingente des Google-Projekts bleibt bestehen; die App richtet kein Bezahlkonto ein.
- SQLite-Transaktionen und Migrationsskripte schützen Datenintegrität. Ein persistenter Speicherpfad wird konfigurierbar und von Git ausgeschlossen. Ein Backup-/Wiederherstellungshinweis gehört in die README.
- Keine automatische E-Mail, keine öffentlichen Registrierungen, kein Bewerberpasswort und keine Mehrbenutzerverwaltung in Version 1. Links werden durch den Administrator kopiert und selbst weitergegeben.

## Abnahme und Tests

- Tests für Passwortprüfung, ungültige/abgelaufene Sitzungen, CSRF, fehlende Berechtigung und Begrenzung von Anmeldeversuchen.
- Tests für Profilvalidierung und unveränderliche Snapshots; unberechtigter Upload wird zurückgewiesen.
- Tests für nicht erratbare Tokenbehandlung, Ablauf, Widerruf, parallelen Start, einmaligen Abschluss und Wiederaufnahme nach Fehler.
- Integrationstests für Speicherung von Transkript und Ergebnis, Auswertungswiederholung ohne Duplikat, Zugriffsschutz, manuelle und automatische Löschung.
- Browsertests mit simuliertem KI-Dienst: Administratoranmeldung, Profil hochladen, Link erstellen, Bewerbertest durchführen und Ergebnis einsehen; ungültige Links und Mobilansicht prüfen.
- Lint, Typprüfung, vollständige Tests, Produktionsbuild und CI. README beschreibt lokales Setup, Zugangsdaten, Datenbankpfad, Backups und Hostingvoraussetzungen.

## Grenzen der ersten Bereitstellung

Der Arbeitsstand wird zunächst lokal nutzbar und im bestehenden GitHub-Repository bereitgestellt. Öffentliche Bewerberlinks funktionieren erst nach Einrichtung eines geeigneten Servers mit HTTPS und persistentem Speicher. Ohne eingerichteten Gemini-Schlüssel sind echte KI-Gespräche weiterhin nicht testbar.
