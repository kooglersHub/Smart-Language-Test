import { z } from 'zod';
import type { Assessment, Turn } from './types';
const text = z.string().trim().min(1).max(2000);
export const assessmentSchema = z.object({
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'nicht beurteilbar']),
  b2: z.enum(['wahrscheinlich', 'noch nicht', 'unklar']),
  summary: text,
  strengths: z.array(text).max(8),
  improvements: z.array(text).max(8),
  criteria: z
    .array(z.object({ name: text, observation: text }))
    .min(1)
    .max(8),
  evidence: z
    .array(
      z.object({ turnId: z.string().max(100), quote: text, explanation: text }),
    )
    .min(1)
    .max(12),
});
export function hasEvidence(turns: Turn[]) {
  const answers = turns.filter(
    (t) =>
      t.role === 'user' &&
      t.status === 'final' &&
      t.text.trim().split(/\s+/).length >= 5,
  );
  return (
    answers.length >= 5 &&
    answers.some((t) => t.phase === 'argument' || t.phase === 'challenge') &&
    answers.some((t) => t.phase === 'transfer')
  );
}
export function validateAssessment(value: unknown, turns: Turn[]): Assessment {
  const result = assessmentSchema.parse(value);
  for (const evidence of result.evidence) {
    const turn = turns.find(
      (t) => t.id === evidence.turnId && t.role === 'user',
    );
    if (!turn || !turn.text.includes(evidence.quote))
      throw new Error(
        'Die Auswertung enthält einen nicht belegbaren Textauszug.',
      );
  }
  if (!hasEvidence(turns))
    throw new Error(
      'Für eine Niveau-Einschätzung fehlen ausreichende Antworten.',
    );
  return result;
}
export function insufficientAssessment(): Assessment {
  return {
    level: 'nicht beurteilbar',
    b2: 'unklar',
    summary:
      'Für eine begründete Einstufung fehlen mindestens fünf inhaltliche Antworten einschließlich Argumentation und Transferaufgabe.',
    strengths: [],
    improvements: [
      'Führe eine vollständige Prüfung durch und begründe deine Antworten mit Beispielen.',
    ],
    criteria: [],
    evidence: [],
  };
}
