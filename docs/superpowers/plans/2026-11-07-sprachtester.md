# Smart Language Test Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Funktionsfähige deutsche B2-Voreinschätzung per Audio und Text mit Markdown-Profilen und messbaren Antwortzeiten.

**Architecture:** Next.js und TypeScript. Reine Prüfungsfunktionen sind von Oberfläche und Gemini-Adapter getrennt. Live-Audio verbindet sich mit eingeschränkten kurzlebigen Tokens; Text und Auswertung laufen serverseitig.

**Tech Stack:** Next.js, React, TypeScript, Google Gen AI SDK, Zod, YAML, Vitest, Playwright, ESLint, Prettier; pnpm.

**Spec:** docs/superpowers/specs/2026-11-07-sprachtester-design.md

## Global Constraints

- Nur Deutsch; Ziel B2; zehn Minuten plus höchstens 60 Sekunden Abschlussfrist.
- Keine persistenten Gesprächsdaten und keine Rohaufnahmen; Schlüssel ausschließlich serverseitig.
- Themenprofil bis 32 KiB; Markdown- und JSON-Export.
- Ohne API-Zugang ehrlicher Konfigurationshinweis, keine fingierten Testergebnisse.
- Nutzer autorisiert Umsetzung und regelmäßiges Aktualisieren von main; Arbeit im bestehenden Checkout.

## Review Focus

- Manipuliertes Markdown darf die Bewertungsregeln nicht verändern: Profiltests und getrennte Datenkontexte.
- Verspätete/fehlende Transkripte dürfen keine falschen Zeiten erzeugen: Zeit- und Audioreduzertests.
- Doppelte Klicks, Abschluss während offener Requests: Sitzungs-/Request-IDs und Browser-/Integrationstests.
- Ungültige Modellantworten und fehlende Zitate: Auswertungsschema und Belegprüfung testen.
- Verbindungsabbruch oder versteckter Browser: Zeitlücke markieren, unzuverlässige Metriken ausschließen.

## Task 1: Prüfungsdomäne

Files: `src/lib/{profile,exam,timing,transcript,assessment,types}.ts`, `tests/domain.test.ts`, `config/exam.de.md`, Projektkonfiguration.
Interfaces: `parseProfile(markdown): ExamProfile`; `measureTiming(turn): Timing`; `phaseAt(ms): Phase`; `assessEvidence(turns): boolean`; `exportMarkdown(session): string`.

- [ ] Tests zuerst: ungültige Metadaten, 32-KiB-Grenze, negative/fehlende Zeiten, Phasengrenzen, unzureichende Evidenz, Export mit Teilnehmerzeiten und Profil.
- [ ] `pnpm test` ausführen und fehlende Funktionen feststellen.
- [ ] Typen und reine Funktionen implementieren; vollständige Tests grün ausführen.
- [ ] Commit.

## Task 2: Server und KI-Grenze

Files: `src/server/{provider,guard,prompts}.ts`, `src/app/api/{status,session,chat,assess,live}/route.ts`, `tests/server.test.ts`.
Interfaces: JSON-Endpunkte mit Schema-Validierung; Sitzungs-Token bindet Profil und Modus. Profil stammt bei jedem KI-Aufruf aus der serverseitigen Sitzung, nicht aus unvalidierten Clientanweisungen.

- [ ] Tests zuerst: keine Schlüssel in Status, fehlender Zugang, Origin/Zugriffsschutz, Größen-/Sitzungslimits, ungültige Bewertung, nicht existente Zitate.
- [ ] Rote Tests bestätigen; Adapter mit konfigurierbaren Modellen, Timeouts, getrennten Bewertungsanweisungen und begrenzten Eingaben implementieren.
- [ ] Grüne Tests, Typprüfung und Commit.

## Task 3: Start, Textprüfung, Ergebnis

Files: `src/components/{language-test,setup,exam-view,result-view}.tsx`, `src/hooks/use-exam.ts`, `src/app/{page,layout,globals.css}`; `e2e/exam.spec.ts`.
Interfaces: `useExam()` verwaltet genau eine laufende Sitzung, monotone Zeiten, Phasen, Einwilligung, Exporte, Abbruch und Wiederholung.

- [ ] Browsertests zuerst: Start nur mit Einwilligung, Profilfehler, Textdialog, Zeitmessung, Abschluss und Download mit simuliertem externem Dienst.
- [ ] UI mit gut bedienbarer mobiler Darstellung und zugänglichen Zuständen implementieren.
- [ ] API-Konfigurationsfehler, Timer, 60-Sekunden-Frist, Hintergrundstatus und Request-Abbruch prüfen.
- [ ] Tests und Produktionsbuild; Commit.

## Task 4: Live-Audio

Files: `src/lib/audio/{capture,playback,live,turns}.ts`, `public/pcm-worklet.js`, `tests/audio.test.ts`.
Interfaces: `LiveConversation.start(callbacks)` / `stop()` / `setMuted(boolean)`; lokale Aktivitätsereignisse liefern Zeiten unabhängig von Text-Transkripten.

- [ ] Audioreduzertests zuerst: getrennte Sprechzeiten, partielle Transkripte, unterbrochene Ausgabe, fehlende Ereignisse, erneute Verbindung ohne doppelte Inhalte.
- [ ] PCM-Eingabe über AudioWorklet, 24-kHz-Ausgabe, Mikrofonberechtigung, Unterbrechungen und Wiederaufnahme implementieren.
- [ ] Ressourcen bei Abbruch/Fehler/Unmount freigeben. Automatische Wiederaufnahme maximal 30 Sekunden; danach explizites Fortsetzen oder Beenden.
- [ ] Automatische Tests; echte Audioprüfung nur bei vorhandenem Schlüssel und Mikrofonzugang als bestanden melden.
- [ ] Commit.

## Task 5: Auslieferung

Files: `README.md`, `.env.example`, `.github/workflows/ci.yml`, `docs/implementation-notes.md`.

- [ ] Einrichtung, Profilformat, Providerbedingungen, lokale Nutzung und Prüfungsgrenzen dokumentieren.
- [ ] Lint, Formatprüfung, Typprüfung, vollständige Unit-/Integrationstests, Browsertests und Produktionsbuild ausführen.
- [ ] Gesamten Branch unabhängig prüfen lassen, wesentliche Funde beheben und erneut prüfen.
- [ ] Geprüften Stand auf main synchronisieren; verbleibende externe Voraussetzungen klar nennen.

## Ausführungsnotizen

Ruling: Die ausdrückliche Aufforderung „mach bitte“ autorisiert die direkte Umsetzung des bereits freigegebenen Entwurfs; keine zusätzliche Planfreigabe.

Ruling: Gemini ist aufgrund des bereits gewählten Browsergesprächs und der dokumentierten eingeschränkten Sitzungstokens der erste Adapter. Modellnamen sind Umgebungsvariablen; keine Zusage eines kostenlosen Kontingents.
