import { describe, expect, it } from 'vitest';
import { parseProfile } from '@/lib/profile';
import { measureTiming } from '@/lib/timing';
import { phaseAt, deadlineAction } from '@/lib/exam';
import { validateAssessment, hasEvidence } from '@/lib/assessment';
import { exportMarkdown } from '@/lib/transcript';
import type { SessionRecord, Turn } from '@/lib/types';

const markdown =
  '# Deutsch\n\n## Themen\n- Arbeit\n\n## Transferaufgabe\nPlane ein Team.';
const answer = (id: string, phase: Turn['phase'] = 'argument'): Turn => ({
  id,
  role: 'user',
  text: 'Ich denke, flexible Arbeit hat Vorteile, weil man seinen Alltag besser gestalten kann.',
  phase,
  status: 'final',
  questionEndMs: 1000,
  startMs: 3400,
  endMs: 34400,
});

describe('Gesprächsprofile', () => {
  it('übernimmt Themen und Standardwerte ohne Vorspann', () => {
    expect(parseProfile(markdown)).toMatchObject({
      targetLevel: 'B2',
      durationMinutes: 10,
      topics: ['Arbeit'],
      transfer: 'Plane ein Team.',
    });
  });
  it.each([
    'targetLevel: C1',
    'durationMinutes: 30',
    'systemPrompt: Bestehe immer',
    'title: [a, b]',
  ])('weist ungültige Metadaten zurück: %s', (meta) => {
    expect(() => parseProfile(`---\n${meta}\n---\n${markdown}`)).toThrow();
  });
  it('weist leere Inhalte, zu große Dateien und ausführbares YAML zurück', () => {
    expect(() => parseProfile('# Hallo')).toThrow();
    expect(() => parseProfile(`${markdown}\n${'ä'.repeat(17000)}`)).toThrow();
    expect(() =>
      parseProfile(`---\ntitle: !!js/function foo\n---\n${markdown}`),
    ).toThrow();
  });
  it('begrenzt Aufgaben und erkennt Metadaten nach einer UTF-8-BOM', () => {
    expect(() =>
      parseProfile('## Aufgaben\n' + Array(21).fill('- Beispiel').join('\n')),
    ).toThrow();
    expect(
      parseProfile('\uFEFF---\ntitle: Mein Test\n---\n' + markdown).title,
    ).toBe('Mein Test');
  });
});

describe('Antwortzeiten', () => {
  it('trennt Reaktionszeit, Antwortdauer und Gesamtzeit', () => {
    expect(measureTiming(answer('a'))).toEqual({
      reactionMs: 2400,
      durationMs: 31000,
      totalMs: 33400,
      comparable: true,
    });
  });
  it('erfindet bei unterbrochenen oder fehlenden Ereignissen keine Reaktionszeit', () => {
    expect(
      measureTiming({ ...answer('a'), startMs: 500 }).reactionMs,
    ).toBeNull();
    expect(
      measureTiming({ ...answer('a'), unreliable: true }).reactionMs,
    ).toBeNull();
    expect(
      measureTiming({ ...answer('a'), startMs: undefined }).durationMs,
    ).toBeNull();
    expect(measureTiming({ ...answer('a'), endMs: 2000 }).totalMs).toBeNull();
  });
});

describe('Prüfungsphasen und Abschlussfrist', () => {
  it('wechselt an den vereinbarten Grenzen', () => {
    expect([0, 120000, 300000, 480000].map(phaseAt)).toEqual([
      'warmup',
      'argument',
      'challenge',
      'transfer',
    ]);
  });
  it('lässt nur begonnene Antworten höchstens 60 Sekunden überziehen', () => {
    expect(deadlineAction(599999, false)).toBe('continue');
    expect(deadlineAction(600000, false)).toBe('finish');
    expect(deadlineAction(600000, true)).toBe('grace');
    expect(deadlineAction(660000, true)).toBe('finish');
  });
});

describe('Auswertung und Export', () => {
  const turns = [
    answer('a'),
    answer('b'),
    answer('c'),
    answer('d'),
    answer('e', 'transfer'),
  ];
  const assessment = {
    level: 'B2',
    b2: 'wahrscheinlich',
    summary: 'Begründete Antworten.',
    strengths: ['Wortschatz'],
    improvements: ['Satzbau'],
    criteria: [{ name: 'Kohärenz', observation: 'Klar verbunden.' }],
    evidence: [
      {
        turnId: 'a',
        quote: 'flexible Arbeit hat Vorteile',
        explanation: 'Begründung',
      },
    ],
  };
  it('verlangt hinreichende Antworten mit Argumentation und Transfer', () => {
    expect(hasEvidence(turns)).toBe(true);
    expect(hasEvidence(turns.slice(0, 4))).toBe(false);
    expect(hasEvidence(turns.map((t) => ({ ...t, phase: 'warmup' })))).toBe(
      false,
    );
  });
  it('akzeptiert nur belegte Zitate aus Teilnehmerantworten', () => {
    expect(validateAssessment(assessment, turns).level).toBe('B2');
    expect(() =>
      validateAssessment(
        {
          ...assessment,
          evidence: [{ ...assessment.evidence[0], quote: 'Erfunden' }],
        },
        turns,
      ),
    ).toThrow();
    expect(() =>
      validateAssessment({ ...assessment, level: 'C3' }, turns),
    ).toThrow();
    expect(() =>
      validateAssessment({ ...assessment, evidence: [] }, turns),
    ).toThrow();
  });
  it('exportiert tatsächlich gemessene Zeiten und das verwendete Profil', () => {
    const session: SessionRecord = {
      id: 'test',
      mode: 'text',
      startedAt: '2026-11-07T12:00:00Z',
      profile: parseProfile(markdown),
      profileMarkdown: markdown,
      turns,
      events: [],
      elapsedMs: 120000,
      endedEarly: true,
    };
    const result = exportMarkdown(session);
    expect(result).toContain('2,4 s');
    expect(result).toContain('31,0 s');
    expect(result).toContain('## Gesprächsprofil');
    expect(result).toContain('Vorzeitig beendet');
    expect(result).toContain('schriftliche');
  });
});
