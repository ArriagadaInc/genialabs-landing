import fs from 'node:fs';
import path from 'node:path';
import * as lucide from 'lucide';

const DIST = 'dist';

if (process.argv.includes('--clean')) {
  fs.rmSync(DIST, { recursive: true, force: true });
  console.log('cleaned dist/');
  process.exit(0);
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'assets/css'), { recursive: true });
fs.mkdirSync(path.join(DIST, 'assets/fonts'), { recursive: true });
fs.mkdirSync(path.join(DIST, 'assets/img'), { recursive: true });

// ---------------------------------------------------------------------------
// Iconos Lucide pre-renderizados a SVG estatico.
// Evita cargar 412 KB de JS y elimina el parpadeo con que aparecian los iconos.
// ---------------------------------------------------------------------------
const pascal = (kebab) =>
  kebab.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

const renderChildren = (nodes) =>
  nodes
    .map(([tag, attrs]) =>
      `<${tag} ${Object.entries(attrs)
        .map(([k, v]) => `${k}="${esc(v)}"`)
        .join(' ')} />`
    )
    .join('');

let inlined = 0;
const missing = new Set();

function inlineIcons(html) {
  // Captura <i ...data-lucide="nombre"...></i> con atributos en cualquier orden
  return html.replace(/<i\b([^>]*?)><\/i>/g, (full, rawAttrs) => {
    const nameMatch = rawAttrs.match(/data-lucide="([^"]+)"/);
    if (!nameMatch) return full;
    const name = nameMatch[1];
    const nodes = lucide[pascal(name)];
    if (!nodes) {
      missing.add(name);
      return full;
    }

    // Conserva los atributos originales (class, aria-hidden, style, ...)
    const kept = [...rawAttrs.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)]
      .filter(([, k]) => k !== 'data-lucide');

    const cls = kept.find(([, k]) => k === 'class')?.[2] ?? '';
    const others = kept
      .filter(([, k]) => k !== 'class')
      .map(([, k, v]) => `${k}="${v}"`)
      .join(' ');

    inlined++;
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" ` +
      `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ` +
      `stroke-linecap="round" stroke-linejoin="round" ` +
      `class="lucide lucide-${name}${cls ? ' ' + cls : ''}"` +
      (others ? ' ' + others : '') +
      `>${renderChildren(nodes)}</svg>`
    );
  });
}

for (const page of fs.readdirSync('src').filter((f) => f.endsWith('.html'))) {
  const before = inlined;
  const html = inlineIcons(fs.readFileSync(path.join('src', page), 'utf8'));

  if (missing.size) throw new Error('Iconos lucide inexistentes: ' + [...missing].join(', '));
  if (/data-lucide=/.test(html)) throw new Error(`Quedaron iconos sin inlinear en ${page}`);

  fs.writeFileSync(path.join(DIST, page), html);
  console.log(`${page} -> ${inlined - before} iconos inlineados`);
}

// --- Tipografia Inter autoalojada (solo los pesos que usa la pagina) ---
const fontSrc = 'node_modules/@fontsource/inter/files';
let fonts = 0;
for (const w of [300, 400, 500, 600, 700, 800]) {
  for (const ext of ['woff2', 'woff']) {
    const f = `inter-latin-${w}-normal.${ext}`;
    fs.copyFileSync(path.join(fontSrc, f), path.join(DIST, 'assets/fonts', f));
    fonts++;
  }
}
console.log(`fuentes copiadas: ${fonts}`);

// --- Archivos estaticos (robots, sitemap, headers, redirects, imagenes) ---
function copyDir(from, to) {
  if (!fs.existsSync(from)) return 0;
  let n = 0;
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      n += copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
      n++;
    }
  }
  return n;
}
console.log(`estaticos copiados: ${copyDir('public', DIST)}`);
