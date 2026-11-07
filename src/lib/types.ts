export type Mode = 'voice' | 'text';
export type Phase = 'warmup' | 'argument' | 'challenge' | 'transfer';
export interface ExamProfile {
  version: 1;
  title: string;
  targetLevel: 'B2';
  durationMinutes: 10;
  context: string;
  topics: string[];
  tasks: string[];
  transfer: string;
}
export interface Turn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  phase: Phase;
  status: 'partial' | 'final' | 'interrupted';
  questionId?: string;
  questionEndMs?: number;
  startMs?: number;
  endMs?: number;
  unreliable?: boolean;
}
export interface SessionEvent {
  type: string;
  atMs: number;
  detail?: string;
}
export interface Assessment {
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'nicht beurteilbar';
  b2: 'wahrscheinlich' | 'noch nicht' | 'unklar';
  summary: string;
  strengths: string[];
  improvements: string[];
  criteria: { name: string; observation: string }[];
  evidence: { turnId: string; quote: string; explanation: string }[];
}
export interface SessionRecord {
  id: string;
  mode: Mode;
  startedAt: string;
  profile: ExamProfile;
  profileMarkdown: string;
  turns: Turn[];
  events: SessionEvent[];
  elapsedMs: number;
  endedEarly: boolean;
  assessment?: Assessment;
}
