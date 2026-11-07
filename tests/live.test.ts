import { afterEach, expect, it, vi } from 'vitest';
import type { LiveServerMessage } from '@google/genai';
import type { Turn } from '@/lib/types';
import { LiveConversation } from '@/lib/audio/live';
const wire = vi.hoisted(() => ({
  message: undefined as ((message: LiveServerMessage) => void) | undefined,
  samples: undefined as
    ((samples: Float32Array, rate: number) => void) | undefined,
}));
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    live = {
      connect: async (params: {
        callbacks: { onmessage: (message: LiveServerMessage) => void };
      }) => {
        wire.message = params.callbacks.onmessage;
        return { sendClientContent() {}, sendRealtimeInput() {}, close() {} };
      },
    };
  },
}));
vi.mock('@/lib/audio/capture', () => ({
  Microphone: class {
    async start(callback: typeof wire.samples) {
      wire.samples = callback;
    }
    stop() {}
    setMuted() {}
  },
}));
vi.mock('@/lib/audio/playback', () => ({
  Speaker: class {
    playing = false;
    async initialize() {}
    play() {}
    interrupt() {}
    stop() {}
    afterPlayback(callback: () => void) {
      callback();
    }
  },
}));
afterEach(() => vi.useRealTimers());
it('wartet beim Abschluss begrenzt auf das letzte Teilnehmertranskript', async () => {
  vi.useFakeTimers();
  let now = 1000;
  let transcript: Turn[] = [];
  const conversation = new LiveConversation(
    {
      token: 'test',
      model: 'test',
      config: {},
      profile: {
        version: 1,
        title: 'Test',
        targetLevel: 'B2',
        durationMinutes: 10,
        context: '',
        topics: ['Alltag'],
        tasks: [],
        transfer: '',
      },
    },
    {
      now: () => now,
      onReady() {},
      onTurns: (turns) => {
        transcript = turns;
      },
      onActivity() {},
      onSpeech() {},
      onGap() {},
      onError() {},
    },
  );
  await conversation.start();
  wire.message!({
    text: undefined,
    data: undefined,
    serverContent: {
      outputTranscription: { text: 'Was denkst du?' },
      turnComplete: true,
    },
  });
  now = 2000;
  wire.samples!(new Float32Array([0.1, 0.1]), 16000);
  now = 3000;
  wire.samples!(new Float32Array([0, 0]), 16000);
  wire.message!({
    text: undefined,
    data: undefined,
    serverContent: {
      inputTranscription: { text: 'Ich finde ', finished: false },
    },
  });
  let finished = false;
  const closing = conversation.finish().then(() => {
    finished = true;
  });
  await vi.advanceTimersByTimeAsync(500);
  expect(finished).toBe(false);
  wire.message!({
    text: undefined,
    data: undefined,
    serverContent: {
      inputTranscription: { text: 'das sehr sinnvoll.', finished: true },
    },
  });
  await closing;
  expect(transcript.filter((t) => t.role === 'user')).toEqual([
    expect.objectContaining({
      text: 'Ich finde das sehr sinnvoll.',
      startMs: 2000,
      endMs: 2000,
      status: 'final',
    }),
  ]);
});
