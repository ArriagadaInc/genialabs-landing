import fs from 'node:fs';

const CSS = 'dist/assets/css/styles.css';
let css = fs.readFileSync(CSS, 'utf8');

// @fontsource emite url(files/...), relativo al paquete. Apuntar a /assets/fonts/.
const before = (css.match(/url\(files\//g) || []).length;
css = css.replace(/url\(files\//g, 'url(/assets/fonts/');
fs.writeFileSync(CSS, css);

const leftover = css.match(/url\((?!\/assets\/|data:|["']?data:)[^)]*\)/g) || [];
if (leftover.length) {
  throw new Error('URLs sin resolver en el CSS: ' + leftover.join(', '));
}

// Verificar que cada fuente referenciada exista realmente en dist/
const refs = [...css.matchAll(/url\(\/assets\/fonts\/([^)]+)\)/g)].map((m) => m[1]);
const faltan = [...new Set(refs)].filter((f) => !fs.existsSync(`dist/assets/fonts/${f}`));
if (faltan.length) throw new Error('Fuentes referenciadas pero ausentes: ' + faltan.join(', '));

console.log(`postbuild: ${before} url() de fuentes reescritas, ${new Set(refs).size} archivos verificados`);
console.log(`postbuild: CSS final ${(fs.statSync(CSS).size / 1024).toFixed(1)} KB`);
