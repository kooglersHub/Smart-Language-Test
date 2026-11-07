import type { Phase } from './types';
export const phaseLabels: Record<Phase, string> = { warmup: 'Ankommen', argument: 'Meinung begründen', challenge: 'Perspektive wechseln', transfer: 'Ideen übertragen' };
export function phaseAt(ms: number): Phase {
  if (ms < 120000) return 'warmup';
  if (ms < 300000) return 'argument';
  if (ms < 480000) return 'challenge';
  return 'transfer';
}
export function deadlineAction(ms: number, answering: boolean) {
  if (ms < 600000) return 'continue';
  if (ms < 660000 && answering) return 'grace';
  return 'finish';
}
