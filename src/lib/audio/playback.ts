export class Speaker {
  private context?: AudioContext;
  private nextTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private completion?: ReturnType<typeof setTimeout>;
  async initialize() { this.context = new AudioContext({ sampleRate: 24000 }); await this.context.resume(); }
  get playing() { return this.sources.size > 0; }
  play(data: string) {
    if (!this.context) return;
    const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    const view = new DataView(bytes.buffer);
    const buffer = this.context.createBuffer(1, Math.floor(bytes.length / 2), 24000);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i++) channel[i] = view.getInt16(i * 2, true) / 32768;
    const source = this.context.createBufferSource(); source.buffer = buffer; source.connect(this.context.destination);
    this.nextTime = Math.max(this.context.currentTime, this.nextTime);
    source.start(this.nextTime); this.nextTime += buffer.duration; this.sources.add(source);
    source.onended = () => { this.sources.delete(source); source.disconnect(); };
  }
  afterPlayback(callback: () => void) {
    clearTimeout(this.completion);
    const wait = this.context ? Math.max(0, this.nextTime - this.context.currentTime) * 1000 : 0;
    this.completion = setTimeout(callback, wait + 30);
  }
  interrupt() { clearTimeout(this.completion); this.sources.forEach(s => { try { s.stop(); } catch { /* Already ended. */ } }); this.sources.clear(); this.nextTime = 0; }
  stop() { this.interrupt(); void this.context?.close(); }
}
