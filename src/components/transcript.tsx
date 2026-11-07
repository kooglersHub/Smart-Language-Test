import { useEffect, useRef } from 'react';
import { AudioLines, UserRound } from 'lucide-react';
import type { Mode, Turn } from '@/lib/types';
import { measureTiming, seconds } from '@/lib/timing';
export function Transcript({
  turns,
  mode,
  autoScroll = false,
}: {
  turns: Turn[];
  mode: Mode;
  autoScroll?: boolean;
}) {
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (autoScroll)
      bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [turns, autoScroll]);
  return (
    <div
      className="transcript"
      role="log"
      aria-label="Gesprächstranskript"
      aria-live={mode === 'text' ? 'polite' : 'off'}
    >
      {!turns.length && (
        <p className="empty-transcript">
          Hier entsteht dein Transkript, sobald das Gespräch beginnt.
        </p>
      )}
      {turns.map((turn) => {
        const timing = measureTiming(turn);
        return (
          <article
            className={`turn ${turn.role}`}
            key={turn.id}
            id={`turn-${turn.id}`}
          >
            <div className="turn-avatar" aria-hidden="true">
              {turn.role === 'assistant' ? (
                <AudioLines size={17} />
              ) : (
                <UserRound size={17} />
              )}
            </div>
            <div className="turn-body">
              <p className="turn-label">
                {turn.role === 'assistant' ? 'Sprachraum' : 'Du'}
                {turn.status !== 'final' && (
                  <span>
                    {' '}
                    ·{' '}
                    {turn.status === 'partial'
                      ? 'wird transkribiert'
                      : 'unterbrochen'}
                  </span>
                )}
              </p>
              <p className="turn-text">{turn.text}</p>
              {turn.role === 'user' && (
                <p className="turn-timing">
                  Reaktion {seconds(timing.reactionMs)} ·{' '}
                  {mode === 'text' ? 'Bearbeitung' : 'Sprechdauer ≈'}{' '}
                  {seconds(timing.durationMs)} · Gesamt{' '}
                  {seconds(timing.totalMs)}
                  {!timing.comparable && <span> · nicht vergleichbar</span>}
                </p>
              )}
            </div>
          </article>
        );
      })}
      <div ref={bottom} />
    </div>
  );
}
