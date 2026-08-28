import fs from 'node:fs';

const SRC = 'front/landing_page_genia_labs_v6_produccion.html';
let html = fs.readFileSync(SRC, 'utf8');

// --- 1. Extract the inline <style> block into the Tailwind entry stylesheet ---
const styleMatch = html.match(/  <style>\n([\s\S]*?)\n  <\/style>\n/);
if (!styleMatch) throw new Error('inline <style> block not found');
const customCss = styleMatch[1].replace(/^ {4}/gm, '');
html = html.replace(styleMatch[0], '');

const stylesheet = `/* Genia Labs - hoja de estilos de produccion
 * Generada desde el bloque <style> original de la landing v6.
 * Compilar con: npm run build:css
 */

/* Tipografia Inter autoalojada (sin depender de Google Fonts) */
@import '@fontsource/inter/latin-300.css';
@import '@fontsource/inter/latin-400.css';
@import '@fontsource/inter/latin-500.css';
@import '@fontsource/inter/latin-600.css';
@import '@fontsource/inter/latin-700.css';
@import '@fontsource/inter/latin-800.css';

@tailwind base;
@tailwind components;
@tailwind utilities;

/* Estilos propios.
 * Van DESPUES de las utilidades a proposito: en el HTML original este bloque
 * <style> se cargaba despues del CDN de Tailwind, por lo que ganaba la cascada
 * a igual especificidad (p.ej. .tab-content vence a .grid). Moverlos a
 * @layer base cambiaria el diseno. No reordenar. */
${customCss}
`;
fs.writeFileSync('src/styles.css', stylesheet);
console.log('wrote src/styles.css (' + customCss.split('\n').length + ' lines of custom CSS)');

// --- 2. Remove the inline tailwind.config script ---
const cfgMatch = html.match(/  <script>\n    tailwind\.config = \{[\s\S]*?\n  <\/script>\n/);
if (!cfgMatch) throw new Error('inline tailwind.config not found');
html = html.replace(cfgMatch[0], '');

// --- 3. Swap CDN <head> deps for the compiled local stylesheet ---
const cdnBlock = html.match(/  <!-- NOTA PARA PRODUCCI[\s\S]*?lucide@latest"><\/script>\n/);
if (!cdnBlock) throw new Error('CDN block not found');
html = html.replace(
  cdnBlock[0],
  `  <!-- CSS compilado (Tailwind + estilos propios) y tipografia autoalojada -->
  <link rel="preload" href="/assets/fonts/inter-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/assets/fonts/inter-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="stylesheet" href="/assets/css/styles.css" />
`
);

// --- 4. Drop the runtime lucide bootstrap (icons are inlined at build time) ---
html = html.replace(/^\s*lucide\.createIcons\(\);\n/m, '');

// --- 5. og:image (estaba comentado, los previews salian vacios) ---
html = html.replace(
  /  <!-- <meta property="og:image"[^\n]*\n/,
  `  <meta property="og:image" content="https://genialabs.cl/assets/img/og-image.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Genia Labs - Inteligencia artificial aplicada a pymes" />
  <meta property="og:site_name" content="Genia Labs" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Genia Labs | Lleva la inteligencia artificial a tu pyme" />
  <meta name="twitter:description" content="Transformamos tareas manuales y datos dispersos en procesos inteligentes. Adopcion de IA accesible y practica para empresas chilenas." />
  <meta name="twitter:image" content="https://genialabs.cl/assets/img/og-image.png" />
  <meta name="theme-color" content="#0c2a4d" />
  <meta name="robots" content="index, follow" />
`
);

// --- 6. Netlify Forms: el POST a /api/contact no existia y siempre fallaba ---
html = html.replace(
  /<form id="contactForm" class="space-y-5" action="\/api\/contact" method="POST">/,
  `<form id="contactForm" class="space-y-5" action="/gracias" method="POST"
                name="contacto" data-netlify="true" netlify-honeypot="_honey">
                <input type="hidden" name="form-name" value="contacto" />`
);

if (html.includes('/api/contact')) throw new Error('form action not rewritten');
if (!html.includes('data-netlify')) throw new Error('netlify form attrs missing');

// --- 7. El fetch enviaba JSON; Netlify Forms espera urlencoded en la raiz ---
const fetchBlock = html.match(
  /          const response = await fetch\(form\.action, \{\n[\s\S]*?\n          \}\);\n/
);
if (!fetchBlock) throw new Error('fetch block not found');
html = html.replace(
  fetchBlock[0],
  `          // Netlify Forms recibe el envio como urlencoded en la raiz del sitio.
          const response = await fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(formData).toString()
          });
`
);

// El fallback de error ya no debe hablar de "sin endpoint"
html = html.replace(
  /console\.warn\("Fallo en el envio[^"]*"\);/,
  'console.warn("Fallo en el envio del formulario:", error);'
);
html = html.replace(
  /console\.warn\("Fallo en el env[^"]*"\);/,
  'console.warn("Fallo en el envio del formulario:", error);'
);

fs.writeFileSync('src/index.html', html);
console.log('wrote src/index.html');
console.log('remaining CDN refs:', (html.match(/cdn\.tailwindcss|unpkg\.com|fonts\.googleapis|fonts\.gstatic/g) || []).length);
console.log('data-lucide icons to inline:', (html.match(/data-lucide=/g) || []).length);
