/* Audio is transferred transiently to the live connection, never recorded. */
class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.samples = [];
  }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;
    this.samples.push(...input);
    if (this.samples.length >= 2048) {
      const data = new Float32Array(this.samples);
      this.port.postMessage(data, [data.buffer]);
      this.samples = [];
    }
    return true;
  }
}
registerProcessor('pcm-capture', PcmCapture);
