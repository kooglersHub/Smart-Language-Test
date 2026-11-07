import type { Phase, Turn } from '../types';
export class AudioTurns {
  private turns: Turn[] = [];
  private model?: Turn;
  private user?: Turn;
  private question?: Turn;
  private delivered = new Set<string>();
  private counter = 0;
  private interrupted = false;
  private phase: Phase = 'warmup';
  private create(role: Turn['role'], phase: Phase): Turn {
    const turn: Turn = { id: `voice-${++this.counter}`, role, text: '', phase, status: 'partial' };
    this.turns.push(turn); return turn;
  }
  modelText(text: string) {
    if (!this.model) {
      if (this.user) { this.user.status = 'final'; this.user = undefined; }
      this.model = this.create('assistant', this.phase);
    }
    this.model.text += text;
  }
  modelEnd(at: number, phase: Phase) {
    this.phase = phase;
    if (this.model) { this.model.endMs = at; this.model.phase = phase; this.model.status = 'final'; this.question = this.model; this.model = undefined; }
    this.interrupted = false;
  }
  interrupt(at: number, phase: Phase) {
    if (this.model) { this.model.status = 'interrupted'; this.model.endMs = at; this.model.phase = phase; this.question = this.model; this.model = undefined; }
    else if (this.question) this.question.status = 'interrupted';
    this.interrupted = true;
  }
  speechStart(at: number, phase: Phase) {
    this.phase = phase;
    if (!this.user) this.user = this.create('user', phase);
    this.user.startMs ??= at;
    this.user.questionId = this.question?.id;
    this.user.questionEndMs = this.question?.endMs;
    this.user.unreliable = this.user.unreliable || this.interrupted || !this.question || (this.question.endMs ?? Infinity) > at;
  }
  speechEnd(at: number) { if (this.user) { this.user.endMs = at; this.user.status = 'final'; } }
  userText(text: string) {
    if (!this.user) { this.user = this.create('user', this.phase); this.user.unreliable = true; }
    this.user.text += text;
  }
  markGap() { if (this.user) this.user.unreliable = true; this.question = undefined; }
  snapshot() { return this.turns.filter(t => t.text.trim()).map(t => ({ ...t })); }
  flush() {
    const result = this.snapshot().filter(t => !this.delivered.has(t.id));
    result.forEach(t => this.delivered.add(t.id));
    return result;
  }
}
