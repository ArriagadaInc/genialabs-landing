import { encodePCM16, decodePCM16 } from './voice-audio.mjs';
import { ConversationLog } from './voice-log.mjs';

const dialog = document.getElementById('voiceDialog');
const launch = document.getElementById('voiceLaunch');
const start = document.getElementById('voiceStart');
const stop = document.getElementById('voiceStop');
const status = document.getElementById('voiceStatus');
const transcript = document.getElementById('voiceTranscript');
const indicator = document.getElementById('voiceIndicator');
const saveConsent = document.getElementById('voiceSaveConsent');
const saveStatus = document.getElementById('voiceSaveStatus');
let storageAvailable = false;
let consentVersion = null;
let active = null;
let previousFocus;
let available = null;

function state(name, text) { indicator.dataset.state = name; status.textContent = text; }
function current(run) { return active === run && !run.cancelled; }
function clearPlayback(run) {
  for (const source of run.playing) { try { source.stop(); } catch { /* already stopped */ } }
  run.playing.clear(); run.nextAudio = 0;
}
function end(text = 'Conversación terminada. Puedes volver a empezar o agendar tu asesoría.') {
  const run = active;
  active = null;
  if (run) {
    run.cancelled = true; run.abort.abort();
    clearTimeout(run.timeout); clearTimeout(run.connectionTimer);
    clearInterval(run.logTimer);
    run.log?.save(true);
    clearPlayback(run);
    if (run.worklet) { run.worklet.port.onmessage = null; run.worklet.disconnect(); }
    run.source?.disconnect(); run.silent?.disconnect();
    run.stream?.getTracks().forEach(track => track.stop());
    run.socket?.close();
    run.audio?.close().catch(() => {});
  }
  start.disabled = available === false; start.hidden = false; stop.hidden = true;
  saveConsent.disabled = !storageAvailable;
  state('idle', text);
}

async function checkAvailability() {
  start.disabled = true;
  try {
    const response = await fetch('/.netlify/functions/voice-session', { cache: 'no-store', signal: AbortSignal.timeout(6000) });
    const data = response.ok ? await response.json() : null;
    available = data?.enabled === true;
    storageAvailable = data?.storageAvailable === true;
    consentVersion = data?.consentVersion;
  } catch { available = false; }
  if (!dialog.open) return;
  start.disabled = !available;
  saveConsent.disabled = !storageAvailable;
  if (!storageAvailable) saveConsent.checked = false;
  saveStatus.textContent = storageAvailable ? 'Puedes conversar sin autorizar el guardado del texto.' : 'El registro de conversaciones aún no está habilitado. Puedes conversar sin guardado.';
  state('idle', available ? 'Listo para conversar. Tú decides cuándo activar el micrófono.' : 'La voz aún no está disponible. Puedes coordinar tu asesoría desde el botón de abajo.');
}

function playAudio(run, part) {
  if (!current(run) || !part.mimeType?.startsWith('audio/pcm')) return;
  const rate = Number(part.mimeType.match(/rate=(\d+)/)?.[1] || 24000);
  if (![16000, 24000, 48000].includes(rate) || part.data.length > 2_000_000) return;
  const bytes = Uint8Array.from(atob(part.data), ch => ch.charCodeAt(0));
  const samples = decodePCM16(bytes);
  const buffer = run.audio.createBuffer(1, samples.length, rate);
  buffer.copyToChannel(samples, 0);
  const source = run.audio.createBufferSource(); source.buffer = buffer; source.connect(run.audio.destination);
  run.playing.add(source);
  const when = Math.max(run.audio.currentTime + 0.025, run.nextAudio);
  run.nextAudio = when + buffer.duration;
  state('speaking', 'El asistente está hablando. Puedes interrumpirlo.');
  source.onended = () => {
    run.playing.delete(source);
    if (current(run) && run.playing.size === 0) state('listening', 'Te escucho. Cuéntame qué tarea te quita tiempo.');
  };
  source.start(when);
}

