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

// ---------------------------------------------------------------------------
// Logo animado: el simbolo de public/assets/img/logo-genialabs.svg con los
// electrones girando por sus orbitas. Se inserta INLINE donde el HTML tenga
// <!-- LOGO_ANIMADO --> (inline, y no <img>, para poder pausarlo desde JS).
//
// Cada electron se asigna a la orbita mas cercana y arranca con un "begin"
// negativo que lo deja exactamente donde esta en el logo: en t=0, o con la
// animacion pausada, el dibujo es identico al logo estatico.
// ---------------------------------------------------------------------------
function logoAnimado() {
  const svg = fs.readFileSync('public/assets/img/logo-genialabs.svg', 'utf8')
    .replace(/gl-/g, 'ga-');
  const viewBox = svg.match(/viewBox="([^"]+)"/)[1];
  const defs = svg.match(/<defs>[\s\S]*?<\/defs>/)[0];
  const cabeza = svg.match(/<use[^>]*\/>/g).join('');

  // Orbitas: M x1 y1 A a b rot 1 0 x2 y2 A ...  (sweep 0: el parametro decrece)
  const orbitas = [...svg.matchAll(/<path d="M([\d.]+) ([\d.]+)A([\d.]+) ([\d.]+) ([\d.]+) 1 0 ([\d.]+) ([\d.]+)A[^"]*"\/>/g)]
    .map((m, i) => {
      const [x1, y1, a, b, rot, x2, y2] = m.slice(1, 8).map(Number);
      const t = rot * Math.PI / 180;
      const punto = (u) => [
        (x1 + x2) / 2 + a * Math.cos(u) * Math.cos(t) - b * Math.sin(u) * Math.sin(t),
        (y1 + y2) / 2 + a * Math.cos(u) * Math.sin(t) + b * Math.sin(u) * Math.cos(t),
      ];
      // Largo acumulado recorriendo u = 0 -> -2pi, igual que el path.
      const N = 2000, acum = [0];
      let prev = punto(0);
      for (let k = 1; k <= N; k++) {
        const p = punto(-k / N * 2 * Math.PI);
        acum.push(acum[k - 1] + Math.hypot(p[0] - prev[0], p[1] - prev[1]));
        prev = p;
      }
      return { id: `ga-orbita-${i}`, d: m[0].match(/d="([^"]+)"/)[1], punto, acum, N };
    });

  const circulos = [...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"\/>/g)]
    .map((m) => m.slice(1, 4).map(Number));
  const [nucleo, ...electrones] = circulos;

  // Una duracion por orbita, distintas para que el movimiento no se sincronice.
  const DUR = [9, 12, 10.5];
  const animados = electrones.map(([x, y, r]) => {
    let mejor = null;
    orbitas.forEach((o, i) => {
      for (let k = 0; k <= o.N; k++) {
        const [px, py] = o.punto(-k / o.N * 2 * Math.PI);
        const d = Math.hypot(px - x, py - y);
        if (!mejor || d < mejor.d) mejor = { d, i, k };
      }
    });
    const o = orbitas[mejor.i];
    const fraccion = o.acum[mejor.k] / o.acum[o.N];
    const dur = DUR[mejor.i % DUR.length];
    return `<circle r="${r}" fill="#fff"><animateMotion dur="${dur}s" begin="${(-fraccion * dur).toFixed(3)}s" repeatCount="indefinite"><mpath href="#${o.id}"/></animateMotion></circle>`;
  });

  // Los electrones van en una mascara sobre un rectangulo con el degradado: si
  // el circulo llevara el fill, el degradado viajaria con el (animateMotion le
  // suma una transformacion) y todos tendrian el mismo color.
  const [, , vw, vh] = viewBox.split(' ').map(Number);
  const [ncx, ncy, nr] = nucleo;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" class="logo-animado-svg" aria-hidden="true" focusable="false">` +
    defs.replace('</defs>', `<filter id="ga-halo" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="9"/></filter>` +
      `<mask id="ga-electrones" maskUnits="userSpaceOnUse" x="0" y="0" width="${vw}" height="${vh}">${animados.join('')}</mask></defs>`) +
    cabeza +
    `<g fill="none" stroke="url(#ga-atomo)" stroke-width="${svg.match(/stroke="url\(#ga-atomo\)" stroke-width="([\d.]+)"/)[1]}">` +
    orbitas.map((o) => `<path id="${o.id}" d="${o.d}"/>`).join('') + `</g>` +
    `<circle cx="${ncx}" cy="${ncy}" r="${nr * 1.35}" fill="#6DF0FB" filter="url(#ga-halo)" opacity=".25">` +
    `<animate attributeName="opacity" values=".15;.45;.15" dur="3.2s" repeatCount="indefinite"/></circle>` +
    `<g fill="url(#ga-atomo)"><circle cx="${ncx}" cy="${ncy}" r="${nr}">` +
    `<animate attributeName="r" values="${nr};${(nr * 1.06).toFixed(2)};${nr}" dur="3.2s" repeatCount="indefinite"/></circle>` +
    `</g><rect width="${vw}" height="${vh}" fill="url(#ga-atomo)" mask="url(#ga-electrones)"/></svg>`;
}
const LOGO_ANIMADO = logoAnimado();

for (const page of fs.readdirSync('src').filter((f) => f.endsWith('.html'))) {
  const before = inlined;
  const html = inlineIcons(fs.readFileSync(path.join('src', page), 'utf8'))
    .replaceAll('<!-- LOGO_ANIMADO -->', LOGO_ANIMADO);

  if (missing.size) throw new Error('Iconos lucide inexistentes: ' + [...missing].join(', '));
  if (/data-lucide=/.test(html)) throw new Error(`Quedaron iconos sin inlinear en ${page}`);

  fs.writeFileSync(path.join(DIST, page), html);
  console.log(`${page} -> ${inlined - before} iconos inlineados`);
}

// ---------------------------------------------------------------------------
// Tipografia autoalojada: Archivo Variable (display), Chivo (texto) y Chivo
// Mono (rotulos y datos), las tres de Omnibus-Type.
//
// Solo el subconjunto latin y solo woff2: el sitio es en castellano y no queda
// ningun navegador en uso que soporte woff pero no woff2.
//
// De Archivo se copia el archivo del eje de ancho (wdth), no el de peso: el
// ancho es parte del diseno, no un adorno. Ver .display y .display-ancho en
// src/styles.css.
//
// Esta lista tiene que coincidir con las @font-face de src/styles.css. Si no
// coincide, postbuild.mjs falla al verificar que cada url() exista.
// ---------------------------------------------------------------------------
const FUENTES = [
  ['@fontsource-variable/archivo', 'archivo-latin-wdth-normal.woff2'],
  ['@fontsource/chivo', 'chivo-latin-400-normal.woff2'],
  ['@fontsource/chivo', 'chivo-latin-500-normal.woff2'],
  ['@fontsource/chivo-mono', 'chivo-mono-latin-400-normal.woff2'],
];

for (const [paquete, archivo] of FUENTES) {
  fs.copyFileSync(
    path.join('node_modules', paquete, 'files', archivo),
    path.join(DIST, 'assets/fonts', archivo)
  );
}
console.log(`fuentes copiadas: ${FUENTES.length}`);

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
