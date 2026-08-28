# Próximos pasos

Pendientes ordenados por impacto, con lo que hace falta para ejecutar cada uno.

Cada ficha indica **quién** puede hacerlo: 🧑 requiere una decisión o un dato del negocio,
🤖 se puede implementar sin insumos externos. Los 🧑 están bloqueados hasta tener esa información.

Última revisión: **2026-08-28**.

---

## Prioridad alta — conversión

Es donde más se puede ganar y **es contenido, no código**. La landing está técnicamente sana;
lo que la frena es que no da razones para confiar ni para actuar.

### 1. Prueba social verificable 🧑

**Problema.** El caso destacado es anónimo («una empresa chilena de asesoría previsional»), sin
nombre, logo ni persona. La cita de cierre **no tiene autor**, así que se lee como autoescrita.
Para una pyme que evalúa contratar a un proveedor tecnológico desconocido, este es el freno número uno.

**Qué hace falta.** Un cliente dispuesto a aparecer con nombre, cargo y una frase real. Con uno basta.

**Si nadie quiere aparecer todavía**, hay salidas honestas y bastante mejores que el texto actual:
rubro y tamaño sin nombre («distribuidora de 12 personas en Santiago»), o una cita atribuida a un
cargo («Jefa de Operaciones, empresa de asesoría previsional»). Lo que no funciona es una cita
sin dueño.

### 2. Números concretos 🧑

**Problema.** No hay una sola cifra en toda la página. Todo es cualitativo: «reduce
significativamente», «menos digitación», «respuestas más oportunas».

**Qué hace falta.** Métricas reales del proyecto ya ejecutado: horas ahorradas por semana,
porcentaje de reducción de errores, plazo de implementación, volumen procesado.

> «Pasamos de 3 horas a 20 minutos al día digitando facturas» convence más que diez adjetivos.

### 3. Precio o plazo de referencia 🧑

**Problema.** La sección se titula **«Inversión accesible»**, promete que «puede ser más accesible
de lo que imaginas»… y nunca aterriza una cifra. El miedo de toda pyme es *«esto debe costar
millones»*, y la sección que existe para desactivarlo no lo hace.

**Qué hace falta.** Un rango publicable («proyectos desde $X») o un plazo («primer proceso andando
en N semanas»). Filtra prospectos fuera de rango y convierte a los que sí calzan.

### 4. Quiénes están detrás 🧑

**Problema.** Ni nombres, ni fotos, ni trayectoria. Se vende confianza a empresas que no conocen
a Genia Labs.

**Qué hace falta.** Nombre, rol y trayectoria breve de quien lidera. Con foto es mejor, sin foto
igual sirve.

### 5. Unificar los CTA 🤖 (necesita visto bueno)

**Problema.** Hay **seis textos distintos** para la misma acción de ir al formulario: «Descubrir
dónde aplicar IA», «Ver soluciones con IA», «Quiero automatizar algo así», «Cuéntanos qué quieres
automatizar», «Evaluar una solución accesible», «Explorar una oportunidad con IA». Eso diluye, y
ninguno dice qué pasa después ni que no tiene costo.

**Propuesta.** Reducir a uno o dos, con la expectativa explícita. Por ejemplo:
*«Agenda 30 min sin costo — te decimos si hay caso, aunque no trabajemos juntos»*.

### 6. Reencuadrar el caso destacado 🧑

**Problema.** El único caso admite que la IA es la «próxima evolución» y que lo hecho es «base
operacional». Una empresa que vende IA muestra un caso donde la IA todavía no está.

**Propuesta.** Presentarlo como *«así preparamos el terreno»* en vez de como caso de IA. Es honesto
y deja de competir consigo mismo.

---

## Prioridad media — credibilidad y correo

### 7. LinkedIn del pie está roto 🧑

**Verificado el 2026-08-28:** `www.linkedin.com/company/genialabs` devuelve **404** (control con una
empresa real: 200). El enlace del pie lleva a un error de LinkedIn.

Dos salidas: **crear la página de empresa** (~10 min) y el enlace queda válido, o **quitar el
enlace** hasta que exista. Un enlace social muerto resta credibilidad justo donde la página ya
es débil.

### 8. Registro DMARC 🧑

El dominio tiene SPF pero **no tiene DMARC**, que es la pieza que impide que suplanten
`@genialabs.cl` en campañas de phishing. Se agrega en **Netlify → Domains → genialabs.cl → DNS records**:

| Tipo | Nombre | Valor |
|---|---|---|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:alanarri@gmail.com` |

`p=none` solo observa y envía reportes, sin bloquear nada: es el arranque seguro. Tras unas semanas
de reportes se puede endurecer a `p=quarantine`.

### 9. Responder desde contacto@genialabs.cl 🧑

Hoy se **recibe** en esa dirección (ImprovMX gratis), pero al responder sale el Gmail personal.
Para responder con la dirección del dominio hace falta SMTP: ImprovMX Premium (~US$9/mes) o
Google Workspace (~US$7/mes, con buzón real). No es urgente, pero se nota en la percepción
al contestar a un prospecto.

---

## Prioridad baja — operación

### 10. Notificación de deploy fallido 🧑

En **Netlify → Notifications → Emails and webhooks → Deploy notifications → Add notification →
Email notification**, evento **Deploy failed**, destino `alanarri@gmail.com`.

Importa porque el sitio tiene un paso de build: si un cambio rompe la compilación, Netlify **deja
publicada la última versión buena y no avisa**. Parecería que el cambio se publicó cuando no fue así.

> El evento no aparece en el desplegable inicial: primero se elige *Email notification* y **en el
> paso siguiente** se selecciona *Deploy failed*.

---

## Ya resuelto

Para no reabrir lo cerrado. El detalle está en [`BITACORA.md`](BITACORA.md).

| | Estado |
|---|---|
| Landing v6 en producción | ✅ |
| Formulario de contacto operativo, con aviso por correo | ✅ |
| Reenvío `contacto@genialabs.cl` → `alanarri@gmail.com` | ✅ |
| Sin dependencias de terceros en runtime | ✅ |
| Desborde en «Casos de uso» | ✅ |
| Invalidación de caché del CSS por hash | ✅ |
| Jerarquía de encabezados sin saltos | ✅ |
| Cabeceras de seguridad y caché | ✅ |
