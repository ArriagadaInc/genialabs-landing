import test from 'node:test';
import assert from 'node:assert/strict';
import { VoiceActivity } from '../public/assets/js/voice-activity.mjs';
const silence = new Float32Array(1024);
const voice = new Float32Array(1024).fill(.1);
test('microphone activity, silence, generation and audible playback have distinct states', () => {
  const activity = new VoiceActivity();
  assert.equal(activity.microphone(silence,0),'listening');
  activity.microphone(voice,10); activity.microphone(voice,30);
  assert.equal(activity.microphone(voice,50),'receiving');
  assert.ok(activity.level > 0);
  assert.equal(activity.microphone(silence,600),'receiving');
  assert.equal(activity.microphone(silence,800),'thinking');
  activity.audioStarted(); assert.equal(activity.state,'speaking');
  activity.turnComplete(); assert.equal(activity.state,'speaking');
  activity.playbackEnded(); assert.equal(activity.state,'listening');
});
test('brief noise does not trigger thinking; audio gaps and cleanup keep honest feedback', () => {
  const activity = new VoiceActivity();
  activity.microphone(voice,0); activity.microphone(silence,50);
  assert.equal(activity.microphone(silence,900),'listening');
  activity.waiting(); assert.equal(activity.state,'thinking');
  activity.audioStarted(); activity.playbackEnded(); assert.equal(activity.state,'thinking');
  activity.interrupted(); assert.equal(activity.state,'listening');
  activity.reset(); assert.equal(activity.level,0); assert.equal(activity.state,'listening');
});
