# Bitácora del proyecto

Registro de qué se hizo, **por qué**, y cómo se verificó. El objetivo es que dentro de seis
meses se entienda el motivo de cada decisión sin tener que reconstruirla.

Convención: cada entrada indica el problema, el cambio y la evidencia de que quedó resuelto.

---

## 2026-08-28 — Puesta en producción de la landing v6

Punto de partida: `genialabs.cl` servía una landing antigua (`index.html`, 20 KB) y existía un
diseño nuevo sin publicar (`landing_page_genia_labs_v6_produccion.html`, 96 KB). El encargo fue
revisar el v6 y prepararlo para reemplazar lo publicado.

Ambos archivos se conservan en [`archive/`](../archive/).

### Revisión previa

El v6 llegó en buen estado: contenido real, los 6 anclajes internos resolvían, accesibilidad
cuidada (roles ARIA, navegación por teclado, `prefers-reduced-motion`), sin errores de consola
y sin imágenes externas. Pero tenía cuatro problemas que impedían publicarlo.

### 1. El formulario nunca funcionó

**Problema.** Hacía `POST` con JSON a `/api/contact`, un endpoint inexistente. El 100 % de los
envíos fallaba y caía al modal de error, que a su vez remitía a un correo que tampoco existía.

**Cambio.** Se migró a **Netlify Forms**: atributos `data-netlify` y `netlify-honeypot`, campo
oculto `form-name`, y el `fetch` pasó de JSON a `application/x-www-form-urlencoded` a la raíz.

**Verificación.** Interceptando el `fetch` se confirmó el payload exacto, con acentos bien
codificados y el honeypot incluido.

### 2. Tailwind y Lucide por CDN

**Problema.** El propio código advertía «reemplazar CDN por compilación». Se descargaban ~400 KB
de JS que compilaban CSS en el navegador (parpadeo inicial), más 412 KB de Lucide desde
`lucide@latest`, **sin versión fija**: una release nueva podía romper el sitio sin aviso.

**Cambio.**

- Tailwind compilado a CSS estático (~33 KB). Config migrada del bloque inline a `tailwind.config.js`.
- Los iconos (78 en ese momento) se pre-renderizan a SVG durante el build; la librería ya no
  llega al navegador. Fue seguro porque `createIcons()` se llamaba una sola vez y no había
  inyección dinámica en el código.
- Inter autoalojada con `@fontsource`; se eliminó Google Fonts.

**Resultado.** Cero dependencias de terceros en tiempo de ejecución. FCP 856 ms, 18 KB transferidos.

> **Decisión de cascada, importante.** En `src/styles.css` los estilos propios van **después**
> de `@tailwind utilities`. En el original ese `<style>` se cargaba tras el CDN y ganaba la
> cascada a igual especificidad. Moverlos a `@layer base` habría cambiado el diseño en silencio.

### 3. SEO y operación

`og:image` estaba comentada, así que los enlaces compartidos salían vacíos. Se generó una tarjeta
1200×630 (`npm run build:og`) y se añadieron Twitter Card, `theme-color`, `robots.txt`,
`sitemap.xml`, página 404, `/gracias` y cabeceras de seguridad.

### 4. Estructura

`src/` pasó a ser la fuente de verdad y `dist/` la salida del build (no versionada). El script de
migración quedó archivado como de un solo uso: volver a ejecutarlo sobrescribiría `src/`.

---

## 2026-08-28 — Bug de maquetación en «Casos de uso»

**Problema.** La segunda tarjeta **se desbordaba 102 px** del contenedor y se superponía al texto
siguiente. Dos causas combinadas:

1. `.tab-content.active { display: block }` anulaba las utilidades `grid grid-cols-1 md:grid-cols-2`,
   así que las tarjetas se apilaban a ancho completo (426 px en vez de 201 px).
2. El contenedor era `relative min-h-[300px]` con los paneles en `absolute inset-0`. Al estar fuera
   del flujo, **el contenedor no podía crecer**: quedaba fijo en 300 px y lo sobrante se salía
   (tiene `overflow: visible`).

Además, dos pestañas tenían una sola tarjeta y dejaban ~125 px de vacío.

**Cambio.** `display: grid`; se quitó `absolute inset-0` para que el contenedor crezca con su
contenido; se quitó `min-h-[300px]`, que ya solo dejaba hueco muerto. Se redactó una segunda
tarjeta para «Atención de Clientes» y «Operaciones», basadas en capacidades que la página ya ofrecía.

