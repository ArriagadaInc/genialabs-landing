import test from 'node:test';
import assert from 'node:assert/strict';
import { buildKnowledge, publicText } from '../scripts/build-voice-knowledge.mjs';
import { KNOWLEDGE_SOURCES } from '../netlify/lib/voice-knowledge.mjs';
import { SYSTEM_INSTRUCTION } from '../netlify/functions/voice-session.mjs';

test('assistant knowledge stays synchronized with published page sources', () => {
  assert.deepEqual(KNOWLEDGE_SOURCES, buildKnowledge());
  const text = KNOWLEDGE_SOURCES.map(s => s.text).join('\n');
  for (const fact of ['el diagnóstico se descuenta si seguimos', 'WhatsApp usa la API oficial de Meta', '40 horas', 'contacto@genialabs.cl', 'Puedes conversar sin autorizar el guardado']) assert.ok(text.includes(fact), fact);
  assert.ok(!text.includes('precios internos'));
  assert.ok(SYSTEM_INSTRUCTION.includes(text.split('\n')[0]));
  assert.ok(SYSTEM_INSTRUCTION.includes('nunca confundas los montos de la calculadora'));
  assert.ok(SYSTEM_INSTRUCTION.includes('No asegures que todos los proyectos cuestan menos que un sueldo'));
});

test('knowledge excludes private comments and executable page content', () => {
  assert.equal(publicText('<main><!-- internal price --><h2>Costo &amp; alcance</h2><script>secret()</script><style>.hidden{}</style><img alt="Proceso automático" src="x"/></main>'), 'Costo & alcance Proceso automático');
});
