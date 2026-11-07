'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Assessment, Mode, SessionRecord, Turn } from '@/lib/types';
import { parseProfile } from '@/lib/profile';
import { deadlineAction, phaseAt } from '@/lib/exam';
import { hasEvidence, insufficientAssessment } from '@/lib/assessment';
import { exportMarkdown } from '@/lib/transcript';
import { LiveConversation, type LiveCredentials } from '@/lib/audio/live';

export type Step = 'setup' | 'connecting' | 'running' | 'finishing' | 'result';
export function useExam() {
  const [step, setStepState] = useState<Step>('setup');
  const stepRef = useRef<Step>('setup');
  const [record, setRecord] = useState<SessionRecord>();
  const recordRef = useRef<SessionRecord | undefined>(undefined);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const draftStart = useRef<number | undefined>(undefined);
  const draftRef = useRef('');
  const [muted, setMuted] = useState(false);
  const [activity, setActivity] = useState('listening');
  const [paused, setPaused] = useState(false);
  const origin = useRef<number | undefined>(undefined);
  const pauseStart = useRef<number | undefined>(undefined);
  const pausedTotal = useRef(0);
  const code = useRef('');
  const live = useRef<LiveConversation | undefined>(undefined);
  const speech = useRef(false);
  const controller = useRef<AbortController | undefined>(undefined);
  const run = useRef(0);
  const requestId = useRef<string | undefined>(undefined);
  const background = useRef(false);

  const setStep = (value: Step) => {
    stepRef.current = value;
    setStepState(value);
  };
  const update = useCallback(
    (change: (previous: SessionRecord) => SessionRecord) => {
      if (!recordRef.current) return;
      recordRef.current = change(recordRef.current);
      setRecord(recordRef.current);
    },
    [],
  );
  const now = useCallback(
    () =>
      origin.current === undefined
        ? 0
        : Math.max(
            0,
            (pauseStart.current ?? performance.now()) -
              origin.current -
              pausedTotal.current,
          ),
    [],
  );
  const event = useCallback(
    (type: string, detail?: string) =>
      update((r) => ({
        ...r,
        events: [...r.events, { type, detail, atMs: now() }],
      })),
    [now, update],
  );
  const setWorking = (value: boolean) => {
    busyRef.current = value;
    setBusy(value);
  };
  const api = useCallback(
    async <T>(path: string, data?: unknown, sessionId?: string): Promise<T> => {
      const abort = new AbortController();
      controller.current = abort;
      const timer = setTimeout(() => abort.abort(), 55000);
      try {
        const response = await fetch(`/api/${path}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-access-code': code.current,
            ...(sessionId ? { Authorization: `Bearer ${sessionId}` } : {}),
          },
          body: JSON.stringify(data ?? {}),
          signal: abort.signal,
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error ?? 'Die Anfrage ist fehlgeschlagen.');
        return result;
      } finally {
        clearTimeout(timer);
      }
    },
    [],
  );

  const question = async () => {
    const current = recordRef.current;
    if (!current || busyRef.current) return;
    const currentRun = run.current;
    setWorking(true);
    setError('');
    requestId.current ??= crypto.randomUUID();
    try {
      const result = await api<{ text: string; finished?: boolean }>(
        'chat',
        {
          turns: current.turns,
          elapsedMs: now(),
          requestId: requestId.current,
        },
        current.id,
      );
      if (
        currentRun !== run.current ||
        stepRef.current === 'result' ||
        stepRef.current === 'finishing'
      )
        return;
      if (origin.current === undefined) {
        origin.current = performance.now();
        update((r) => ({ ...r, startedAt: new Date().toISOString() }));
      }
      if (result.text) {
        const at = now();
        update((r) => ({
          ...r,
          turns: [
            ...r.turns,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              text: result.text,
              phase: phaseAt(at),
              endMs: at,
              status: 'final',
            },
          ],
        }));
      }
      requestId.current = undefined;
      setStep('running');
    } catch (failure) {
      if (
        currentRun === run.current &&
        stepRef.current !== 'result' &&
        stepRef.current !== 'finishing'
      ) {
        setError(
          failure instanceof Error && failure.name !== 'AbortError'
            ? failure.message
            : 'Die Anfrage wurde unterbrochen. Du kannst sie erneut versuchen.',
        );
        setStep('running');
      }
    } finally {
      if (currentRun === run.current && stepRef.current !== 'finishing')
        setWorking(false);
    }
  };

  const assess = async () => {
    const current = recordRef.current;
    if (!current || busyRef.current) return;
    if (!hasEvidence(current.turns)) {
      update((r) => ({ ...r, assessment: insufficientAssessment() }));
      return;
    }
    const currentRun = run.current;
    setWorking(true);
    setError('');
    try {
      const result = await api<{ assessment: Assessment }>(
        'assess',
        { turns: current.turns },
        current.id,
      );
      if (currentRun === run.current)
        update((r) => ({ ...r, assessment: result.assessment }));
    } catch (failure) {
      if (currentRun === run.current)
        setError(
          failure instanceof Error
            ? failure.message
            : 'Die Auswertung ist fehlgeschlagen.',
        );
    } finally {
      if (currentRun === run.current) setWorking(false);
    }
  };

  const finish = async () => {
    if (
      stepRef.current === 'result' ||
      stepRef.current === 'finishing' ||
      !recordRef.current
    )
      return;
    setStep('finishing');
    controller.current?.abort();
    const at = now();
    const finishingRun = run.current;
    const conversation = live.current;
    if (conversation) await conversation.finish();
    if (finishingRun !== run.current) return;
    ++run.current;
    live.current = undefined;
    setWorking(false);
    setStep('result');
    update((r) => ({
      ...r,
      elapsedMs: at,
      endedEarly: at < 600000,
      turns: r.turns.map((t) =>
        t.status === 'partial' ? { ...t, status: 'interrupted' } : t,
      ),
    }));
    setElapsed(at);
    event('Test beendet');
    setError('');
    setDraft('');
    draftRef.current = '';
    draftStart.current = undefined;
    await assess();
  };
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      if (stepRef.current !== 'running' || pauseStart.current !== undefined)
        return;
      const at = now();
      setElapsed(at);
      const answering =
        recordRef.current?.mode === 'voice'
          ? speech.current
          : draftStart.current !== undefined;
      if (deadlineAction(at, answering) === 'finish') void finishRef.current();
    }, 250);
    const visibility = () => {
      if (stepRef.current !== 'running') return;
      background.current = true;
      live.current?.markGap();
      event(
        document.hidden ? 'Seite im Hintergrund' : 'Zur Seite zurückgekehrt',
      );
    };
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (
        stepRef.current === 'running' ||
        stepRef.current === 'connecting' ||
        stepRef.current === 'finishing'
      ) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [now, event]);
  useEffect(
    () => () => {
      ++run.current;
      controller.current?.abort();
      live.current?.stop();
    },
    [],
  );

  const begin = async (mode: Mode, markdown: string, accessCode: string) => {
    if (stepRef.current !== 'setup') return;
    setStep('connecting');
    setError('');
    code.current = accessCode;
    ++run.current;
    const currentRun = run.current;
    let ownedConversation: LiveConversation | undefined;
    origin.current = undefined;
    pauseStart.current = undefined;
    pausedTotal.current = 0;
    background.current = false;
    setElapsed(0);
    setPaused(false);
    setMuted(false);
    try {
      const profile = parseProfile(markdown);
      const { id } = await api<{ id: string }>('session', {
        mode,
        markdown,
        consent: true,
      });
      if (currentRun !== run.current) return;
      const initial: SessionRecord = {
        id,
        mode,
        startedAt: new Date().toISOString(),
        profile,
        profileMarkdown: markdown,
        turns: [],
        events: [],
        elapsedMs: 0,
        endedEarly: false,
      };
      recordRef.current = initial;
      setRecord(initial);
      if (mode === 'text') {
        await question();
        return;
      }
      const credentials = await api<LiveCredentials>('live', {}, id);
      if (currentRun !== run.current) return;
      const isCurrent = () =>
        currentRun === run.current && recordRef.current?.id === id;
      const conversation = new LiveConversation(credentials, {
        now,
        onReady: () => {
          if (!isCurrent()) return;
          origin.current = performance.now();
          setStep('running');
          event('Audioverbindung hergestellt');
        },
        onTurns: (turns) => {
          if (isCurrent()) update((r) => ({ ...r, turns }));
        },
        onActivity: (value) => {
          if (isCurrent()) setActivity(value);
        },
        onSpeech: (value) => {
          if (!isCurrent()) return;
          speech.current = value;
        },
        onGap: (value) => {
          if (!isCurrent()) return;
          if (value && pauseStart.current === undefined) {
            pauseStart.current = performance.now();
            event('Verbindung unterbrochen');
          }
          if (!value && pauseStart.current !== undefined) {
            pausedTotal.current += performance.now() - pauseStart.current;
            pauseStart.current = undefined;
            event('Verbindung wiederhergestellt');
          }
          setPaused(value);
        },
        onError: (value) => {
          if (isCurrent()) setError(value);
        },
      });
      ownedConversation = conversation;
      live.current = conversation;
      await conversation.start();
    } catch (failure) {
      ownedConversation?.stop();
      if (live.current === ownedConversation) live.current = undefined;
      if (currentRun === run.current) {
        setError(
          failure instanceof Error
            ? failure.message
            : 'Der Test konnte nicht gestartet werden.',
        );
        setStep('setup');
      }
    }
  };
  const changeDraft = (value: string) => {
    setDraft(value);
    draftRef.current = value;
    if (value.trim() && draftStart.current === undefined)
      draftStart.current = now();
  };
  const send = async () => {
    const current = recordRef.current;
    if (
      !current ||
      !draftRef.current.trim() ||
      busyRef.current ||
      stepRef.current !== 'running' ||
      current.turns.at(-1)?.role !== 'assistant'
    )
      return;
    const prompt = [...current.turns]
      .reverse()
      .find((t) => t.role === 'assistant');
    const at = now();
    const turn: Turn = {
      id: crypto.randomUUID(),
      role: 'user',
      text: draftRef.current.trim(),
      status: 'final',
      phase: prompt?.phase ?? phaseAt(at),
      questionId: prompt?.id,
      questionEndMs: prompt?.endMs,
      startMs: draftStart.current,
      endMs: at,
      unreliable: background.current || !prompt,
    };
    update((r) => ({ ...r, turns: [...r.turns, turn] }));
    setDraft('');
    draftRef.current = '';
    draftStart.current = undefined;
    background.current = false;
    requestId.current = undefined;
    if (at >= 600000) await finish();
    else await question();
  };
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    live.current?.setMuted(next);
    event(next ? 'Mikrofon stumm' : 'Mikrofon aktiv');
  };
  const resume = async () => {
    setError('');
    try {
      await live.current?.resume();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Wiederaufnahme fehlgeschlagen.',
      );
    }
  };
  const download = (format: 'md' | 'json') => {
    const current = recordRef.current;
    if (!current) return;
    const snapshot = {
      ...current,
      elapsedMs: stepRef.current === 'result' ? current.elapsedMs : now(),
    };
    const url = URL.createObjectURL(
      new Blob(
        [
          format === 'md'
            ? exportMarkdown(snapshot)
            : JSON.stringify(snapshot, null, 2),
        ],
        {
          type:
            format === 'md'
              ? 'text/markdown;charset=utf-8'
              : 'application/json;charset=utf-8',
        },
      ),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `deutschtest-${current.id}.${format}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const reset = () => {
    ++run.current;
    controller.current?.abort();
    live.current?.stop();
    live.current = undefined;
    const id = recordRef.current?.id;
    if (id)
      void fetch('/api/session', {
        method: 'DELETE',
        headers: {
          'x-access-code': code.current,
          Authorization: `Bearer ${id}`,
        },
      }).catch(() => {});
    recordRef.current = undefined;
    setRecord(undefined);
    setStep('setup');
    setWorking(false);
    setError('');
    setDraft('');
    draftRef.current = '';
    draftStart.current = undefined;
    code.current = '';
    requestId.current = undefined;
  };
  return {
    step,
    record,
    elapsed,
    busy,
    error,
    draft,
    muted,
    activity,
    paused,
    begin,
    send,
    changeDraft,
    finish,
    assess,
    question,
    toggleMute,
    resume,
    download,
    reset,
  };
}
export type ExamController = ReturnType<typeof useExam>;
