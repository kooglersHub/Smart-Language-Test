import type { Phase, Turn } from '../types';
export class AudioTurns {
  private turns: Turn[] = [];
  private model?: Turn;
  private user?: Turn;
  private inputTarget?: Turn;
  private question?: Turn;
  private delivered = new Set<string>();
  private counter = 0;
  private interrupted = false;
  private phase: Phase = 'warmup';
  private create(role: Turn['role'], phase: Phase): Turn {
    const turn: Turn = {
      id: `voice-${++this.counter}`,
      role,
      text: '',
      phase,
      status: 'partial',
    };
    this.turns.push(turn);
    return turn;
  }
  modelStart(phase: Phase) {
    this.phase = phase;
    if (!this.model || this.model.status !== 'partial') {
      if (this.user) {
        if (this.user !== this.inputTarget) this.user.status = 'final';
        this.user = undefined;
      }
      this.model = this.create('assistant', this.phase);
      this.question = this.model;
    }
  }
  modelText(text: string) {
    if (!this.model || (this.model.status !== 'partial' && this.user))
      this.modelStart(this.phase);
    this.model!.text += text;
  }
  modelEnd(at: number, phase: Phase) {
    this.phase = phase;
    if (this.model) {
      this.model.endMs = at;
      this.model.phase = phase;
      this.model.status = 'final';
      this.question = this.model;
    }
    this.interrupted = false;
  }
  interrupt(at: number, phase: Phase) {
    if (this.user) this.user.unreliable = true;
    if (this.model) {
      this.model.status = 'interrupted';
      this.model.endMs = at;
      this.model.phase = phase;
      this.question = this.model;
      this.model = undefined;
    } else if (this.question) this.question.status = 'interrupted';
    this.interrupted = true;
  }
  speechStart(at: number, phase: Phase) {
    this.phase = phase;
    if (!this.user) {
      this.user = this.create('user', phase);
      if (this.inputTarget) this.inputTarget.unreliable = true;
      this.inputTarget ??= this.user;
    }
    this.user.startMs ??= at;
    this.user.questionId = this.question?.id;
    this.user.questionEndMs = this.question?.endMs;
    this.user.unreliable =
      this.user.unreliable ||
      this.interrupted ||
      !this.question ||
      (this.question.endMs ?? Infinity) > at;
  }
  speechEnd(at: number) {
    if (this.user) {
      this.user.endMs = at;
      this.user.status = this.inputTarget === this.user ? 'partial' : 'final';
    }
  }
  userText(text: string, finished = true) {
    if (!this.inputTarget && !this.user) {
      this.user = this.create('user', this.phase);
      this.user.unreliable = true;
    }
    const target = this.inputTarget ?? this.user!;
    target.text += text;
    if (finished) {
      target.status = target.endMs !== undefined ? 'final' : 'partial';
      if (this.inputTarget === target) this.inputTarget = undefined;
    }
  }
  hasPendingInput() {
    return Boolean(this.inputTarget);
  }
  finalizePending() {
    for (const turn of this.turns) {
      if (turn.role === 'user' && turn.status === 'partial') {
        turn.status = 'interrupted';
        turn.unreliable = true;
        if (!turn.text.trim())
          turn.text = '[Keine abschließende Transkription verfügbar]';
      }
    }
    this.inputTarget = undefined;
  }
  markGap() {
    if (this.user) this.user.unreliable = true;
    this.question = undefined;
  }
  snapshot() {
    return this.turns.filter((t) => t.text.trim()).map((t) => ({ ...t }));
  }
  flush() {
    const result = this.snapshot().filter((t) => !this.delivered.has(t.id));
    result.forEach((t) => this.delivered.add(t.id));
    return result;
  }
}
