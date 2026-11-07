import type { SessionRecord } from './types';
import { clock, measureTiming, seconds } from './timing';
import { phaseLabels } from './exam';
export function exportMarkdown(session: SessionRecord) {
  const lines = ['# Deutschtest – Transkript', '', `Sitzung: ${session.id}`, `Start (UTC): ${session.startedAt}`, `Modus: ${session.mode === 'text' ? 'Textchat – schriftliche Interaktion' : 'Gespräch – Audiozeiten näherungsweise'}`, `Dauer: ${clock(session.elapsedMs)}`, `Abschluss: ${session.endedEarly ? 'Vorzeitig beendet' : 'Regulär beendet'}`, '', '## Gespräch'];
  for (const turn of session.turns) {
    lines.push('', `### ${turn.role === 'user' ? 'Teilnehmer/in' : 'Prüfungsbegleitung'} · ${phaseLabels[turn.phase]} · ${turn.id}`, '', turn.text, '', `Status: ${turn.status}`);
    if (turn.role === 'user') {
      const timing = measureTiming(turn);
      lines.push(`Reaktionszeit: ${seconds(timing.reactionMs)} · ${session.mode === 'text' ? 'Bearbeitungsdauer' : 'Sprechdauer'}: ${seconds(timing.durationMs)} · Gesamt: ${seconds(timing.totalMs)}`);
      if (!timing.comparable) lines.push('Zeitmessung nicht vergleichbar oder unvollständig.');
    }
  }
  if (session.assessment) {
    const a = session.assessment;
    lines.push('', '## Einschätzung', '', `Niveau: ${a.level} · B2: ${a.b2}`, '', a.summary, '', '### Stärken', ...a.strengths.map(s => `- ${s}`), '', '### Lernfelder', ...a.improvements.map(s => `- ${s}`), '', '### Kriterien', ...a.criteria.map(c => `- ${c.name}: ${c.observation}`), '', '### Belege', ...a.evidence.map(e => `- ${e.turnId}: „${e.quote}“ – ${e.explanation}`));
  }
  lines.push('', '## Ereignisse', ...session.events.map(e => `- ${clock(e.atMs)} · ${e.type}${e.detail ? ': ' + e.detail : ''}`), '', '## Gesprächsprofil', '', session.profileMarkdown, '', 'Unverbindliche GER-Voreinschätzung. Kein Sprachzertifikat. Keine belastbare Messung von Aussprache oder Hörverstehen.');
  return lines.join('\n');
}
