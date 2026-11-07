export class Microphone {
  private stream?: MediaStream;
  private context?: AudioContext;
  private worklet?: AudioWorkletNode;
  private source?: MediaStreamAudioSourceNode;
  private muted = false;
  private stopped = false;
  async start(onSamples: (samples: Float32Array, rate: number) => void) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    if (this.stopped) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    this.stream = stream;
    const context = new AudioContext({ sampleRate: 16000 });
    this.context = context;
    await context.resume();
    if (this.stopped) return;
    await context.audioWorklet.addModule('/pcm-worklet.js');
    if (this.stopped) return;
    this.worklet = new AudioWorkletNode(context, 'pcm-capture');
    this.worklet.port.onmessage = (event: MessageEvent<Float32Array>) => {
      if (!this.muted && !this.stopped)
        onSamples(event.data, context.sampleRate);
    };
    this.source = context.createMediaStreamSource(stream);
    this.source.connect(this.worklet);
    // The processor writes silence to its output, avoiding microphone feedback.
    this.worklet.connect(context.destination);
  }
  setMuted(muted: boolean) {
    this.muted = muted;
    this.stream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }
  stop() {
    this.stopped = true;
    if (this.worklet) this.worklet.port.onmessage = null;
    this.worklet?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    const context = this.context;
    this.context = undefined;
    if (context && context.state !== 'closed')
      void context
        .close()
        .catch(() => console.error('microphone_context_close_failed'));
  }
}
