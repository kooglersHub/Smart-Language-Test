import { GoogleGenAI, type Session, type LiveConnectConfig, type LiveServerMessage } from '@google/genai';
import type { ExamProfile, Turn } from '../types';
import { phaseAt } from '../exam';
import { Microphone } from './capture';
import { Speaker } from './playback';
import { AudioTurns } from './turns';
import { base64, pcm16 } from './pcm';

export interface LiveCredentials { token: string; model: string; config: LiveConnectConfig; profile: ExamProfile }
interface Callbacks {
  now: () => number;
  onReady: () => void;
  onTurns: (turns: Turn[]) => void;
  onActivity: (activity: 'listening' | 'speaking' | 'thinking') => void;
  onSpeech: (speaking: boolean) => void;
  onGap: (paused: boolean) => void;
  onError: (message: string) => void;
}
export class LiveConversation {
  private microphone = new Microphone();
  private speaker = new Speaker();
  private turns = new AudioTurns();
  private session?: Session;
  private stopped = false;
  private muted = false;
  private speech = false;
  private lastSpeechMs = 0;
  private handle?: string;
  private reconnectStarted?: number;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private generation = 0;
  private transferSent = false;
  constructor(private credentials: LiveCredentials, private callbacks: Callbacks) {}
  async start() {
    try {
      await this.speaker.initialize();
      await this.microphone.start((samples, rate) => this.input(samples, rate));
      if (this.stopped) { this.stop(); return; }
      await this.connect(false);
    } catch (error) { this.stop(); throw error; }
  }
  private async connect(resume: boolean) {
    const generation = ++this.generation;
    const ai = new GoogleGenAI({ apiKey: this.credentials.token, httpOptions: { apiVersion: 'v1beta' } });
    const connection = await ai.live.connect({ model: this.credentials.model,
      config: { ...this.credentials.config, sessionResumption: resume && this.handle ? { handle: this.handle } : {} },
      callbacks: {
        onmessage: message => { if (!this.stopped && generation === this.generation) this.message(message); },
        onerror: () => { if (!this.stopped && generation === this.generation) this.disconnected(); },
        onclose: () => { if (!this.stopped && generation === this.generation) this.disconnected(); },
      },
    });
    if (this.stopped || generation !== this.generation) { connection.close(); return; }
    this.session = connection;
    if (resume) { this.reconnectStarted = undefined; this.callbacks.onGap(false); }
    else this.callbacks.onReady();
    this.callbacks.onActivity('listening');
    if (!resume) connection.sendClientContent({ turns: [{ role: 'user', parts: [{ text: JSON.stringify({ profile: this.credentials.profile, task: 'Beginne die Deutschprüfung. Begrüße kurz und stelle eine einfache Einstiegsfrage.' }) }] }], turnComplete: true });
  }
  private publish() { this.callbacks.onTurns(this.turns.snapshot()); }
  private input(samples: Float32Array, rate: number) {
    if (!this.session || this.stopped || this.muted) return;
    const at = this.callbacks.now();
    let energy = 0;
    for (const sample of samples) energy += sample * sample;
    const active = Math.sqrt(energy / samples.length) > 0.018;
    if (active) {
      this.lastSpeechMs = at;
      if (!this.speech) { this.speech = true; this.turns.speechStart(at, phaseAt(at)); this.callbacks.onSpeech(true); }
    } else if (this.speech && at - this.lastSpeechMs > 650) {
      this.speech = false; this.turns.speechEnd(this.lastSpeechMs); this.callbacks.onSpeech(false); this.publish();
    }
    try { this.session.sendRealtimeInput({ audio: { data: base64(pcm16(samples)), mimeType: `audio/pcm;rate=${rate}` } }); }
    catch { this.disconnected(); }
    if (at >= 480000 && !this.transferSent && !this.speech && !this.speaker.playing) {
      this.transferSent = true;
      this.session?.sendRealtimeInput({ text: 'Die Transferphase ist erreicht. Stelle als nächste Frage eine passende Transferaufgabe aus dem Gesprächsprofil.' });
    }
  }
  private message(message: LiveServerMessage) {
    if (message.sessionResumptionUpdate?.resumable && message.sessionResumptionUpdate.newHandle) this.handle = message.sessionResumptionUpdate.newHandle;
    const content = message.serverContent;
    if (content?.interrupted) { this.speaker.interrupt(); this.turns.interrupt(this.callbacks.now(), phaseAt(this.callbacks.now())); this.callbacks.onActivity('listening'); }
    if (content?.inputTranscription?.text) this.turns.userText(content.inputTranscription.text);
    if (content?.outputTranscription?.text) this.turns.modelText(content.outputTranscription.text);
    for (const part of content?.modelTurn?.parts ?? []) {
      if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/pcm')) { this.speaker.play(part.inlineData.data); this.callbacks.onActivity('speaking'); }
    }
    if (content?.turnComplete) this.speaker.afterPlayback(() => {
      if (this.stopped) return;
      this.turns.modelEnd(this.callbacks.now(), phaseAt(this.callbacks.now())); this.publish(); this.callbacks.onActivity('listening');
    });
    this.publish();
    if (message.goAway) { const old = this.session; this.session = undefined; old?.close(); this.disconnected(); }
  }
  private disconnected() {
    if (this.stopped || this.reconnectTimer) return;
    if (!this.reconnectStarted) {
      this.reconnectStarted = Date.now(); this.session = undefined; this.speaker.interrupt(); this.turns.markGap(); this.callbacks.onGap(true);
      if (this.speech) { this.speech = false; this.callbacks.onSpeech(false); }
    }
    if (!this.handle || Date.now() - this.reconnectStarted >= 30000) {
      this.callbacks.onError('Die Verbindung wurde unterbrochen. Du kannst die Verbindung erneut versuchen oder den Test mit dem bisherigen Transkript beenden.'); return;
    }
    this.reconnectTimer = setTimeout(() => { this.reconnectTimer = undefined; void this.connect(true).catch(() => this.disconnected()); }, 1500);
  }
  async resume() {
    if (!this.handle) throw new Error('Für diese Verbindung ist keine Wiederaufnahme verfügbar. Bitte beende den Test und starte anschließend neu.');
    clearTimeout(this.reconnectTimer); this.reconnectTimer = undefined; this.reconnectStarted = Date.now(); await this.connect(true);
  }
  setMuted(value: boolean) {
    this.muted = value; this.microphone.setMuted(value);
    if (value && this.speech) { this.speech = false; this.turns.speechEnd(this.callbacks.now()); this.callbacks.onSpeech(false); this.publish(); }
    if (value) this.session?.sendRealtimeInput({ audioStreamEnd: true });
  }
  markGap() { this.turns.markGap(); }
  stop() {
    this.stopped = true; ++this.generation; clearTimeout(this.reconnectTimer);
    if (this.speech) this.turns.speechEnd(this.lastSpeechMs);
    this.session?.close(); this.session = undefined; this.microphone.stop(); this.speaker.stop(); this.publish();
  }
}
