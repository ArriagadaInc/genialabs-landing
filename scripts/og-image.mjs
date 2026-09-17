import fs from 'node:fs';
import sharp from 'sharp';

// Tarjeta Open Graph 1200x630. Se rasteriza a PNG porque WhatsApp, LinkedIn y
// Facebook no renderizan SVG.
//
// La tarjeta NO usa Archivo ni Chivo: sharp rasteriza con las fuentes
// instaladas en el sistema, y estas se sirven desde /assets/fonts, no estan
// instaladas. Por eso la identidad la cargan aqui el color y la
// composicion, no la tipografia.
// El contraste de ancho del titular se aproxima con letter-spacing.

// Simbolo del logo, escalado a un alto dado. Los ids se prefijan para poder
// incluirlo mas de una vez en el mismo SVG.
const logo = fs.readFileSync('public/assets/img/logo-genialabs.svg', 'utf8');
const [, , alto] = logo.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number);
const interior = logo.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const simbolo = (pre, h) =>
  `<g transform="scale(${(h / alto).toFixed(5)})">${interior.replace(/gl-/g, `gl${pre}-`)}</g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#14202A"/>

  <!-- Marca: simbolo vectorial + logotipo. El simbolo va dos veces (chico
       arriba, grande a la derecha), cada copia con sus ids renombrados. -->
  <g transform="translate(80,52)">
    ${simbolo('a', 64)}
    <text x="68" y="36" font-family="Segoe UI, Arial, Helvetica, sans-serif"
          font-size="34" font-weight="800" fill="#FFFFFF" letter-spacing="1.5">GENIA</text>
    <text x="189" y="58" text-anchor="end" font-family="Segoe UI, Arial, Helvetica, sans-serif"
          font-size="15" font-weight="700" fill="#4FDFC5" letter-spacing="1.5">LABS</text>
  </g>
  <g transform="translate(905,392)">${simbolo('b', 200)}</g>

  <!-- Gancho: la frase de la marca y los beneficios -->
  <rect x="80" y="176" width="560" height="40" rx="2" fill="#F6E7D6" stroke="#C98A4B"/>
  <text x="100" y="202" font-family="Consolas, Courier New, monospace"
        font-size="17" fill="#98490C" letter-spacing="1.6">MENOS HORAS HOMBRE · MENOS COSTOS · MENOS PAPELEO</text>
  <text x="80" y="310" font-family="Segoe UI, Arial, Helvetica, sans-serif"
        font-size="64" font-weight="700" fill="#FBF9F4" letter-spacing="-2">Lleva la inteligencia artificial</text>
  <text x="80" y="392" font-family="Segoe UI, Arial, Helvetica, sans-serif"
        font-size="64" font-weight="700" fill="#5FA98D" letter-spacing="-2">a tu pyme.</text>

  <!-- Anclas comerciales -->
  <g font-family="Consolas, Courier New, monospace">
    <rect x="80" y="436" width="380" height="104" rx="3" fill="#FFFFFF"/>
    <rect x="80" y="436" width="5" height="104" fill="#0C6B4F"/>
    <text x="108" y="472" font-size="15" fill="#546471" letter-spacing="1.5">LEY 21.719 · RIGE EL</text>
    <text x="108" y="518" font-size="36" font-weight="700" fill="#B4560F">1 dic 2026</text>

    <rect x="488" y="436" width="340" height="104" rx="3" fill="#FFFFFF"/>
    <rect x="488" y="436" width="5" height="104" fill="#0C6B4F"/>
    <text x="516" y="472" font-size="15" fill="#546471" letter-spacing="1.5">PRIMERA REUNIÓN Y ASESORÍA</text>
    <text x="516" y="518" font-size="36" font-weight="700" fill="#0C6B4F">Gratis</text>
  </g>

  <text x="80" y="588" font-family="Consolas, Courier New, monospace"
        font-size="22" fill="#5FA98D" letter-spacing="1.5">genialabs.cl</text>
</svg>`;

fs.writeFileSync('public/assets/img/og-image.svg', svg);
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile('public/assets/img/og-image.png');
const { size } = fs.statSync('public/assets/img/og-image.png');
const meta = await sharp('public/assets/img/og-image.png').metadata();
console.log(`og-image.png ${meta.width}x${meta.height}, ${(size / 1024).toFixed(1)} KB`);
