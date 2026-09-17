import fs from 'node:fs';
import sharp from 'sharp';

// Favicon e iconos a partir del simbolo vectorial del logo.
//
// public/assets/img/logo-genialabs.svg es la FUENTE: se vectorizo a mano desde
// el logo original (silueta trazada, atomo reconstruido con elipses y circulos
// exactos, degradados medidos sobre la imagen). Si cambia el logo, se cambia
// ese archivo y se vuelve a correr: npm run build:iconos
//
// Salidas (van a public/, se versionan):
//   favicon.svg            simbolo centrado en un cuadrado, fondo transparente
//   favicon-32.png         respaldo para navegadores sin favicon SVG
//   apple-touch-icon.png   180x180 sobre tinta (iOS no respeta transparencia)
//   icon-512.png           logo para buscadores (JSON-LD) y accesos directos

const DIR = 'public/assets/img';
const TINTA = '#14202A';

const logo = fs.readFileSync(`${DIR}/logo-genialabs.svg`, 'utf8');
const [, vw, vh] = logo.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number);
const interior = logo.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

// Envuelve el simbolo en un cuadrado de lado L, con el alto ocupando "escala".
function cuadrado(L, escala, fondo) {
  const s = (L * escala) / vh;
  const x = (L - vw * s) / 2;
  const y = (L - vh * s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${L}">` +
    (fondo ? `<rect width="${L}" height="${L}" fill="${fondo}"/>` : '') +
    `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(5)})">${interior}</g></svg>\n`;
}

const favicon = cuadrado(512, 0.96, null);
fs.writeFileSync(`${DIR}/favicon.svg`, favicon);

const png = (svg, lado, archivo) =>
  sharp(Buffer.from(svg), { density: 384 }).resize(lado, lado).png({ compressionLevel: 9 }).toFile(`${DIR}/${archivo}`);

await png(favicon, 32, 'favicon-32.png');
await png(cuadrado(512, 0.7, TINTA), 180, 'apple-touch-icon.png');
await png(cuadrado(512, 0.7, TINTA), 512, 'icon-512.png');

for (const f of ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'icon-512.png']) {
  console.log(`${f} ${(fs.statSync(`${DIR}/${f}`).size / 1024).toFixed(1)} KB`);
}
