# Genia Labs — Landing (genialabs.cl)

Sitio estático de una página. Tailwind se compila en el build; **no hay CDN en producción**.

## Uso rápido

```bash
npm install
npm run build     # genera dist/
npm run serve     # sirve dist/ en http://localhost:4173
```

Para trabajar en el diseño con recompilación automática del CSS:

```bash
npm run dev
```

## Estructura

```
src/            <- FUENTE DE VERDAD. Edita aquí.
  index.html      landing principal
  gracias.html    confirmación del formulario (fallback sin JS)
  404.html        página de error
  styles.css      Tailwind + estilos propios
public/         copiado tal cual a dist/ (robots, sitemap, _headers, imágenes)
scripts/        build: inlinea iconos, copia fuentes, corrige rutas del CSS
dist/           SALIDA DEL BUILD. No editar, no versionar.
archive/        originales históricos (no se publican)
```

### Reglas al editar

- **Edita `src/`, nunca `dist/`.** `dist/` se borra y regenera en cada build.
- En `src/styles.css`, los estilos propios van **después** de `@tailwind utilities` a propósito.
  En el HTML original ese bloque `<style>` se cargaba después del CDN de Tailwind y ganaba la
  cascada a igual especificidad (por ejemplo `.tab-content` vence a `.grid`). Moverlos a
  `@layer base` cambiaría el diseño.
- Los iconos se escriben como `<i data-lucide="nombre">` y el build los convierte a SVG estático.
  No se carga JavaScript de iconos en producción.

## Despliegue

Netlify construye desde el repositorio conectado (`netlify.toml` ya define todo):

- Build command: `npm run build`
- Publish directory: `dist`
- Node: 22

Cada push a `main` publica. Las pull requests generan un *deploy preview*.

## Formulario de contacto

Lo procesa **Netlify Forms**; no hay backend. El formulario se llama `contacto`.

Los envíos quedan en **Netlify → Forms**. Para que lleguen por correo:
**Site configuration → Forms → Form notifications → Add notification → Email notification**,
y poner `alanarri@gmail.com`.

El campo `_honey` es la trampa antispam (declarada con `netlify-honeypot`); debe permanecer oculta
y sin autocompletar.

## Correo del dominio (contacto@genialabs.cl)

Hoy el dominio **no tiene registros MX**, así que cualquier correo a `contacto@genialabs.cl` rebota,
aunque esa dirección aparece en la página. Para activar el reenvío gratuito con ImprovMX:

1. Crear la cuenta en <https://improvmx.com> con el dominio `genialabs.cl` y destino `alanarri@gmail.com`.
2. En **Netlify → Domains → genialabs.cl → DNS records**, agregar:

   | Tipo | Nombre | Valor | Prioridad |
   |---|---|---|---|
   | MX  | `@` | `mx1.improvmx.com` | 10 |
   | MX  | `@` | `mx2.improvmx.com` | 20 |
   | TXT | `@` | `v=spf1 include:spf.improvmx.com ~all` | — |

3. Esperar la propagación (minutos a un par de horas) y verificar en el panel de ImprovMX.

Con esto se **recibe** correo en `contacto@genialabs.cl`. Para **responder** desde esa dirección
hace falta SMTP (plan de pago de ImprovMX, o Google Workspace).

## Pendiente / decisiones conocidas

- **`.tab-content.active { display: block }`** anula las utilidades `grid grid-cols-1 md:grid-cols-2`
  de los paneles de «Casos de uso», por lo que las tarjetas se apilan en vez de ir en dos columnas.
  Se mantuvo el comportamiento original a propósito. Si se quiere el grid real, cambiar esa regla a
  `display: grid` en `src/styles.css`.
- `og-image.png` se genera con `npm run build:og` (solo si se cambia el diseño de la tarjeta social).
