# Genia Labs — Landing (genialabs.cl)

Sitio estático de una página. Tailwind se compila en el build; **no hay CDN ni dependencias
de terceros en tiempo de ejecución**.

- **Producción:** <https://genialabs.cl>
- **Repositorio:** <https://github.com/ArriagadaInc/genialabs-landing> (público)
- **Bitácora de cambios:** [`docs/BITACORA.md`](docs/BITACORA.md)

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

## Plataformas y servicios

Todo lo que el proyecto necesita para funcionar, y quién es dueño de qué.

| Servicio | Para qué | Plan | Datos clave |
|---|---|---|---|
| **GitHub** | Código y control de versiones | Gratis | `ArriagadaInc/genialabs-landing`, **público** |
| **Netlify — Hosting** | Build y publicación | Gratis | Proyecto `astonishing-kelpie-353a5c` |
| **Netlify — DNS** | Zona DNS del dominio | Gratis | Nameservers `dns1–4.p09.nsone.net` |
| **Netlify — Forms** | Recepción del formulario | Gratis (100 envíos/mes) | Formulario `contacto` |
| **ImprovMX** | Reenvío de correo del dominio | Gratis (1 dominio, 25 alias, 500/día) | `contacto@genialabs.cl` → `alanarri@gmail.com` |
| **NIC Chile** | Registro del dominio | — | `genialabs.cl` |

> **El repositorio es público a propósito.** El plan gratuito de Netlify permite un solo
> contribuidor Git en repos privados, y eso hacía fallar los builds. Ver la bitácora.

### Dependencias de build

| Paquete | Versión | Rol |
|---|---|---|
| `tailwindcss` | 3.4.x | Compila el CSS. **v3, no v4**: la config usa la API de v3. |
| `lucide` | 1.35.0 (fija) | Fuente de los iconos. Se inlinean en el build; no llega al navegador. |
| `@fontsource/inter` | 5.x | Tipografía Inter autoalojada (pesos 300–800, latin). |
| `sharp` | 0.35.x | Solo para regenerar `og-image.png` con `npm run build:og`. |

## Estructura

```
src/            <- FUENTE DE VERDAD. Edita aquí.
  index.html      landing principal
  gracias.html    confirmación del formulario (fallback sin JS)
  404.html        página de error
  styles.css      Tailwind + estilos propios
public/         copiado tal cual a dist/ (robots, sitemap, _headers, imágenes)
scripts/        build: inlinea iconos, copia fuentes, hashea el CSS
docs/           bitácora del proyecto
dist/           SALIDA DEL BUILD. No editar, no versionar.
archive/        originales históricos (no se publican)
```

### Reglas al editar

- **Edita `src/`, nunca `dist/`.** `dist/` se borra y regenera en cada build.
- En `src/styles.css`, los estilos propios van **después** de `@tailwind utilities` a propósito.
  En el HTML original ese bloque `<style>` se cargaba después del CDN de Tailwind y ganaba la
  cascada a igual especificidad. Moverlos a `@layer base` cambiaría el diseño.
- Los iconos se escriben como `<i data-lucide="nombre">` y el build los convierte a SVG estático.
  No se carga JavaScript de iconos en producción.
- El CSS se publica como `styles.<hash>.css`. El hash sale del contenido, así que al
  cambiar los estilos cambia la URL y el caché de un año es seguro. **No le pongas un
  nombre fijo con caché largo**: los visitantes que ya tuvieran el archivo se quedarían
  con la versión vieja hasta que expirara.

## Despliegue

Netlify construye desde el repositorio conectado (`netlify.toml` ya define todo):

- Build command: `npm run build`
- Publish directory: `dist`
- Node: 22

Cada push a `main` publica en producción. Las pull requests generan un *deploy preview*
con URL propia; **cerrar y reabrir un PR no dispara un build nuevo**, hace falta un commit.

### Notificaciones configuradas

- **Envío de formulario** → correo a `alanarri@gmail.com`.
- Conviene añadir también **Deploy failed** → correo. Si un cambio rompe la compilación,
  Netlify deja publicada la última versión buena y no avisa por defecto: parecería que el
  cambio se publicó cuando no fue así.

## Formulario de contacto

Lo procesa **Netlify Forms**; no hay backend. El formulario se llama `contacto` y envía
`application/x-www-form-urlencoded` a la raíz del sitio.

Los envíos quedan en **Netlify → Forms**. El campo `_honey` es la trampa antispam
(declarada con `netlify-honeypot`); debe permanecer oculta y sin autocompletar.

> **Ojo:** la detección de formularios de Netlify viene **desactivada** por defecto en
> proyectos nuevos. Si un formulario no aparece en el panel: *Formularios → Enable form
> detection*, y **volver a desplegar** (activar el interruptor no re-escanea deploys previos).

## Correo del dominio

`contacto@genialabs.cl` se reenvía a `alanarri@gmail.com` mediante **ImprovMX** (plan gratuito).
Verificado funcionando el 2026-08-28.

Registros en **Netlify → Domains → genialabs.cl → DNS records** (el nombre `@` apunta a la raíz):

| Tipo | Nombre | Valor | Prioridad |
|---|---|---|---|
| MX  | `@` | `mx1.improvmx.com` | 10 |
| MX  | `@` | `mx2.improvmx.com` | 20 |
| TXT | `@` | `v=spf1 include:spf.improvmx.com ~all` | — |

**Nunca agregues un segundo registro SPF**: dos registros `v=spf1` rompen la validación y el
correo empieza a caer en spam. Si algún día se suma otro servicio que envíe correo, se combinan
en un único registro con varios `include:`.

Con esto se **recibe**. Para **responder** desde `contacto@genialabs.cl` hace falta SMTP
(ImprovMX Premium ~US$9/mes, o Google Workspace ~US$7/mes). Hoy las respuestas salen desde
el Gmail personal.

## Pendientes

Ordenados por impacto. El detalle y la evidencia están en [`docs/BITACORA.md`](docs/BITACORA.md).

**Conversión** — es donde más se puede ganar, y es contenido, no código:

- **No hay prueba social verificable.** El caso destacado es anónimo («una empresa chilena de
  asesoría previsional») y la cita de cierre no tiene autor, así que parece autoescrita.
- **No hay un solo número en la página.** Todo es cualitativo («reduce significativamente»).
- **La sección «Inversión accesible» no da ningún precio ni plazo**, que es justo el miedo que
  busca desactivar.
- **Seis textos de CTA distintos** para la misma acción, ninguno dice qué pasa después ni que
  no tiene costo.
- **No se ve quién está detrás**: sin nombres, fotos ni trayectoria.
- El único caso de éxito admite que la IA es la «próxima evolución» y aún no está implementada.

**Técnico:**

- 4 saltos de jerarquía de encabezados (h2 → h4) que conviene corregir por SEO y accesibilidad.
- Falta un registro **DMARC**. Hay SPF, pero DMARC es lo que impide que suplanten el dominio.
- Verificar que el LinkedIn del pie exista (`linkedin.com/company/genialabs`): responde 200,
  pero LinkedIn devuelve 200 también para páginas inexistentes.
- `og-image.png` se regenera con `npm run build:og` (solo si cambia el diseño de la tarjeta social).
