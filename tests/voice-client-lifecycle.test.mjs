import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import { VoiceActivity } from '../public/assets/js/voice-activity.mjs';
import { ConversationLog } from '../public/assets/js/voice-log.mjs';

const source = fs.readFileSync('public/assets/js/voice.js', 'utf8').replace(/^import .*;\r?\n/gm, '');
const flush = async () => { for (let index = 0; index < 12; index++) await Promise.resolve(); };
function client() {
  const elements = new Map(); const timers = new Map(); const sockets = []; let nextTimer = 0; let stopped = 0;
  const element = id => {
    if (!elements.has(id)) elements.set(id, { dataset: {}, style: {}, textContent: '', hidden: false, listeners: {},
      addEventListener(name, fn) { this.listeners[name] = fn; }, setAttribute() {}, querySelectorAll() { return []; },
      showModal() { this.open = true; }, close() { this.open = false; this.listeners.close?.(); }, focus() {} });
    return elements.get(id);
  };
  let resolveMic;
  const microphone = new Promise(resolve => { resolveMic = resolve; });
  const track = { stop() { stopped++; }, addEventListener() {} };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  class Audio {
    destination = {}; currentTime = 0;
    async resume() {} async close() {}
    audioWorklet = { async addModule() {} };
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
    createGain() { return { gain: {}, connect() {}, disconnect() {} }; }
  }
  class Socket {
    static OPEN = 1;
    constructor(url) { this.url = url; this.readyState = 1; sockets.push(this); }
    send() {} close() { this.closed = true; }
  }
  const window = { isSecureContext: true, AudioContext: Audio, AudioWorkletNode: true, addEventListener() {} };
  vm.runInNewContext(source, { window, document: { getElementById: element, addEventListener() {} }, navigator: { mediaDevices: { getUserMedia: () => microphone } },
    fetch: async (_url, options) => Response.json(options?.method === 'POST' ? { token: 'auth_tokens/test', model: 'models/test', log: { token: 'test' } } : { enabled: true, storageAvailable: true }),
    AbortController, AbortSignal, WebSocket: Socket, VoiceActivity, ConversationLog, Set, console,
    setTimeout(fn, ms) { const id = ++nextTimer; timers.set(id, { fn, ms }); return id; }, clearTimeout(id) { timers.delete(id); }, setInterval() { return 1; }, clearInterval() {},
    AudioWorkletNode: class { port = {}; connect() {} disconnect() {} },
  });
  return { element, timers, sockets, stream, resolveMic, get stopped() { return stopped; },
    async open() { element('voiceLaunch').listeners.click(); await flush(); },
    start() { return element('voiceStart').listeners.click(); },
    fire(ms) { const timer = [...timers.values()].find(value => value.ms === ms); assert.ok(timer); timer.fn(); },
  };
}

test('microphone wait times out, restores controls and stops a late permission stream', async () => {
  const page = client(); await page.open();
  const starting = page.start(); await flush();
  page.fire(30000);
  assert.equal(page.element('voiceStart').hidden, false);
  assert.equal(page.element('voiceStop').hidden, true);
  page.resolveMic(page.stream); await starting;
  assert.equal(page.stopped, 1);
  assert.equal(page.sockets.length, 0);
});

test('two visitors connect independently; stalled handshake resets and can be retried', async () => {
  const a = client(); const b = client();
  await Promise.all([a.open(), b.open()]);
  a.resolveMic(a.stream); b.resolveMic(b.stream);
  await Promise.all([a.start(), b.start()]);
  assert.equal(a.sockets.length, 1); assert.equal(b.sockets.length, 1);
  assert.notEqual(a.sockets[0], b.sockets[0]);
  assert.equal([...a.timers.values()].some(timer => timer.ms === 30000), false);
  a.fire(15000);
  assert.equal(a.sockets[0].closed, true);
  assert.equal(a.stopped, 1);
  assert.equal(a.element('voiceStart').hidden, false);
  assert.equal(b.sockets[0].closed, undefined);
  assert.equal(b.element('voiceStart').hidden, true);
  await a.start(); assert.equal(a.sockets.length, 2);
  a.element('voiceStop').listeners.click(); b.element('voiceStop').listeners.click();
  assert.equal(a.sockets[1].closed, true); assert.equal(b.sockets[0].closed, true);
});
