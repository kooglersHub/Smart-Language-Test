import { describe, expect, it } from 'vitest';
import { AudioTurns } from '@/lib/audio/turns';
import { pcm16 } from '@/lib/audio/pcm';

describe('Audio-Transkript ohne Zeitverfälschung', () => {
  it('ordnet verspäteten Text den lokalen Sprechereignissen zu', () => {
    const turns = new AudioTurns();
    turns.modelText('Wie arbeiten Sie?');
    turns.modelEnd(1000, 'warmup');
    turns.speechStart(3400, 'warmup');
    turns.speechEnd(34400);
    turns.userText('Ich arbeite im Team.');
    const result = turns.flush();
    expect(result[1]).toMatchObject({ text: 'Ich arbeite im Team.', startMs: 3400, endMs: 34400, questionEndMs: 1000 });
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
    expect(result[0]).toMatchObject({ text: 'Was denken Sie darüber?', status: 'interrupted' });
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
    expect([...new Uint8Array(pcm16(new Float32Array([-2, 0, 2])))]).toEqual([0, 128, 0, 0, 255, 127]);
  });
});
