# Umsetzung und Verifikation

Die erste Version setzt den freigegebenen Browsergespräch-/Textchat-Ansatz um. Sie läuft auf einem einzelnen Node-Prozess. Ein Hostingdienst wurde nicht eingerichtet.

## Entscheidungen

- Eigenes schlankes Frontend statt Übernahme einer vollständigen Chatkonsole; Bibliothekslizenzen bleiben über das Paketmanagement erhalten.
- Gemini-Adapter mit eingeschränkten kurzlebigen Tokens für Audio. Dauerhafte Schlüssel gelangen nicht in den Client.
- Ein separater Bewertungsaufruf erhält ausschließlich das Transkript und eine feste Rubrik. Das Gesprächsprofil dient nicht als Bewertungsanweisung.
- TypeScript 6 für Kompatibilität mit typescript-eslint; Lockfile legt die installierten Versionen fest.
- Lokale Audioaktivität liefert ungefähre Zeitmarken. Text-Eingabeereignisse liefern ausschließlich erste Eingabezeit und Versandzeit, kein Tastaturprotokoll.
- Eine dreisekündige Abschlussphase lässt bereits übertragene Sprache fertig transkribieren. Sie verlängert nicht die erlaubte Antwortzeit. Fehlende Endtranskripte bleiben als unterbrochen sichtbar.
- Flüchtiger Sitzungsspeicher und Zugangscode für eine begrenzte Testgruppe. Für mehrere Serverinstanzen ist ein gemeinsamer Store nötig.

## Unabhängige Codeprüfung

Vier wesentliche Funde wurden mit Regressionstests bearbeitet:

1. Spät aufgelöste Mikrofonfreigaben nach Abbruch: Sitzungs-/Laufkennung schützt alle Audiocallbacks; Bereinigung betrifft nur die zugehörige Instanz.
2. Antworten während neuer KI-Ausgabe: Fragezuordnung bezieht sich auf die aktuelle Frage; Unterbrechungen markieren die Zeitmessung als nicht vergleichbar.
3. Verspätete Eingabetranskripte: Das ausstehende Transkript bleibt unabhängig von einer bereits begonnenen nächsten KI-Ausgabe mit der ursprünglichen Antwort verbunden.
4. Abschluss während ausstehender Transkription: Begrenztes Warten vor dem Schließen der Verbindung, mit ausdrücklicher Markierung unvollständiger Antworten.

Der Browserregressionstest erfasst auch JavaScript-Fehler beim mehrfachen Aufräumen von Audioressourcen. Das Schließen von Audiokontexten ist idempotent.

## Verifikationsgrenzen

Die automatischen Tests verwenden simulierte externe API-Antworten; sie behaupten keine erfolgreiche Verbindung zu einem realen Gemini-Konto. Ein echter Mikrofontest, die Modellverfügbarkeit im konkreten Konto, Tokenwiederaufnahme beim Anbieter sowie die diagnostische B2-Validität sind separat zu prüfen. Die Anwendung zeigt ohne API-Schlüssel einen Konfigurationshinweis und erlaubt keinen scheinbar echten Test.

Die README enthält lokale Startanweisungen und sämtliche Konfigurationsvariablen. Die CI führt dieselben Qualitätsprüfungen und Browserfälle aus; der tatsächliche GitHub-Lauf ist separat von lokalen Testergebnissen zu betrachten.

Lokale Abnahme am 7. November 2026: 34 Unit-/Integrationstests und sieben Browsertests bestanden; Lint, Typprüfung, Formatprüfung und Produktionsbuild erfolgreich. Desktop- und Mobilansicht wurden zusätzlich visuell kontrolliert. Die automatische Entfernung abgelaufener Serversitzungen ist auch ohne weitere Anfragen getestet.
