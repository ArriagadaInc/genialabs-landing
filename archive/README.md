# Archivo histórico

Archivos conservados solo como referencia. **Nada de esta carpeta se publica.**

| Archivo | Qué es |
|---|---|
| `index-legacy-produccion-anterior.html` | Landing que estaba publicada en genialabs.cl antes de este cambio (la que reemplazamos). |
| `landing_page_genia_labs_v6_original.html` | Diseño v6 original, con Tailwind y Lucide por CDN y estilos embebidos. Es el punto de partida de `src/index.html`. |
| `migracion-inicial.mjs` | Script de migración de un solo uso. Convirtió el v6 original en `src/index.html` + `src/styles.css`. |

## No vuelvas a ejecutar `migracion-inicial.mjs`

Sobrescribiría `src/index.html` y `src/styles.css`, perdiendo cualquier cambio posterior.
La fuente de verdad ahora es **`src/`**.
