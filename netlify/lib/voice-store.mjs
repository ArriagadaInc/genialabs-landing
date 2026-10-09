import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export const CONSENT_VERSION = '2026-10-09-text-v1';
export const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
export function allowedOrigin(request, env) {
  const origins = new Set(['https://genialabs.cl', 'https://www.genialabs.cl']);
  for (const value of [env.URL, env.DEPLOY_PRIME_URL]) {
    try { if (value) origins.add(new URL(value).origin); } catch { /* invalid config */ }
  }
  if (env.NETLIFY_DEV === 'true') for (const host of ['localhost', '127.0.0.1']) origins.add(`http://${host}:8888`);
  return origins.has(request.headers.get('origin'));
}
export function storeConfig(env) {
  try {
    const url = new URL(env.SUPABASE_URL);
    if (url.protocol !== 'https:' || !/^[a-z0-9]+\.supabase\.co$/.test(url.hostname) || url.username || url.password) return null;
    if (!env.SUPABASE_SECRET_KEY || !env.GEMINI_API_KEY) return null;
    return { url: url.origin, key: env.SUPABASE_SECRET_KEY };
  } catch { return null; }
}
function signature(payload, env) {
  // Separate context from Google's credential use; no key is sent to the browser.
  return createHmac('sha256', env.GEMINI_API_KEY).update('genialabs-voice-log-v1\0' + payload).digest('base64url');
}
export function signLog(id, env, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ id, exp: now + 600000, consent: CONSENT_VERSION })).toString('base64url');
  return `${payload}.${signature(payload, env)}`;
}
export function verifyLog(token, env, now = Date.now()) {
  try {
    if (typeof token !== 'string' || token.length > 600 || !env.GEMINI_API_KEY) return null;
    const [payload, mac, extra] = token.split('.');
    if (extra || !mac) return null;
    const actual = Buffer.from(mac); const expected = Buffer.from(signature(payload, env));
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!/^[0-9a-f-]{36}$/.test(data.id) || data.consent !== CONSENT_VERSION || data.exp <= now || data.exp > now + 600000) return null;
    return data;
  } catch { return null; }
}
export async function storeRequest(env, fetchImpl, suffix, options) {
  const config = storeConfig(env);
  if (!config) throw new Error('Store unavailable');
  return fetchImpl(`${config.url}/rest/v1/voice_conversations${suffix}`, {
    ...options, headers: { 'Content-Type': 'application/json', apikey: config.key, Prefer: 'return=representation', ...options.headers }, signal: AbortSignal.timeout(8000),
  });
}
export async function createLog(env, fetchImpl, now = Date.now()) {
  const id = randomUUID();
  const response = await storeRequest(env, fetchImpl, '', { method: 'POST', body: JSON.stringify({ id, consent_version: CONSENT_VERSION }) });
  if (!response.ok) {
    let code = '';
    try { code = (await response.json()).code || ''; } catch {}
    console.warn('voice_store_failed', { httpStatus: response.status, code: String(code).slice(0,80) });
    throw new Error('Store unavailable');
  }
  return { token: signLog(id, env, now) };
}
export async function readJSON(request, limit) {
  if (!(request.headers.get('content-type') || '').startsWith('application/json')) throw new Error('Invalid body');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Invalid body');
  const chunks = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new Error('Body too large'); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
