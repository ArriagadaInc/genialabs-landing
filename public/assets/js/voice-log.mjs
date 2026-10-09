// In-memory only; never use localStorage for visitor conversations.
export class ConversationLog {
  constructor(token, { send = fetch, clock = Date.now, report = () => {} } = {}) {
    this.token = token; this.send = send; this.clock = clock; this.report = report;
    this.started = clock(); this.turns = []; this.revision = 0; this.bytes = 0; this.boundary = true;
    this.finished = false; this.dirty = false;
  }
  append(role, text) {
    if (this.finished || !['user','assistant'].includes(role) || typeof text !== 'string' || !text) return;
    // Keep the first 30 KB and surface truncation; do not silently discard old turns.
    const previous = this.turns.at(-1);
    const join = !this.boundary && previous?.role === role && previous.text.length < 6000;
    if (!join && this.turns.length >= 100) { this.report('La transcripción alcanzó su límite; se guardará el texto recibido hasta ahora.'); return; }
    let accepted = ''; const room = join ? 6000 - previous.text.length : 6000;
    for (const char of text) {
      const size = new TextEncoder().encode(char).length;
      if (this.bytes + size > 30000 || accepted.length + char.length > room) break;
      accepted += char; this.bytes += size;
    }
    if (accepted.length < text.length) this.report('La transcripción alcanzó su límite; se guardará el texto recibido hasta ahora.');
    if (!accepted) return;
    if (join) previous.text += accepted; else this.turns.push({ role, text: accepted });
    this.boundary = false; this.dirty = true;
  }
  newTurn() { this.boundary = true; }
  async save(final = false) {
    if (this.finished || (!final && !this.dirty)) return;
    if (final) this.finished = true;
    this.dirty = false;
    const payload = { token: this.token, revision: ++this.revision, final, durationSeconds: Math.min(240, Math.max(0, Math.round((this.clock() - this.started) / 1000))), turns: this.turns.filter(turn => turn.text.trim()).map(turn => ({ ...turn })) };
    try {
      const response = await this.send('/.netlify/functions/voice-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true });
      const data = response.ok ? await response.json() : null;
      if (payload.revision !== this.revision) return;
      if (!data?.saved) throw new Error('Unconfirmed');
      this.report(final ? 'Texto de la conversación guardado.' : 'Guardando el texto con tu autorización.');
    } catch {
      if (payload.revision !== this.revision) return;
      this.dirty = true;
      this.report('No pudimos confirmar el último guardado. Puedes compartir tu necesidad en el formulario.');
    }
  }
}