**Verificación.** Las 4 pestañas con 2 tarjetas en 2 columnas, desborde 0 y sin espacio muerto.
En móvil apilan a 1 columna y el contenedor crece a 454 px en vez de recortar.

> Este bug venía del diseño original y se documentó como «comportamiento conocido» al migrar,
> para no alterar el diseño aprobado sin permiso. Se corrigió después, ya con decisión explícita.

---

## 2026-08-28 — El caché impedía ver los cambios de estilo

**Problema, y fue un error introducido en la migración.** `public/_headers` cacheaba
`/assets/css/*` por 7 días, pero el archivo se publicaba siempre como `styles.css`, **sin hash de
contenido**. Cualquier visitante que ya hubiera entrado conservaba el CSS viejo hasta que expirara:
el arreglo anterior era invisible para ellos. Encima, el comentario del archivo afirmaba en falso
que los assets ya llevaban hash.

Se detectó al verificar en producción: el navegador aplicaba `display: block` mientras el servidor
ya servía `display: grid`.

**Cambio.** `postbuild.mjs` publica `styles.<hash>.css` (sha256 del contenido) y reescribe las
referencias de las 3 páginas. **El build falla** si queda alguna referencia sin hashear o apuntando
a un archivo inexistente. El CSS pasó a un año `immutable` (ya seguro); las imágenes bajaron a 1 día
porque no llevan hash.

**Verificación.** Recargando la misma pestaña que tenía el CSS viejo —sin limpiar caché— tomó el
archivo nuevo y aplicó `display: grid`.

**Lección.** Caché largo y nombre fijo son incompatibles. Cualquier asset con `max-age` alto
necesita hash en el nombre.

---

## 2026-08-28 — Despliegue y conexión de plataformas

### Netlify

El sitio se conectó al repositorio de GitHub; cada push a `main` publica. Al conectar hubo
dos tropiezos que conviene recordar:

- **La detección de formularios viene desactivada** en proyectos nuevos. Hay que activarla en
  *Formularios → Enable form detection* y **volver a desplegar**: el interruptor no re-escanea
  deploys anteriores.
- **Los deploy previews fallaban** con `unrecognized Git contributor`. El plan gratuito permite
  **un solo contribuidor Git en repos privados**. Se descartaron dos hipótesis antes de dar con la
  causa: el trailer `Co-Authored-By` (se quitó y siguió fallando) y la atribución de GitHub (era
  correcta). **Se resolvió haciendo público el repositorio**, que da contribuidores ilimitados.
  Antes se auditó el historial: sin secretos, sin `.env`, sin credenciales.

También se descubrió que **cerrar y reabrir un PR no dispara un build**; hace falta un commit nuevo.

### Correo del dominio

**Problema.** `contacto@genialabs.cl` aparecía en 3 lugares del sitio —incluido el mensaje de error
del formulario, que remitía ahí si algo fallaba— pero el dominio **no tenía ningún registro MX**:
todo correo rebotaba en silencio. La ruta de rescate llevaba a otro callejón sin salida.

**Cambio.** Reenvío gratuito con **ImprovMX** (MX + SPF en Netlify DNS). Se eligió sobre Cloudflare
Email Routing porque **no requiere mover los nameservers**: Cloudflare habría obligado a migrar toda
la zona DNS fuera de Netlify, con riesgo de tumbar el sitio, sin ninguna ventaja práctica a esta escala.

**Verificación.** MX y SPF propagados y visibles desde los resolvers de Google y Cloudflare; un
único registro SPF; sin registro espurio en `@.genialabs.cl`; el registro A del sitio intacto.
Correo de prueba recibido correctamente.

> El plan gratuito de ImprovMX es permanente (1 dominio, 25 alias, 500 reenvíos/día). Lo que se
> paga es **enviar** como `contacto@`, no recibir — es fácil confundirlo con un muro de pago
> durante el registro.

---

## Estado actual

| Área | Estado |
|---|---|
| Landing v6 en producción | ✅ |
| Dependencias de terceros en runtime | ✅ ninguna |
| Formulario de contacto | ✅ con aviso por correo |
| Reenvío `contacto@genialabs.cl` | ✅ verificado |
| Cabeceras de seguridad y caché | ✅ |
| Invalidación de caché del CSS | ✅ por hash de contenido |
| Notificación de deploy fallido | ⬜ recomendada |
| DMARC | ⬜ pendiente |
| Prueba social y precios en la página | ⬜ pendiente (mayor impacto comercial) |

Los pendientes con su justificación están en el [README](../README.md#pendientes).
