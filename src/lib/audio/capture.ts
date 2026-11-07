export class Microphone {
  private stream?: MediaStream;
  private context?: AudioContext;
  private worklet?: AudioWorkletNode;
  private source?: MediaStreamAudioSourceNode;
  private muted = false;
  async start(onSamples: (samples: Float32Array, rate: number) => void) {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    this.context = new AudioContext({ sampleRate: 16000 });
    await this.context.resume();
    await this.context.audioWorklet.addModule('/pcm-worklet.js');
    this.worklet = new AudioWorkletNode(this.context, 'pcm-capture');
    this.worklet.port.onmessage = (event: MessageEvent<Float32Array>) => { if (!this.muted) onSamples(event.data, this.context!.sampleRate); };
    this.source = this.context.createMediaStreamSource(this.stream);
    this.source.connect(this.worklet);
    // The processor writes silence to its output, avoiding microphone feedback.
    this.worklet.connect(this.context.destination);
  }
  setMuted(muted: boolean) { this.muted = muted; this.stream?.getAudioTracks().forEach(track => { track.enabled = !muted; }); }
  stop() { this.worklet?.disconnect(); this.source?.disconnect(); this.stream?.getTracks().forEach(t => t.stop()); void this.context?.close(); }
}
