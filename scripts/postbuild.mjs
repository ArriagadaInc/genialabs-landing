import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DIST = 'dist';
const CSS_DIR = path.join(DIST, 'assets/css');
const CSS = path.join(CSS_DIR, 'styles.css');

let css = fs.readFileSync(CSS, 'utf8');

// --- 1. @fontsource emite url(files/...), relativo al paquete. Apuntar a /assets/fonts/ ---
const nFuentes = (css.match(/url\(files\//g) || []).length;
css = css.replace(/url\(files\//g, 'url(/assets/fonts/');

const pendientes = css.match(/url\((?!\/assets\/|data:|["']?data:)[^)]*\)/g) || [];
if (pendientes.length) throw new Error('URLs sin resolver en el CSS: ' + pendientes.join(', '));

const refs = [...css.matchAll(/url\(\/assets\/fonts\/([^)]+)\)/g)].map((m) => m[1]);
const faltan = [...new Set(refs)].filter((f) => !fs.existsSync(`dist/assets/fonts/${f}`));
if (faltan.length) throw new Error('Fuentes referenciadas pero ausentes: ' + faltan.join(', '));

// --- 2. Hash de contenido en el nombre del CSS ---
// El _headers cachea /assets/css/* por 7 dias. Sin hash, un visitante que ya
// tenia styles.css seguia viendo la version vieja hasta que expirara. Con el
// hash, cualquier cambio produce una URL nueva y el cache largo es seguro.
const hash = crypto.createHash('sha256').update(css).digest('hex').slice(0, 8);
const nombreHasheado = `styles.${hash}.css`;

fs.writeFileSync(path.join(CSS_DIR, nombreHasheado), css);
fs.rmSync(CSS);

// --- 3. Apuntar el HTML al nombre nuevo ---
let paginas = 0;
for (const f of fs.readdirSync(DIST).filter((f) => f.endsWith('.html'))) {
  const p = path.join(DIST, f);
  const antes = fs.readFileSync(p, 'utf8');
  const despues = antes.replaceAll('/assets/css/styles.css', `/assets/css/${nombreHasheado}`);
  if (antes !== despues) { fs.writeFileSync(p, despues); paginas++; }
}

// --- 4. Verificar que no quede ninguna referencia sin hashear ---
for (const f of fs.readdirSync(DIST).filter((f) => f.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(DIST, f), 'utf8');
  if (html.includes('/assets/css/styles.css')) throw new Error(`Referencia sin hashear en ${f}`);
  const usadas = [...html.matchAll(/\/assets\/css\/([\w.]+\.css)/g)].map((m) => m[1]);
  for (const u of new Set(usadas)) {
    if (!fs.existsSync(path.join(CSS_DIR, u))) throw new Error(`${f} referencia ${u}, que no existe`);
  }
}

console.log(`postbuild: ${nFuentes} url() de fuentes reescritas, ${new Set(refs).size} archivos verificados`);
console.log(`postbuild: CSS -> ${nombreHasheado} (${(fs.statSync(path.join(CSS_DIR, nombreHasheado)).size / 1024).toFixed(1)} KB), ${paginas} paginas actualizadas`);
