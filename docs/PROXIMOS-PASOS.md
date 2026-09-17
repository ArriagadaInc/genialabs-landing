# Próximos pasos

Pendientes ordenados por impacto, con lo que hace falta para ejecutar cada uno.

Cada ficha indica **quién** puede hacerlo: 🧑 requiere una decisión o un dato del negocio,
🤖 se puede implementar sin insumos externos. Los 🧑 están bloqueados hasta tener esa información.

Última revisión: **2026-09-16**, tras enfocar la landing en un nicho y en la Ley 21.719 (ver [`BITACORA.md`](BITACORA.md)).

---

## Antes de publicar la landing nueva 🧑

La landing enfocada está lista en local, pero hay cuatro cosas que no son código:

1. **Política de privacidad:** completar razón social y RUT, confirmar el plazo de conservación
   (24 meses) **y aplicarlo** borrando los envíos viejos en Netlify → Forms, y pasarla por un abogado.
2. **Confirmar las promesas publicadas:** diagnóstico en 1–2 semanas, primer proceso en 4–6,
   **primera reunión y asesoría gratis**, y el ancla «cuesta menos que contratar a una persona
   más». Los montos ya no se publican (2026-09-17), pero esa frase depende de ellos.
3. **DMARC** (punto 8 más abajo): con la ley en el discurso, es lo mínimo en casa.
4. **Caso real con métrica y nombre:** permiso escrito del cliente y **una cifra medida** (por
   ejemplo, tiempo de asignación de un lead antes y después). El hueco está marcado en
   `#proyecto`. Es la mejor palanca de conversión que queda.

---

## Prioridad alta — conversión

Es donde más se puede ganar y **es contenido, no código**. La landing está técnicamente sana;
lo que la frena es que no da razones para confiar ni para actuar.

> **Ahora pesan más que antes.** La página pasó a ser abiertamente comercial: promete menos
> horas, menos costos y un plazo de 6 semanas. Una promesa fuerte sin un cliente que la
> respalde ni una sola cifra real es justo donde un prospecto desconfía. Los puntos 1 y 2 son
> el siguiente salto de conversión, y son insumos tuyos, no diseño.

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

### 3. Precio de referencia 🧑 — decidido: sin montos

**2026-09-17.** Se decidió **no publicar montos**. Lo accesible se transmite con hechos (primera
reunión y asesoría gratis, precio cerrado por escrito, diagnóstico descontable) y con el ancla
«cuesta menos que contratar a una persona más». Si algún día se vuelve a publicar un «desde $X»,
va en `<section id="planes">`, en la línea `cifra` de cada ficha.

> **Recordatorio:** los plazos y la asesoría gratis son promesas públicas. Si dejan de ser
> realistas, se cambia la página.

### 4. Quiénes están detrás 🧑

**Problema.** Ni nombres, ni fotos, ni trayectoria. Se vende confianza a empresas que no conocen
a Genia Labs.

**Qué hace falta.** Nombre, rol y trayectoria breve de quien lidera. Con foto es mejor, sin foto
igual sirve.

### 5. ~~Unificar los CTA~~ ✅ hecho

Los seis textos pasaron a uno: **«Agenda 30 minutos sin costo»**, con la expectativa explícita
al lado: *«Te decimos si hay caso, aunque no trabajemos juntos.»* La oferta quedó aprobada el
2026-08-30.

### 6. ~~Reencuadrar el caso destacado~~ ✅ hecho en el rediseño

La sección se llama ahora **«Así preparamos el terreno»** y separa lo que ya funciona
(«Entregado») de lo que viene («En diseño»). También se quitó la cita sin autor del cierre:
decía lo mismo pero se leía como autoescrita, porque lo era.

---

## Prioridad media — credibilidad y correo

### 7. LinkedIn y política de privacidad 🧑

**El rediseño quitó los dos enlaces del pie, porque los dos daban 404.** Era la salida
reversible: un enlace muerto resta más de lo que suma un enlace de más.

- **LinkedIn.** `www.linkedin.com/company/genialabs` no existe (verificado el 2026-08-28;
  control con una empresa real: 200). Crear la página de empresa toma ~10 min; hecho eso, el
  enlace vuelve al pie.
- **Política de privacidad.** El pie apuntaba a `/privacidad`, que nunca existió. El
  formulario recoge nombre, empresa, correo y teléfono, así que la página **corresponde**
  tenerla. Es contenido legal, no diseño: hace falta el texto para publicarla.

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
