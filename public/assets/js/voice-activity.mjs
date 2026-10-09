// Local microphone feedback only: amplitude is not a transcript or proof of storage.
export class VoiceActivity {
  constructor() { this.reset(); }
  reset() { this.level = 0; this.hotFrames = 0; this.lastVoice = null; this.receiving = false; this.pending = false; this.generating = false; this.playing = false; }
  microphone(samples, now) {
    let energy = 0;
    for (const sample of samples) energy += sample * sample;
    const rms = Math.sqrt(energy / Math.max(samples.length, 1));
    this.level = Math.min(1, rms * 10);
    this.hotFrames = rms > .018 ? this.hotFrames + 1 : 0;
    if (this.hotFrames >= 3) { this.receiving = true; this.lastVoice = now; this.pending = false; }
    if (this.receiving && this.lastVoice !== null && now - this.lastVoice > 700) {
      this.receiving = false; this.lastVoice = null;
      if (!this.playing) this.pending = true;
    }
    return this.state;
  }
  waiting() { this.pending = true; }
  audioStarted() { this.generating = true; this.pending = false; this.receiving = false; this.lastVoice = null; this.hotFrames = 0; this.playing = true; }
  playbackEnded() { this.playing = false; }
  turnComplete() { this.generating = false; this.pending = false; }
  interrupted() { this.playing = false; this.generating = false; this.pending = false; }
  get state() { return this.receiving ? 'receiving' : this.playing ? 'speaking' : this.pending || this.generating ? 'thinking' : 'listening'; }
}
