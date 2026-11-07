export function pcm16(samples: Float32Array): ArrayBuffer {
  const output = new ArrayBuffer(samples.length * 2);
  const view = new DataView(output);
  samples.forEach((sample, i) => { const clipped = Math.max(-1, Math.min(1, sample)); view.setInt16(i * 2, clipped < 0 ? clipped * 32768 : clipped * 32767, true); });
  return output;
}
export function base64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}