async function begin() {
  if (active || !available) return;
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.AudioWorkletNode) {
    state('idle', 'Tu navegador no permite la conversación por voz. Puedes usar el formulario de contacto.'); return;
  }
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) { state('idle', 'Prueba con un navegador actualizado o usa el formulario.'); return; }
  const wantsSave = storageAvailable && saveConsent.checked;
  const run = { cancelled: false, abort: new AbortController(), playing: new Set(), nextAudio: 0 };
  saveConsent.disabled = true;
  saveStatus.textContent = wantsSave ? 'Preparando el guardado autorizado del texto…' : 'Esta conversación no se guardará en Genia Labs.';
  active = run; start.hidden = true; stop.hidden = false; transcript.textContent = '';
  state('connecting', 'Preparando el micrófono…');
  try {
    // Resume in the click gesture, before asynchronous permission/token requests (Safari).
    run.audio = new Audio(); await run.audio.resume();
    if (!current(run)) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
    if (!current(run)) { stream.getTracks().forEach(track => track.stop()); return; }
    run.stream = stream;
    await run.audio.audioWorklet.addModule('/assets/js/voice-capture.js');
    if (!current(run)) return;
    state('connecting', 'Conectando con el asistente…');
    run.connectionTimer = setTimeout(() => { if (current(run)) end('No pudimos conectar. Intenta nuevamente o agenda tu asesoría.'); }, 15000);
    const response = await fetch('/.netlify/functions/voice-session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consent: true, saveTranscript: wantsSave, consentVersion }), signal: run.abort.signal,
    });
    if (!current(run)) return;
    if (!response.ok) { end(response.status === 429 ? 'Hay varias conversaciones en este momento. Intenta en un minuto o agenda tu asesoría.' : 'La voz no está disponible ahora. Puedes agendar tu asesoría.'); return; }
    const session = await response.json();
    if (!current(run)) return;
    if (wantsSave && !session.log?.token) throw new Error('Missing storage session');
    if (wantsSave) {
      run.log = new ConversationLog(session.log.token, { report: text => { if (active === run || !active) saveStatus.textContent = text; } });
      run.logTimer = setInterval(() => run.log.save(), 10000);
      saveStatus.textContent = 'Guardaremos el texto con tu autorización. La transcripción automática puede contener errores.';
    }
    if (typeof session.token !== 'string' || !session.token.startsWith('auth_tokens/') || !/^models\/[a-z0-9.-]+$/.test(session.model)) throw new Error('Invalid session');
    const socket = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(session.token)}`);
    run.socket = socket;
    socket.onopen = () => { if (current(run)) socket.send(JSON.stringify({ setup: { model: session.model } })); };
    // Serialize binary Blob decoding so setup/audio/interruption events stay ordered.
    let messages = Promise.resolve();
    socket.onmessage = event => {
      messages = messages.then(async () => {
        if (!current(run)) return;
        const raw = typeof event.data === 'string' ? event.data : await event.data.text();
        if (!current(run)) return;
        const message = JSON.parse(raw);
        if (message.error) { end('La conversación se interrumpió. Puedes volver a intentar.'); return; }
        if (message.setupComplete && !run.ready) {
          run.ready = true; clearTimeout(run.connectionTimer);
          run.source = run.audio.createMediaStreamSource(stream);
          run.worklet = new AudioWorkletNode(run.audio, 'genia-voice-capture');
          run.silent = run.audio.createGain(); run.silent.gain.value = 0;
          run.worklet.port.onmessage = ({ data }) => {
            if (!current(run) || socket.readyState !== WebSocket.OPEN) return;
            if (socket.bufferedAmount > 128000) { end('La conexión está lenta. Intenta nuevamente con una señal más estable.'); return; }
            const bytes = encodePCM16(data.samples);
            let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
            socket.send(JSON.stringify({ realtimeInput: { audio: { data: btoa(binary), mimeType: `audio/pcm;rate=${data.rate}` } } }));
          };
          run.source.connect(run.worklet); run.worklet.connect(run.silent); run.silent.connect(run.audio.destination);
          state('listening', 'Te escucho. Cuéntame qué tarea te quita tiempo.');
          socket.send(JSON.stringify({ clientContent: { turns: [{ role: 'user', parts: [{ text: 'Salúdame brevemente como asistente virtual de Genia Labs y pregúntame a qué se dedica mi negocio.' }] }], turnComplete: true } }));
          run.timeout = setTimeout(() => { if (current(run)) end('Terminamos esta conversación de tres minutos. Si quieres seguir, agenda tu asesoría gratis.'); }, Math.min(Number(session.maxSeconds) || 180, 180) * 1000);
        }
        const content = message.serverContent;
        if (content?.inputTranscription?.text) run.log?.append('user', content.inputTranscription.text);
        if (content?.outputTranscription?.text) run.log?.append('assistant', content.outputTranscription.text);
        if (content?.turnComplete || content?.interrupted) run.log?.newTurn();
        if (content?.interrupted) { clearPlayback(run); state('listening', 'Te escucho…'); }
        if (content?.outputTranscription?.text) {
          if (run.newTurn) { transcript.textContent = ''; run.newTurn = false; }
          transcript.textContent = (transcript.textContent + content.outputTranscription.text).slice(-2400);
        }
        for (const part of content?.modelTurn?.parts || []) if (part.inlineData) playAudio(run, part.inlineData);
        if (content?.turnComplete) { run.newTurn = true; if (!run.playing.size) state('listening', 'Te escucho…'); }
        if (message.goAway) end('La sesión terminó. Puedes volver a empezar o agendar tu asesoría.');
      }).catch(() => { if (current(run)) end('No pudimos continuar la conversación. Puedes volver a intentar.'); });
    };
    socket.onerror = () => { if (current(run)) end('No pudimos conectar con el asistente. Intenta nuevamente o agenda tu asesoría.'); };
    socket.onclose = () => { if (current(run)) end(); };
    stream.getAudioTracks().forEach(track => track.addEventListener('ended', () => { if (current(run)) end('El micrófono se desconectó. Puedes volver a empezar.'); }));
  } catch (error) {
    if (!current(run)) return;
    end(error.name === 'NotAllowedError' ? 'No se habilitó el micrófono. Puedes permitirlo en tu navegador o usar el formulario.' : 'No pudimos iniciar la voz. Puedes volver a intentar o usar el formulario.');
  }
}

launch.addEventListener('click', () => {
  previousFocus = document.activeElement; dialog.showModal(); launch.setAttribute('aria-expanded', 'true');
  checkAvailability();
});
document.getElementById('voiceClose').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => { end(); transcript.textContent = ''; launch.setAttribute('aria-expanded', 'false'); previousFocus?.focus(); });
dialog.addEventListener('cancel', () => end());
document.getElementById('voiceContact').addEventListener('click', () => dialog.close());
start.addEventListener('click', begin); stop.addEventListener('click', () => end());
window.addEventListener('pagehide', () => end());
document.addEventListener('visibilitychange', () => { if (document.hidden && active) end('Pausamos la conversación al salir de esta pestaña. Puedes volver a empezar.'); });
