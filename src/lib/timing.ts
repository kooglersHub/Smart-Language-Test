import type { Turn } from './types';
export function measureTiming(turn: Turn) {
  const { questionEndMs: question, startMs: start, endMs: end } = turn;
  const duration =
    start !== undefined && end !== undefined && end >= start
      ? end - start
      : null;
  const comparable =
    !turn.unreliable &&
    turn.status === 'final' &&
    question !== undefined &&
    start !== undefined &&
    end !== undefined &&
    start >= question &&
    end >= start;
  return {
    reactionMs: comparable ? start! - question! : null,
    durationMs: duration,
    totalMs: comparable ? end! - question! : null,
    comparable,
  };
}
export function seconds(ms: number | null | undefined) {
  return ms == null
    ? 'nicht messbar'
    : `${(ms / 1000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`;
}
export function clock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)
    .toString()
    .padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
}
