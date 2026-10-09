import { allowedOrigin, json, readJSON, storeConfig, storeRequest, verifyLog } from '../lib/voice-store.mjs';

export async function handleLog(request, { env = process.env, fetchImpl = fetch, now = Date.now } = {}) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!allowedOrigin(request, env)) return json({ error: 'forbidden_origin' }, 403);
  if (!storeConfig(env)) return json({ error: 'store_unavailable' }, 503);
  let body;
  try { body = await readJSON(request, 45000); } catch { return json({ error: 'invalid_request' }, 400); }
  const auth = verifyLog(body?.token, env, now());
  if (!auth) return json({ error: 'invalid_session' }, 401);
  if (!Number.isInteger(body.revision) || body.revision < 1 || body.revision > 1000 || typeof body.final !== 'boolean' || !Number.isInteger(body.durationSeconds) || body.durationSeconds < 0 || body.durationSeconds > 240 || !Array.isArray(body.turns) || body.turns.length > 100) return json({ error: 'invalid_request' }, 400);
  let size = 0;
  const valid = body.turns.every(turn => {
    if (!turn || !['user','assistant'].includes(turn.role) || typeof turn.text !== 'string' || !turn.text.trim() || turn.text.length > 6000) return false;
    size += Buffer.byteLength(turn.text, 'utf8'); return size <= 30000;
  });
  if (!valid) return json({ error: 'invalid_request' }, 400);
  // Extract, not an inferred commercial profile. Keeps a useful preview even if AI is unavailable.
  const summary = body.turns.filter(turn => turn.role === 'user').map(turn => turn.text.trim()).join(' · ').slice(0, 1200);
  try {
    const result = await storeRequest(env, fetchImpl, `?id=eq.${auth.id}&revision=lt.${body.revision}&status=neq.ended`, {
      method: 'PATCH', body: JSON.stringify({ transcript: body.turns, revision: body.revision, status: body.final ? 'ended' : 'in_progress', duration_seconds: body.durationSeconds, updated_at: new Date(now()).toISOString(), summary: summary || null, summary_kind: summary ? 'extract' : null }),
    });
    if (!result.ok) return json({ error: 'store_unavailable' }, 503);
    const rows = await result.json();
    return json({ saved: Array.isArray(rows) && rows.length === 1 });
  } catch { return json({ error: 'store_unavailable' }, 503); }
}
export default request => handleLog(request);
export const config = { rateLimit: { windowLimit: 40, windowSize: 60, aggregateBy: ['ip','domain'], action: 'rate_limit' } };
