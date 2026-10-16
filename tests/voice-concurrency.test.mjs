import test from 'node:test';
import assert from 'node:assert/strict';
import { handleSession } from '../netlify/functions/voice-session.mjs';
import { CONSENT_VERSION, verifyLog } from '../netlify/lib/voice-store.mjs';
import { ConversationLog } from '../public/assets/js/voice-log.mjs';

const env = { VOICE_ENABLED: 'true', GEMINI_API_KEY: 'test-key', SUPABASE_URL: 'https://exampleproject.supabase.co', SUPABASE_SECRET_KEY: 'test-secret' };
const request = () => new Request('https://genialabs.cl/api', { method: 'POST', headers: { origin: 'https://genialabs.cl', 'content-type': 'application/json' }, body: JSON.stringify({ consent: true, saveTranscript: true, consentVersion: CONSENT_VERSION }) });

test('a stalled transcript save aborts and reports failure instead of waiting forever', { timeout: 12000 }, async () => {
  const reports = [];
  const log = new ConversationLog('visitor', { report: text => reports.push(text), send: (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }) });
  log.append('user', 'Test');
  // Keep the test process alive: AbortSignal.timeout uses an unreferenced timer.
  const keepAlive = setInterval(() => {}, 1000);
  try { await log.save(); } finally { clearInterval(keepAlive); }
  assert.equal(log.dirty, true);
  assert.match(reports.at(-1), /No pudimos confirmar/);
});

test('50 simultaneous session requests progress independently with unique tokens and log IDs', { timeout: 5000 }, async () => {
  let arrived = 0; let release;
  const barrier = new Promise(resolve => { release = resolve; });
  const ids = [];
  const responses = await Promise.all(Array.from({ length: 50 }, () => handleSession(request(), { env, fetchImpl: async (url, options) => {
    if (url.includes('auth_tokens')) {
      const index = ++arrived;
      assert.equal(JSON.parse(options.body).uses, 1);
      if (arrived === 50) release();
      await barrier;
      return Response.json({ name: `auth_tokens/session-${index}` });
    }
    ids.push(JSON.parse(options.body).id);
    return Response.json([{ id: ids.at(-1) }]);
  } })));
  assert.ok(responses.every(response => response.status === 200));
  const sessions = await Promise.all(responses.map(response => response.json()));
  assert.equal(new Set(sessions.map(session => session.token)).size, 50);
  assert.equal(new Set(ids).size, 50);
  assert.deepEqual(new Set(sessions.map(session => verifyLog(session.log.token, env).id)), new Set(ids));
});

test('a stalled, rejected or broken provisioning request does not block another visitor', { timeout: 5000 }, async () => {
  let release;
  const stalled = new Promise(resolve => { release = resolve; });
  const slow = handleSession(request(), { env, fetchImpl: () => stalled });
  const failed = handleSession(request(), { env, fetchImpl: async () => { throw new Error('network'); } });
  const busy = handleSession(request(), { env, fetchImpl: async () => Response.json({ error: {} }, { status: 429 }) });
  const healthy = await handleSession(request(), { env, fetchImpl: async url => Response.json(url.includes('auth_tokens') ? { name: 'auth_tokens/healthy' } : [{}]) });
  assert.equal(healthy.status, 200);
  assert.equal((await failed).status, 503);
  assert.equal((await busy).status, 429);
  release(Response.json({}, { status: 503 }));
  assert.equal((await slow).status, 503);
});

test('concurrent conversation saves keep visitor text and capabilities isolated', async () => {
  const payloads = [];
  const logs = Array.from({ length: 50 }, (_, index) => {
    const log = new ConversationLog(`visitor-${index}`, { send: async (_url, options) => {
      assert.ok(options.signal instanceof AbortSignal);
      payloads.push(JSON.parse(options.body));
      await new Promise(resolve => setImmediate(resolve));
      return Response.json({ saved: true });
    } });
    log.append('user', `Only visitor ${index}`);
    return log;
  });
  await Promise.all(logs.map(log => log.save(true)));
  assert.equal(payloads.length, 50);
  for (let index = 0; index < 50; index++) {
    const payload = payloads.find(value => value.token === `visitor-${index}`);
    assert.deepEqual(payload.turns, [{ role: 'user', text: `Only visitor ${index}` }]);
    assert.equal(payload.final, true);
  }
});
