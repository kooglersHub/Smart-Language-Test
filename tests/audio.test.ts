import { describe, expect, it } from 'vitest';
import { AudioTurns } from '@/lib/audio/turns';
import { pcm16 } from '@/lib/audio/pcm';

describe('Audio-Transkript ohne Zeitverfälschung', () => {
  it('hängt verspätete Teilnehmertranskripte an die ursprüngliche Antwort an', () => {
    const turns = new AudioTurns();
    turns.modelText('Eine Frage');
    turns.modelEnd(1000, 'argument');
    turns.speechStart(2000, 'argument');
    turns.userText('Ich finde ', false);
    turns.speechEnd(4000);
    turns.modelStart('argument');
    turns.modelText('Die nächste Frage');
    turns.userText('das sinnvoll.', true);
    const answers = turns.snapshot().filter((t) => t.role === 'user');
    expect(answers).toHaveLength(1);
    expect(answers[0]).toMatchObject({
      text: 'Ich finde das sinnvoll.',
      startMs: 2000,
      endMs: 4000,
      status: 'final',
    });
  });
  it('kennzeichnet eine ausstehende Transkription beim Abschluss ausdrücklich', () => {
    const turns = new AudioTurns();
    turns.speechStart(1000, 'transfer');
    turns.speechEnd(4000);
    turns.finalizePending();
    expect(turns.snapshot()[0]).toMatchObject({
      status: 'interrupted',
      startMs: 1000,
      endMs: 4000,
    });
    expect(turns.snapshot()[0].text).toContain('Transkription');
  });
  it('ordnet eine Unterbrechung der gerade spielenden neuen Frage zu', () => {
    const turns = new AudioTurns();
    turns.modelText('Erste Frage');
    turns.modelEnd(1000, 'warmup');
    turns.speechStart(2000, 'warmup');
    turns.userText('Die erste Antwort ist vollständig.');
    turns.speechEnd(4000);
    turns.modelStart('argument');
    turns.modelText('Eine neue Frage');
    turns.speechStart(5000, 'argument');
    turns.userText('Ich unterbreche diese neue Frage.');
    turns.interrupt(5100, 'argument');
    turns.speechEnd(7000);
    const result = turns.snapshot();
    expect(result[3]).toMatchObject({
      questionId: result[2].id,
      unreliable: true,
    });
  });
  it('behält ein verspätetes Ausgabetranskript bei der bereits abgespielten Frage', () => {
    const turns = new AudioTurns();
    turns.modelStart('warmup');
    turns.modelEnd(1200, 'warmup');
    turns.modelText('Was machst du gern?');
    turns.speechStart(2500, 'warmup');
    turns.userText('Ich lese gern Bücher.');
    turns.speechEnd(7000);
    expect(turns.snapshot()).toHaveLength(2);
    expect(turns.snapshot()[1].questionEndMs).toBe(1200);
  });
  it('ordnet verspäteten Text den lokalen Sprechereignissen zu', () => {
    const turns = new AudioTurns();
    turns.modelText('Wie arbeiten Sie?');
    turns.modelEnd(1000, 'warmup');
    turns.speechStart(3400, 'warmup');
    turns.speechEnd(34400);
    turns.userText('Ich arbeite im Team.');
    const result = turns.flush();
    expect(result[1]).toMatchObject({
      text: 'Ich arbeite im Team.',
      startMs: 3400,
      endMs: 34400,
      questionEndMs: 1000,
    });
  });
  it('führt Teiltranskripte zusammen und markiert Unterbrechungen', () => {
    const turns = new AudioTurns();
    turns.modelText('Was denken ');
    turns.modelText('Sie darüber?');
    turns.interrupt(500, 'argument');
    turns.speechStart(450, 'argument');
    turns.userText('Es ist hilfreich.');
    turns.speechEnd(4000);
    const result = turns.flush();
    expect(result[0]).toMatchObject({
      text: 'Was denken Sie darüber?',
      status: 'interrupted',
    });
    expect(result[1].unreliable).toBe(true);
  });
  it('gibt fehlende Zeitmarken nicht als gemessene Null aus', () => {
    const turns = new AudioTurns();
    turns.userText('Eine Antwort ohne lokales Ereignis.');
    expect(turns.flush()[0]).toMatchObject({ unreliable: true });
    expect(turns.flush()).toHaveLength(0);
  });
});

describe('PCM-Kodierung', () => {
  it('begrenzt Samplewerte und schreibt 16-Bit Little Endian', () => {
    expect([...new Uint8Array(pcm16(new Float32Array([-2, 0, 2])))]).toEqual([
      0, 128, 0, 0, 255, 127,
    ]);
  });
});
