# Fotografías ilustrativas — 2026-10-08

Generadas con la herramienta integrada ImageGen. Las personas y negocios son
escenas ilustrativas; no representan clientes, testimonios ni al equipo de Genia Labs.

Archivos finales: `public/assets/img/pyme-{negocio,distribuidora,servicios}-{640,1200}.webp`.
Cada escena tiene versiones de 640×427 y 1200×800, calidad WebP 80, para `srcset`.

## Dirección de los prompts utilizados

Portada actual: `public/assets/img/pyme-contabilidad-{640,1200}.webp`.
Generada con ImageGen: fotografía editorial natural horizontal 3:2 de dos
profesionales contables chilenos revisando documentos junto a un computador,
oficina pequeña luminosa en Santiago, escritorios de roble claro, plantas y
archivadores ordenados. Encuadre documental de 35 mm, luz diurna, piel sin retoque,
manos realistas y expresiones concentradas; sin mirar a cámara, poses publicitarias,
lujo corporativo, bodega rústica, marcas ni texto legible. Escena ilustrativa.
Reemplaza la escena rústica en la portada para acercarse a oficinas contables,
inmobiliarias, asesorías y otras pymes de servicios.

- Portada: fotografía documental horizontal 3:2 de una dueña de pyme chilena y
  su compañero revisando pedidos en una mesa usada, computador y facturas,
  pequeña distribuidora de Santiago, luz lateral natural y ambiente cotidiano.
- Distribuidora: fotografía documental horizontal 3:2 de dos compañeros revisando
  un pedido y un paquete en una bodega pequeña, estanterías prácticas, cajas,
  mesa desgastada, luz desde la entrada y ropa de trabajo corriente.
- Servicios: fotografía documental horizontal 3:2 de dos mujeres de distintas
  edades revisando un computador en una oficina pequeña en Santiago, escritorio
  de madera, archivadores, cuaderno, plantas y luz natural.

Restricciones comunes: encuadre editorial de 35 mm, anatomía y manos realistas,
piel sin retoque, expresiones concentradas, sin mirar a cámara, colores naturales,
sin poses publicitarias, lujo, robots, neón, marcas ni texto legible; evitar piel
plástica, desenfoque exagerado y tratamiento cinematográfico artificial.

## Integración y comprobaciones

Una escena en la portada; dos en la sección de soluciones para pymes.
Las imágenes inferiores usan carga diferida. Dimensiones explícitas reservan
espacio; la cuadrícula de rubros pasa a una columna bajo 480 px.

`npm run build` y `git diff --check` pasan. Revisada la página en el navegador
integrado a 403 y 1280 px, sin desborde horizontal. La calculadora desplegable
abre desde sus enlaces y actualiza los resultados. Se conserva el logo animado
en una franja compacta antes del contacto. No se publicaron cambios.
