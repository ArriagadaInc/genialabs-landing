import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Extract only authored, public page copy, never HTML comments or executable code.
export function publicText(html) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  if (!main) throw new Error('Knowledge source has no main content');
  return main.replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<img\b[^>]*alt="([^"]*)"[^>]*>/gi, '\n$1\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
}

export function buildKnowledge() {
  return [
    ['https://genialabs.cl/', 'src/index.html'],
    ['https://genialabs.cl/privacidad', 'src/privacidad.html'],
  ].map(([url, path]) => ({ url, text: publicText(fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8')) }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const sources = buildKnowledge();
  fs.writeFileSync(new URL('../netlify/lib/voice-knowledge.mjs', import.meta.url),
    '// Generated from public page copy. Run npm run build:knowledge to refresh.\nexport const KNOWLEDGE_SOURCES = ' + JSON.stringify(sources, null, 2) + ';\n');
  console.log(`Voice knowledge: ${sources.length} pages, ${sources.reduce((n,s)=>n+s.text.length,0)} characters`);
}
