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

## 2026-08-28 — Jerarquía de encabezados

**Problema.** La página saltaba de `h2` a `h4` en cuatro secciones (Casos de uso, Inversión,
Proyecto real y Experiencia), y había un `h5` suelto tras un `h3` en la maqueta del panel de
oportunidades. Los lectores de pantalla usan esa jerarquía para navegar el documento y los
buscadores para entender su estructura; un salto de nivel rompe ambas cosas.

**Cambio.** 19 `h4` y 1 `h5` pasan a `h3`. Puramente semántico: cada encabezado ya llevaba sus
clases de Tailwind explícitas y el preflight neutraliza los tamaños por defecto.

**Verificación.** Comparando el HTML compilado contra el publicado: 43 encabezados en ambos,
**0 diferencias de clases, 0 de texto, 20 niveles cambiados**. Las 3 páginas quedan con un único
`h1` y sin saltos.

**Falsa alarma descartada.** Se investigaron unos encabezados repetidos en «Cómo implementamos»:
resultaron ser un patrón responsive intencional (una copia `hidden md:block` para escritorio y otra
`md:hidden`, más corta, para móvil). Solo una es visible a la vez, así que no afecta a lectores de
pantalla. No se tocó.

**Hallazgo colateral.** El enlace de LinkedIn del pie **está roto**: `www.linkedin.com/company/genialabs`
devuelve 404 (control con una empresa real: 200). Sin resolver todavía — requiere decidir entre crear
la página o quitar el enlace. Anotado en [`PROXIMOS-PASOS.md`](PROXIMOS-PASOS.md).

---

## 2026-08-30 — Rediseño: identidad propia para la landing

**Problema.** La v6 estaba técnicamente sana pero era visualmente anónima: Inter, degradado
azul→violeta en el titular, cabecera *glassmorphic*, tarjetas redondeadas e iconos de
destellos. Es el aspecto por defecto de cualquier landing de IA de los últimos años; nada en
la página venía de **este** negocio. Para una pyme que evalúa a un proveedor desconocido, un
sitio que se parece a otros mil no ayuda a distinguirlo.

**Encargo.** Aplicar la *skill* `frontend-design`: darle a la página una identidad que no se
pueda confundir con otra, sin tocar lo que ya funcionaba.

### La idea

Lo que Genia Labs vende es una transformación concreta: llega un PDF por correo, una consulta
por WhatsApp, una fila a medio escribir en una planilla, y queda un proceso con estado,
responsable e historial. El diseño ahora **muestra** esa transformación en vez de describirla.

