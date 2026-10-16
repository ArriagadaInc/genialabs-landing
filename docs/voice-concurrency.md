# Validación de concurrencia del asistente

16 de octubre de 2026. Validación local del código con proveedor, audio y almacenamiento simulados; sin carga ni consumo de servicios reales.

El servidor crea un token de un uso y un identificador aleatorio de transcripción por solicitud. No mantiene una conversación global. Cada navegador abre su propio WebSocket hacia Gemini y conserva su estado de audio y transcripción por conversación. Dentro de cada conversación se procesan mensajes en orden; distintas conversaciones avanzan independientemente.

Pruebas reproducibles: `node --test tests/voice-concurrency.test.mjs tests/voice-client-lifecycle.test.mjs tests/voice.test.mjs tests/voice-log.test.mjs tests/voice-activity.test.mjs`.

- 50 solicitudes de sesión concurrentes, retenidas en una barrera hasta que todas llegan al proveedor simulado: tokens y registros distintos.
- 50 guardados concurrentes: texto y capacidad de acceso aislados por visitante.
- Una solicitud detenida, una rechazada por cuota y una con error de red no bloquean otra saludable.
- Dos contextos de navegador independientes: agotar el tiempo de conexión de uno no cierra el otro; se puede reintentar.
- Micrófono pendiente: libera controles a los 30 segundos y detiene el stream si el permiso llega tarde.
- Conexión sin confirmación: termina a los 15 segundos desde la obtención del micrófono. Conversación conectada: duración máxima de tres minutos.
- Guardado de transcripción detenido: cancela la espera a los ocho segundos y comunica que no confirmó el guardado.

Se añadieron el límite del inicio del micrófono y el del guardado. Los cambios requieren publicación. Los temporizadores del navegador pueden retrasarse en pestañas suspendidas.

## Límites de la conclusión

Estas pruebas no demuestran 50 conversaciones de audio reales simultáneas, latencia de producción ni capacidad contratada. El límite configurado en `voice-session.mjs` es tres solicitudes por minuto por IP y dominio en el borde de Netlify; no equivale a tres usuarios globales. Puede afectar visitantes de una misma oficina o red compartida, y la disponibilidad GET comparte la función. No se cambia este límite sin revisar tráfico y cuotas.

Las cuotas reales de Gemini dependen del proyecto y nivel de uso: revisar la página de límites de AI Studio, el modelo desplegado y los límites del plan de Netlify. Referencia: https://ai.google.dev/gemini-api/docs/rate-limits .

Para cerrar validación de producción: desplegar, verificar cuotas y ejecutar conversaciones sintéticas desde contextos separados con escalones de 2, 5 y 10 dentro de la cuota disponible. Medir conexiones exitosas, tiempo de conexión y primera respuesta, cierres inesperados, 429/503, guardado y ausencia de cruces de texto. Usar redes distintas cuando se quiera medir capacidad del proveedor sin topar el límite por IP. Esto genera consumo real y debe quedar identificado como prueba; nunca usar datos de clientes. Hasta completar esos pasos, la capacidad real simultánea sigue sin certificarse.
