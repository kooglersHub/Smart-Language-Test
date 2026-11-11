# Bewerberverwaltung Implementation Plan

**Goal:** Geschützter Verwaltungsbereich mit dauerhaften Themenprofilen, Einladungen und Ergebnissen.

**Architecture:** SQLite mit `node:sqlite`, serverseitige Sitzungen, gehashte Einladungstokens und atomare Statuswechsel. Der bestehende Prüfungsablauf erhält einen Einladungsmodus; Transkripte und Ergebnisse werden fortlaufend gespeichert.

**Spec:** `docs/superpowers/specs/2026-11-11-bewerberverwaltung-design.md`

1. Datenbank, Login und Token-Lebenszyklus mit Sicherheits- und Persistenztests.
2. Geschützte Verwaltungs- und Bewerberendpunkte sowie Speichern des Prüfungsverlaufs.
3. Responsive Verwaltung und Einladungsablauf einschließlich Einwilligung und Fehlerzuständen.
4. README, Konfiguration, Browser- und Integrationstests, Lint, Typprüfung und Build.

**Grenzen:** Eine öffentliche Nutzung benötigt HTTPS und einen Server mit persistentem Speicher. Keine kostenpflichtige Bereitstellung oder Demoergebnisse als echte Daten ausgeben.