- **El color significa algo.** `kraft` (#E3D5BC) es el material manual, lo que llega. `verde`
  (#0C6B4F) es el estado sistematizado, lo que queda, y además es el color de acción — no el
  azul-violeta universal de la IA. `ambar` queda para lo pendiente o por vencer.
- **El ancho de la tipografía significa algo.** Archivo es variable en el eje `wdth`. El h1
  dice *«Llega desordenado.»* al 125 % de ancho, suelto y gris, y *«Queda registrado.»* al
  78 %, apretado y en tinta. La tipografía ejecuta la frase.
- **Tipografía de Omnibus-Type** (Archivo, Chivo, Chivo Mono), fundición de Buenos Aires.
  Tipos latinoamericanos para una empresa chilena, y buenas letras por mérito propio.

**Pieza central: la matriz `lo que llega / lo que hace el sistema / lo que queda`.** Tres
casos reales (un documento, una oportunidad, una consulta) en tres columnas, con los
artefactos en kraft a la izquierda y los registros con estado a la derecha. Reemplaza la
microdemostración animada, que repetía el mismo contenido en un acordeón de 4 pasos que se
reiniciaba solo cada vez que la pestaña volvía a ser visible.

La marca `IA` aparece solo en el paso donde de verdad interviene un modelo. Es más honesto y
además explica el negocio: alrededor van reglas, validaciones e integraciones.

### Tres bugs de cascada, todos el mismo bug

`src/styles.css` carga los estilos propios **después** de las utilidades de Tailwind (decisión
heredada y documentada). La consecuencia es que una clase propia que declare `display` o
`color` le gana a la utilidad equivalente a igual especificidad. Aparecieron tres veces:

| Clase propia | Utilidad anulada | Síntoma |
|---|---|---|
| `.display` (color) | `text-kraft-600` | Los números 01–04 salían en tinta, no en kraft |
| `.boton` (display) | `hidden md:inline-flex` | El CTA se veía en móvil y tapaba el logotipo |
| `.tab-content` (display) | `grid` | El bug histórico de «Casos de uso», ya corregido antes |

**Cambio.** Las clases `.display*` dejaron de declarar `color` y heredan del contexto; se
agregó `.boton.hidden { display: none }` y sus hermanas. Queda anotado en el README como regla
de edición: si agregas un componente que fije `display`, agrégalo a esa lista.

### Accesibilidad

Se midió el contraste de cada par sobre los colores computados, no sobre los de diseño. Dos no
pasaban AA para texto pequeño y se corrigieron:

| Elemento | Antes | Ahora |
|---|---|---|
| Rótulo sobre kraft | 3.11:1 | **5.23:1** (#63522D) |
| Estado «en espera» | 4.05:1 | **5.26:1** (#98490C) |

El resto ya pasaba (cuerpo 10.65:1, botón 6.5:1, papel sobre tinta 15.72:1). El foco es un
contorno verde de 2 px con 2 px de separación, y pasa a papel sobre fondo oscuro. La secuencia
de entrada de la matriz solo oculta celdas si hay JavaScript (clase `.js` en `<html>`, puesta
antes del primer pintado): sin JS la página se ve completa. `prefers-reduced-motion` la anula.

### Contenido

- **Un solo CTA.** Había **seis** textos distintos para la misma acción. Ahora es
  «Cuéntanos qué proceso te quita tiempo», con la expectativa al lado: «Respondemos en menos
  de 24 horas hábiles». Era el punto 5 de `PROXIMOS-PASOS.md`.
- **El proyecto real se presenta como lo que es.** Antes decía que la IA era la «próxima
  evolución», o sea: la única prueba mostraba un caso sin IA. Ahora se titula «Así preparamos
  el terreno», que es honesto y deja de competir con el resto de la página.
- **Se quitó la cita sin autor** del cierre; era autoescrita y se leía como tal. En su lugar va
  la misma afirmación en voz de Genia Labs, sin comillas.
- **Se eliminó la sección «Urgencia»** («tus competidores también están aprendiendo IA»):
  repetía el argumento y agregaba un sexto CTA.
- **Se quitaron dos enlaces rotos del pie**: LinkedIn (404, verificado el 2026-08-28) y
  Política de Privacidad, que apuntaba a `/privacidad`, una página que no existe. Un enlace
  muerto resta credibilidad justo donde la página es más débil. Vuelven cuando existan.

### Verificación

Compilación limpia; 34 iconos inlineados (antes 78). El navegador pide **5 archivos**: 4
fuentes y 1 CSS. Cero dependencias de terceros en runtime, como antes.

| | Antes | Ahora |
|---|---|---|
| CSS | ~33 KB | **24.2 KB** |
| Fuentes | 145 KB (6 pesos de Inter) | **133 KB** (3 familias, una variable) |

Se comprobó: sin desborde horizontal a 375 px ni a 1440; el panel de pestañas no se desborda
de su contenedor; las pestañas responden a clic y a flechas con un solo panel visible; el menú
móvil abre y cierra con `aria-expanded` correcto; los enlaces «Hablemos de esto» dejan elegida
la opción correspondiente del formulario. Los atributos de Netlify Forms (`data-netlify`,
`netlify-honeypot`, `form-name`, y los ocho campos) están intactos en `dist/`.

> **Pendiente que este rediseño no resuelve.** La sección «Inversión» **sigue sin una cifra**,
> porque no la hay: inventarla no era opción. El bloque donde va está marcado con un comentario
> en `src/index.html`. Lo mismo con la prueba social y los números del punto 1 y 2 de
> `PROXIMOS-PASOS.md`: son insumos del negocio, no diseño.

---

## 2026-08-30 — Segunda pasada: la portada no vendía

**Problema, y es una crítica justa.** El rediseño de la mañana quedó distinto y honesto, pero
**no comercial**. Quien entraba no entendía en tres segundos qué se vende ni por qué le
conviene. El titular anterior —*«Llega desordenado. Queda registrado.»*— describía el
**mecanismo**, no el **beneficio**, y el beneficio es lo que compra una pyme.

**Encargo.** Que el gancho esté arriba: menos horas hombre, menos costos, a un precio que se
pueda pagar, y que la competencia ya partió.

### Las dos anclas que faltaban

Sin una cifra, «puede ser más accesible de lo que imaginas» es la misma promesa vacía que la
bitácora ya venía señalando. Se decidieron dos compromisos concretos:

| Ancla | Valor | Dónde aparece |
|---|---|---|
| Plazo | **6 semanas** para el primer proceso andando | Portada, Inversión, tarjeta social |
| Oferta | **30 minutos sin costo**, «te decimos si hay caso aunque no trabajemos juntos» | Todos los CTA |

> **Ojo: son promesas públicas.** El sitio ahora compromete un plazo y una reunión gratis.
> Si seis semanas deja de ser realista para el tipo de proyecto que llegue, hay que cambiar el
> número en la página, no estirarlo con el cliente.

### Cambios

- **Portada nueva.** Distintivo ámbar «Tu competencia ya está usando IA»; titular
  **«Menos horas hombre. Menos costos.»**; bajada que nombra las tareas concretas (digitar
  facturas, perseguir cotizaciones, buscar información) y cierra con «a un costo que una pyme
  sí puede pagar»; y una fila con las tres anclas —6 semanas / no hace falta equipo técnico /
  primera reunión sin costo— **antes** del botón: primero la razón para hacer clic.
- **Vuelve la sección de urgencia**, que la pasada anterior había cortado. Ahora va en claro,
  con la regla ámbar de «por vencer», y **justo antes de Inversión**: primero el costo de no
  hacer nada, después el precio de hacerlo. Encadenar dos secciones oscuras se veía mal, por
  eso no está en tinta.
- **CTA único y con oferta:** «Agenda 30 minutos sin costo» reemplaza a «Cuéntanos qué proceso
  te quita tiempo» en portada, urgencia, inversión y cabecera.
- **Inversión** pasa a titularse «Un proceso. Seis semanas. Alcance cerrado.» y muestra las
  anclas en grande.
- **La matriz se quedó, pero ahora explica un beneficio**: se tituló «El trabajo manual que tu
  equipo deja de hacer». Sigue siendo la demostración de *cómo*, después de la promesa de *qué*.
- **Título, meta y tarjeta social** reescritos con el mismo gancho, para que viaje en buscadores
  y en WhatsApp.

### Verificación

Contraste medido sobre estilos computados en los ocho elementos nuevos: entre **5.26:1 y
15.72:1**, todos sobre AA. Sin desborde horizontal a 375 ni a 839 px. Consola limpia en carga
nueva. Formulario de Netlify intacto.

> **Sigue pendiente el precio.** Hay ancla de plazo, no de monto. Cuando exista un «desde $X»,
> el hueco está marcado en `src/index.html`.

---

## 2026-08-31 — Imagen de marca antes del formulario

Llegó un render del letrero de neón «GeniaLabs» (2752×1536 PNG, 6.7 MB) para sumarlo a la
landing.

**Problema de color.** El neón venía en **cian `#7FD8E8`**, que es justo el azul de la paleta
*anterior*. Puesto al lado del verde actual se leía como una imagen de otra empresa.

**Cambio.** Se rotó el tono **−44° con saturación 0.95**, lo que lleva el muro a la familia
verde del sitio y **conserva el brillo del neón**. Se descartó un duotono plano (tinta → verde):
apagaba el resplandor y hacía desaparecer las líneas de red del fondo.

Reproducible con sharp, a partir del PNG original:

```js
sharp(origen).flatten({ background: '#0A1512' }).modulate({ hue: -44, saturation: 0.95 })
```

**Dónde va y por qué.** A pantalla completa **justo antes del formulario**: da una pausa visual
después de una página densa y deja la última impresión de marca antes de pedir los datos, que
entra directo en «Agenda 30 minutos sin costo».

Sin texto encima a propósito: el letrero ya dice el nombre y una frase sobre el resplandor
pelearía con la única imagen del sitio. `alt` vacío porque es decorativa — la cabecera y el pie
ya anuncian el nombre, y repetirlo solo estorba a un lector de pantalla.

**Peso.** WebP en dos anchos con `srcset`: **31 KB** (1600w) y **13 KB** (900w). El original de
6.7 MB **no se versiona**; queda esta receta para regenerarla. Es `loading="lazy"` con
`width`/`height` declarados, así que no aporta nada al primer pintado ni desplaza la maqueta.

**Verificado:** a 375 px carga la variante de 900w y el letrero sigue legible; sin desborde
horizontal; el `_headers` ya cachea `/assets/img/*` un día.

---

## 2026-09-16 — Enfoque en un nicho y en la Ley 21.719

**Decisión de negocio.** Genia Labs deja de venderle «IA» a cualquier pyme y se enfoca en un
solo segmento: **empresas de servicios B2B que reciben leads por formularios, campañas, correo o
WhatsApp y los gestionan en planillas** (asesorías, corredoras, inmobiliarias, consultoras,
estudios jurídicos). La Ley 21.719, que rige desde el **1 de diciembre de 2026**, da la urgencia;
el retorno comercial justifica la inversión. No se vende cumplimiento legal: se vende una
operación comercial rápida y trazable.

Antes de esto se revisó la versión publicada en genialabs.cl (todavía la v6) y un estudio de
nichos. Del estudio **no** se usaron sus plantillas con métricas no medidas («hemos medido que…»,
«hasta 15 horas a la semana»), la terminología «ARCOP», la cuenta del subsidio Kit Digital ni la
prospección con correos extraídos de LinkedIn.

### Punto 1 — Ordenar la casa

Un sitio que vende datos trazables no puede recibir datos personales sin decir qué hace con ellos.

- **Nueva página `/privacidad`.** Describe lo que el sitio hace hoy de verdad: Netlify recibe el
  formulario, ImprovMX reenvía, la casilla es de Google, sin cookies ni analítica. Borrador:
  **falta razón social y RUT, y revisión legal** (comentario al inicio del archivo).
- **Aviso en el formulario**, bajo el botón, con enlace a la política. Sin casilla de
  consentimiento: el fundamento es la propia solicitud y una casilla solo resta conversión.
- Enlace a la política en el pie; `/privacidad` agregada al `sitemap.xml`.
- **DMARC queda pendiente**: es un registro DNS en Netlify, no código (ver `PROXIMOS-PASOS.md`).

### Punto 2 — La landing enfocada

- **Portada:** «Ningún lead sin responder. Ningún dato sin rastro.», para «empresas de servicios
  que venden con leads», con cuenta regresiva a la ley (días calendario en hora de Chile; sin JS
  queda «rige desde el 1 de diciembre de 2026»).
- **Sección «La ley»**, abierta con la pregunta que el dueño se responde solo: *«Si un cliente te
  pide borrar sus datos, ¿puedes encontrar todas las copias?»*. La multa va como tercer dato, no
  como titular.
- **«Para quién»**: rubros con nombre y cinco síntomas.
- **Matriz** con los tres momentos del nicho: llega un lead, un cliente pide borrar sus datos, la
  IA sugiere y decide una persona.
- **Calculadora** de ventas que se escapan y horas manuales. Es la forma de hablar de plata sin
  inventar resultados: los números los pone el visitante, y se calcula en el navegador sin enviar
  nada.
- **Precios publicados:** diagnóstico $300.000–500.000 + IVA (descontable), implementación desde
  $2.200.000 + IVA, operación desde $250.000/mes + IVA; IA como segunda capa, cotizada aparte;
  aclaración de que el diagnóstico no es asesoría legal.
- **Caso real** reencuadrado como «Antes / Ahora / Siguiente etapa», solo con hechos del proyecto.
- Se eliminaron las secciones genéricas (soluciones de documentos, casos por área, método,
  experiencia) y las pestañas con su JS y CSS.
- Título, meta, formulario (nuevas opciones de `goal`) y tarjeta social actualizados.

> **Regla para los números** (comentario al inicio de `index.html`): precios y plazos vienen de la
> oferta; fecha, plazo y multas, de la ley; la calculadora usa los números del visitante; matriz y
> panel son maquetas. **No se publican resultados de clientes que no estén medidos.** El hueco para
> la métrica del caso real está marcado en `#proyecto`.

### Bug corregido: el botón de la cabecera no se veía en escritorio

La corrección anterior (`.boton.hidden { display: none }`) le ganaba también a `md:inline-flex`
por especificidad, así que el CTA de la cabecera desaparecía en **todos** los tamaños, no solo en
móvil. No se detectó porque se revisó a 375 px y se dio por bueno. Se eliminó la regla y la
visibilidad pasó a un contenedor (`<div class="hidden md:block">`). Verificado a 375, 820 y 1280 px.

### Verificación

Compilación limpia (4 páginas). Sin errores de consola ni desborde horizontal. Cuenta regresiva:
«rige en 76 días». Calculadora comprobada con valores iniciales, otros valores, campo vacío (da
$0) y porcentaje sobre 100 (se limita). Los atajos de cada plan preseleccionan una opción que
existe en el formulario. Contraste de los elementos nuevos entre 5,66:1 y 10,65:1.

---

## 2026-09-16 — Portada en vivo

**Pedido.** La portada del nicho quedó correcta pero plana: «algo más marketero, moderno, de
impacto». Además, el titular había perdido la palabra «inteligencia artificial».

### Qué cambió

- **Titular:** *«Tus leads no esperan. Tu competencia, tampoco.»* Arriba, un antetítulo con la
  IA de vuelta: «Inteligencia artificial para equipos comerciales». Bajo «competencia» se dibuja
  un subrayado ámbar al cargar.
- **Portada oscura con una demo en vivo** a la derecha, una «bandeja comercial» que *muestra* la
  promesa: entran mensajes por WhatsApp, formulario, correo y campaña; la IA los clasifica
  (barrido verde y etiquetas de intención y prioridad) y quedan asignados con su tiempo. Uno de
  los mensajes es una **solicitud de supresión**, así que la ley aparece en la demo sin sermones.
- La frase «Ningún lead sin responder. Ningún dato sin rastro.» pasó a titular la matriz.
- «La ley» pasó a fondo claro con regla ámbar, para no encadenar dos secciones oscuras.
- El botón principal sobre fondo oscuro usa el verde claro (`.boton-vivo`): el verde de marca
  apenas se separa del tinta.

### Honestidad de la demo

Es una simulación y lo dice («Demo en vivo», «Atendidos **en esta demo**»). Los nombres,
mensajes y tiempos son ficticios y fijos, y el contador solo suma lo que la demo procesa. No
afirma ningún resultado de cliente.

### Accesibilidad y rendimiento

- **Botón Pausar/Reanudar** (`aria-pressed`): es movimiento que dura más de 5 s (WCAG 2.2.2).
- Se detiene sola fuera de pantalla y con la pestaña oculta.
- Con `prefers-reduced-motion` no arranca, y sin JavaScript queda el estado estático del HTML,
  que ya se lee completo.
- La zona animada es `aria-hidden` y tiene una descripción equivalente para lectores de pantalla.
- Contraste de los pares nuevos entre 4,66:1 (cifra grande ámbar, exige 3:1) y 9,68:1.

### Verificación

Titular en 2 líneas a 1280 px (el tamaño se calculó midiendo el ancho real: a 72 px la segunda
línea necesitaba 742 px y la columna tenía 550). Demo comprobada en ciclo, a mitad de una
clasificación, con pausa (el contador no avanza en 5 s y la tarjeta queda completa) y al reanudar.
Sin desborde a 375 px. Consola limpia.

---

## 2026-09-16 — Que se entienda qué vendemos

**Problema.** «Miro la web y no sé qué vendemos.» Tenía razón: *«Tus leads no esperan. Tu
competencia, tampoco.»* era un eslogan, no una oferta. La demo se llamaba «Bandeja comercial»
(abstracto) y la segunda sección hablaba de la ley en vez del producto.

**Regla aplicada:** en 5 segundos se entiende **qué es, qué hace por ti y cuánto cuesta**.

### Cambios

- **El producto tiene nombre: Sistema de Ventas con IA.** Se usa igual en portada, demo, «Qué
  hace», precios, formulario, meta y tarjeta social.
- **Portada:** antetítulo «Sistema de ventas con inteligencia artificial»; titular **«Vende más
  con IA, sin contratar más gente.»**; bajada «Lo instalamos en tu empresa en 6 semanas…»; cuatro
  viñetas con lo que hace; CTA; **«Desde $2.200.000 + IVA»** a la vista; la cuenta regresiva de
  la ley pasa a una línea chica bajo el precio.
- **La demo es el producto:** «Tu sistema de ventas con IA», «Lead nuevo», «Respondidos y asignados».
- **Nueva sección «Qué hace»** justo después de la portada: canales que conecta y seis capacidades
  escritas como resultado («Respondes al instante», «La IA te dice a quién llamar primero»…).
- La ley pasa a segundo lugar como **«Por qué ahora»**. Navegación: Qué hace · Por qué ahora ·
  Calculadora · Precios · Caso real.
- **Precios:** el paso 2 se llama «Sistema de Ventas con IA» y lista exactamente lo de «Qué hace».

### ⚠️ Cambio de alcance de la oferta — confirmar

Para que la portada venda IA sin trampa, **la IA básica pasa a estar incluida** en la
implementación (clasificar, priorizar, resumir y sugerir el siguiente paso), y se suma
**respuesta automática al instante**. Antes la IA se cotizaba aparte. Ahora lo que va aparte es
la «IA avanzada» (asistente interno, respuestas redactadas por IA, análisis de conversaciones,
reportes). Se agregó la nota de que **WhatsApp usa la API oficial de Meta, que cobra aparte**.
Si el precio de $2.200.000 no cubre ese alcance, hay que ajustar el precio o el alcance.

### Verificación

Titular en 2 líneas a 1280 px; CTA y precio visibles sin scroll a 1280×900 y el CTA en la primera
pantalla a 375 px. Los seis anclajes de navegación existen. Sin desborde, consola limpia.

---

## 2026-09-16 — Vuelve «Lleva la inteligencia artificial a tu pyme»

**Decisión.** «Vende más con IA» no convenció. El titular vuelve a ser la frase de la marca,
**«Lleva la inteligencia artificial a tu pyme.»**, y el foco se amplía de «servicios B2B con
leads» a **pymes en general**, con cinco dolores explícitos: **horas hombre, costos, papeleo,
riesgo operacional y Ley 21.719** (esta última bien destacada).

### Cambios

- **Portada:** titular fijo con «inteligencia artificial» en verde, y debajo una **frase rotativa**:
  *«Y olvídate del papeleo / de las horas hombre perdidas / de los costos que no ves / del riesgo
  operacional / de improvisar con la nueva ley de datos.»* Da una sola vuelta (~12 s) y se queda
  en la ley, en ámbar. Los lectores de pantalla leen la frase completa desde un texto oculto.
- **Demo «Tu pyme con IA»:** tareas de una pyme cualquiera (factura, cotización por WhatsApp,
  solicitud de supresión, póliza por vencer, orden de compra, consulta interna). Cada tarea suma
  los **minutos de trabajo manual evitados**, que es la forma visual de decir «horas hombre».
- **Franja «Ley de datos»** justo después de la portada, en ámbar, con la cuenta regresiva en
  números gigantes (**76** días al 16-09-2026; sin JS dice «Rige desde el 1 dic de 2026»).
- **Beneficios:** seis fichas, una por dolor (horas hombre, costos, papeleo, riesgo operacional,
  Ley 21.719 destacada en ámbar, ventas).
- **Para quién** ampliado a pymes de cualquier rubro; **matriz** con factura, solicitud de la ley
  y póliza por vencer.
- **Calculadora de horas hombre** (personas, horas semanales en tareas manuales, costo por hora,
  % automatizable → horas/mes, jornadas equivalentes y ahorro mensual/anual).
- **Precios:** «Diagnóstico de IA y datos» · **«Tu primer proceso con IA»** (desde $2.200.000 +
  IVA, cualquier proceso: facturas, pedidos, ventas u otro) · operación mensual.
- Formulario con opciones por dolor; título, meta y tarjeta social con el titular de la marca.

### Accesibilidad

El botón **Pausar** de la demo detiene también la frase rotativa (salta a la frase final). Con
movimiento reducido ninguna de las dos arranca. Contraste de los pares nuevos sobre la franja
ámbar: rótulos #98490C 5,26:1; cifra gigante #B4560F 4,05:1 (texto grande, exige 3:1).

### Verificación

Titular en 2 líneas y CTA sin scroll a 1280×900. Frase rotativa comprobada: recorre las cinco y se
queda en la ley; al pausar salta a la ley y no avanza. Contador de la demo estable en pausa. Cuenta
regresiva «76». Calculadora con valores iniciales = HTML estático. Atajos de precios apuntan a
opciones que existen. Sin desborde a 375 px.

---

## 2026-09-17 — Sin montos: «cuesta menos de lo que crees»

**Pedido.** Quitar los montos de los servicios y que la página transmita que el costo es menor de
lo que la gente cree. Sumar tres ideas: *no hace falta estar preparado para la IA, nosotros te
ayudamos*; *tu competencia ya está usando IA*; *primera reunión y asesoría gratis*.

**Decisiones del negocio (confirmadas):**
- La **asesoría gratis** va dentro de la primera reunión. El **diagnóstico sigue siendo pagado**,
  sin monto publicado, y se descuenta si se sigue.
- Ancla de costo sin cifra: **«cuesta menos que contratar a una persona más»**. Se sostiene con los
  precios internos (primer proceso + 12 meses de operación ≈ la mitad del costo anual de un
  administrativo). Si los precios suben, es la primera frase que hay que revisar.

### Cambios

- **Sin montos en ninguna parte.** Se quitaron del hero, de las tres fichas y de la nota de IVA.
- **Portada:** distintivo ámbar «Tu competencia ya está usando IA» sobre el titular; la línea del
  precio pasa a «Primera reunión y asesoría gratis · No necesitas saber de IA ni llegar preparado».
- **CTA único:** «Agenda tu asesoría gratis» (cabecera: «Asesoría gratis»).
- **Nueva sección «Lo que te frena» (`#sin-excusas`)**, después de la ley: *«No tienes que estar
  preparado para la IA. Para eso estamos nosotros.»* Cuatro creencias en kraft que se **tachan en
  ámbar** al entrar en pantalla, cada una con su respuesta en registro: estar preparado, que es
  cara, cambiar sistemas, pagar para saber si sirve. Reusa el subrayado ámbar bajo «competencia».
- **«Precios» pasa a «Cómo partimos» (`#planes`)**: *«Cuesta menos de lo que crees. Y el primer paso
  es gratis.»* Dos **boletas** con borde dentado comparan «Contratar a alguien más» (total: un
  sueldo más, todos los meses) con «Automatizar ese trabajo con IA» (total: menos de lo que
  crees). Franja «Gratis» con la primera reunión y asesoría antes de las fichas. En las fichas, el
  monto se reemplaza por un hecho: «Se descuenta si seguimos», «Menos que contratar a una persona
  más», «Una mensualidad menor que un sueldo».
- **Calculadora:** cierre «La pregunta no es cuánto cuesta la IA, sino cuánto te cuesta seguir sin
  ella».
- **Contacto y formulario:** nueva opción `asesoria` («No sé por dónde partir»), botón «Agendar mi
  asesoría gratis». `gracias.html` actualizado.
- `initMatriz` ahora anima todos los bloques `.revela`, no solo el primero.

### Verificación

Build limpio. Capturas a 1280 px de portada, «Lo que te frena» y «Cómo partimos». Sin desborde
horizontal a 375 px, consola limpia, anclas `#sin-excusas`/`#planes` existen y todos los
`data-goal` apuntan a opciones del formulario.

---

## 2026-09-17 — Logo oficial integrado

**Pedido.** Incorporar el logo (cabeza de perfil con un átomo, degradado magenta → cian; «GENIA»
en blanco y «LABS» en turquesa) de forma profesional.

**El archivo recibido era un JPG** generado con Gemini (2048×2048, fondo azul noche y estrella
de marca de agua). Un JPG no sirve para cabecera ni favicon, así que **se vectorizó**:

- **Silueta:** trazada con potrace sobre una máscara suavizada.
- **Átomo:** reconstruido con geometría exacta (3 órbitas iguales a 30°/90°/150°, núcleo y 6
  electrones sobre las órbitas), ajustado superponiéndolo al original.
- **Colores:** tres degradados (relleno, aro y átomo) con dirección y paradas **medidas** por
  regresión sobre los píxeles del original. Las órbitas son arcos y no `<ellipse transform>`,
  porque con transform el degradado giraba con cada órbita.
- Resultado: `public/assets/img/logo-genialabs.svg`, 9 KB, fondo transparente. **Es la fuente**
  de todo lo demás.

### Cambios

- **Cabecera oscura** (tinta, sólida) en todas las páginas: continúa la portada y es el fondo para
  el que se diseñó el logo. Navegación en rótulo claro y CTA `boton-vivo`.
- **Logotipo en HTML** (`.marca`): símbolo + «GENIA» con «LABS» turquesa alineado a la derecha y
  asomando, como el original. Se escribe con Archivo ancho y pesado, cercano a la geométrica del
  logo, sin sumar otra familia tipográfica. **Solo sobre fondo oscuro.**
- **Pie** con el logotipo en grande. 404 y gracias estrenan cabecera con logo.
- **Favicon** SVG + PNG 32, `apple-touch-icon` 180 e `icon-512` (JSON-LD `logo`), generados con
  `npm run build:iconos` (`scripts/iconos.mjs`).
- **Tarjeta social** con logotipo arriba y símbolo grande a la derecha; su ancla pasa a «Primera
  reunión y asesoría · Gratis».

### Verificación

Comparación lado a lado con el original. Legible desde 32 px. Cabecera sin desborde a 375 px,
menú móvil funcionando, logo cargado, consola limpia.

> La paleta del sitio (tinta, papel, kraft, verde, ámbar) **no se cambió**: el logo entra como
> marca, no como tema. El letrero de neón antes del formulario sigue siendo el render anterior.

---

## 2026-09-17 — Logo más grande, logo animado y logo de fondo

**Comentarios sobre la integración del logo:** mantener el logotipo en Archivo pero **más
grande**; no cambiar la paleta; **reemplazar el neón** por una animación del logo (electrones
moviéndose) y dejar el **logo de fondo muy tenue, persistente al hacer scroll**.

### Cambios

- **Logo más grande:** símbolo de 42 a 52 px en la cabecera (que pasa de 72 a 84 px de alto) y de
  54 a 68 px en el pie. Bajo 380 px de ancho se reduce un poco para que quepa con el menú.
- **Franja de marca con logo animado** en lugar del letrero de neón. El SVG se genera en el build
  desde `logo-genialabs.svg`: cada electrón recorre su órbita con `animateMotion` (9, 12 y 10,5 s
  por órbita) y arranca con un `begin` negativo calculado para que **en t=0 el dibujo sea idéntico
  al logo estático**. El núcleo late suave con un halo. Los electrones se dibujan con una máscara
  sobre un rectángulo con el degradado, así toman el color del lugar por donde pasan. Al lado,
  «GENIA LABS» en grande. Fondo tinta con dos resplandores muy bajos en magenta y cian.
- **Pausa:** fuera de pantalla, con `prefers-reduced-motion` (queda el logo estático) y con el
  botón Pausar de la demo de la portada.
- **Logo de fondo** (`.logo-fondo`): `position: fixed`, 5 % de opacidad, a la derecha. Va **encima**
  del contenido con `pointer-events: none`, porque todas las secciones tienen fondo opaco y debajo
  no se vería. No se imprime.
- Neón movido a `archive/img/`.

### Verificación

Fotogramas en t=0, 2, 4 y 6 s comparados con el logo estático. Prueba en Chrome headless: pausado
fuera de pantalla, avanza en pantalla, se pausa con el botón y reanuda. Sin desborde a 375 px.

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
| Jerarquía de encabezados | ✅ sin saltos |
| LinkedIn del pie | ✅ enlace quitado (la página sigue sin existir) |
| Identidad visual propia | ✅ rediseño 2026-08-30 |
| Imagen de marca | ✅ logo animado (reemplaza al neón) y logo tenue de fondo |
| Logo oficial | ✅ vectorizado; cabecera, pie, favicon, íconos y tarjeta social |
| CTA unificado | ✅ uno solo, con oferta (30 min sin costo) |
| Ancla comercial en la página | ✅ plazos + «menos que contratar a una persona»; sin montos (decisión 2026-09-17) |
| Enfoque en un nicho + Ley 21.719 | ✅ en la landing local |
| Política de privacidad | 🟨 borrador: falta razón social, RUT y revisión legal |
| Notificación de deploy fallido | ⬜ recomendada |
| DMARC | ⬜ pendiente |
| Prueba social en la página | ⬜ pendiente (mayor impacto comercial) |

Los pendientes, priorizados y con lo que hace falta para cada uno, están en
[`PROXIMOS-PASOS.md`](PROXIMOS-PASOS.md).
