import fs from 'node:fs';
import sharp from 'sharp';

// Tarjeta Open Graph 1200x630 con la identidad de la marca.
// Se rasteriza a PNG porque WhatsApp/LinkedIn/Facebook no renderizan SVG.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0c2a4d"/>
      <stop offset="55%" stop-color="#0b2545"/>
      <stop offset="100%" stop-color="#082f49"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#0284c7" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1010" cy="140" r="330" fill="url(#glow)"/>
  <circle cx="150" cy="600" r="300" fill="url(#glow2)"/>

  <!-- Marca -->
  <g transform="translate(90,88)">
    <g stroke="#38bdf8" stroke-width="2.6" stroke-linecap="round" fill="none" transform="scale(1.9)">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 3v3"/><path d="M12 18v3"/>
      <path d="M3 12h3"/><path d="M18 12h3"/>
      <path d="M5.6 5.6l2.2 2.2"/><path d="M16.2 16.2l2.2 2.2"/>
    </g>
    <text x="70" y="34" font-family="Segoe UI, Arial, Helvetica, sans-serif"
          font-size="34" font-weight="700" fill="#ffffff" letter-spacing="0.5">Genia Labs</text>
  </g>

  <!-- Titular -->
  <text x="90" y="285" font-family="Segoe UI, Arial, Helvetica, sans-serif"
        font-size="72" font-weight="700" fill="#ffffff">Lleva la inteligencia</text>
  <text x="90" y="371" font-family="Segoe UI, Arial, Helvetica, sans-serif"
        font-size="72" font-weight="700" fill="#ffffff">artificial a tu pyme</text>

  <rect x="90" y="404" width="132" height="6" rx="3" fill="url(#accent)"/>

  <!-- Bajada -->
  <text x="90" y="470" font-family="Segoe UI, Arial, Helvetica, sans-serif"
        font-size="31" font-weight="400" fill="#bae0fd">Automatiza tareas manuales, ordena tus datos</text>
  <text x="90" y="512" font-family="Segoe UI, Arial, Helvetica, sans-serif"
        font-size="31" font-weight="400" fill="#bae0fd">y toma mejores decisiones.</text>

  <text x="90" y="580" font-family="Segoe UI, Arial, Helvetica, sans-serif"
        font-size="26" font-weight="600" fill="#7dd3fc" letter-spacing="1">genialabs.cl</text>
</svg>`;

fs.writeFileSync('public/assets/img/og-image.svg', svg);
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile('public/assets/img/og-image.png');
const { size } = fs.statSync('public/assets/img/og-image.png');
const meta = await sharp('public/assets/img/og-image.png').metadata();
console.log(`og-image.png ${meta.width}x${meta.height}, ${(size / 1024).toFixed(1)} KB`);
