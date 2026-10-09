// Runs on the audio thread; preserves the actual browser sample rate in each chunk.
class VoiceCapture extends AudioWorkletProcessor {
  constructor() { super(); this.buffer = new Float32Array(2048); this.offset = 0; }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;
    for (const sample of input) {
      this.buffer[this.offset++] = sample;
      if (this.offset === this.buffer.length) {
        this.port.postMessage({ samples: this.buffer, rate: sampleRate });
        this.offset = 0;
      }
    }
    return true;
  }
}
registerProcessor('genia-voice-capture', VoiceCapture);
