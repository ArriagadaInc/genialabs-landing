# Asistente de voz (primera versión)

Botón flotante, conversación voluntaria en español y acceso al formulario. No agenda por sí solo. No guarda audio en Genia Labs. Solo con autorización opcional, guarda transcripción y extracto en Supabase. El navegador transmite audio directamente a Google Gemini; los términos del proveedor aplican a ese procesamiento.

## Activar en Netlify

En Site configuration → Environment variables agrega:

- `GEMINI_API_KEY`: clave de Google AI Studio, marcada como secreta y disponible solo para Functions. Nunca usar una variable pública ni incluirla en el repositorio.
- `VOICE_ENABLED`: `true`, disponible para Functions. Si falta, la voz queda desactivada.
- `GEMINI_LIVE_MODEL`: opcional; por defecto `gemini-3.8-live`. Confirmar acceso a este modelo Live en la cuenta usada.

Vuelve a desplegar para aplicar variables y la nueva función. Para apagar la voz, cambia `VOICE_ENABLED` a `false` y vuelve a desplegar.

La función emite un token de un uso, con 60 segundos para iniciar y una vigencia máxima de 3 minutos. Bloquea las instrucciones del asistente en el token. Solo admite orígenes del sitio y del despliegue Netlify. El límite de Netlify es 3 solicitudes/minuto por IP y dominio (incluye consultar disponibilidad); no sustituye las cuotas del proveedor. Configura cuotas de uso y revisa facturación en Google antes de activar tráfico público. Los presupuestos con alertas no son un corte automático del gasto.

## Verificar

`npm test` y `npm run build`. `npm run preview` sirve la landing en http://127.0.0.1:4173 con el endpoint en modo local; sin variables muestra la alternativa del formulario. No carga archivos .env automáticamente. Para probar con credenciales locales, usa Netlify Dev con variables del entorno y accede por su puerto 8888.

Después de activar: permitir micrófono, comprobar saludo en español, interrumpir mientras habla, cerrar con Escape y confirmar que el micrófono se apaga; probar rechazo de permiso, móvil y formulario. La prueba completa de voz requiere clave válida y acceso al modelo. El asistente no es adecuado para datos de pacientes o información sensible.

Implementación: Web Audio + AudioWorklet (PCM16), WebSocket Gemini Live y función Netlify que conserva la clave en el servidor. Sin SDK ni scripts externos en la landing.

## Registro de conversaciones (Supabase)

Proyecto creado: `genialabs-conversaciones`, organización Genia Labs, referencia `edpmbaanwldrwhbiowyv`. Migración aplicada desde el SQL Editor: `supabase/migrations/20261009_voice_conversations.sql`.

En Netlify, agrega con alcance **Functions**:

- `SUPABASE_URL`: URL del proyecto, disponible en Supabase → Project Settings → Data API.
- `SUPABASE_SECRET_KEY`: clave secreta del proyecto (Settings → API Keys → Secret keys, `sb_secret_...`). Marcar como secreta. No usar la clave publishable, no copiar la contraseña de la base, no poner en HTML ni compartir en el chat.

Volver a desplegar después de configurar. Sin ambas variables, la voz funciona sin almacenamiento y la autorización de guardado aparece deshabilitada. Para consultar: Table Editor → public → voice_conversations. La columna `transcript` contiene pares role/text; `summary` es un **extracto literal de los comentarios del visitante**, no un resumen inferido por IA. Un futuro panel puede presentar esos datos y generar resúmenes comerciales.

La tabla tiene RLS y no concede privilegios a anon/authenticated. Solo el servidor recibe la clave secreta. El visitante recibe una autorización firmada para actualizar una única conversación durante 10 minutos; no existe endpoint público para leer registros. Las transcripciones son aportadas por el navegador y no son evidencia verificada de identidad o de lo que se escuchó.

Se guardan avances cada 10 segundos y al terminar, cerrar u ocultar la pestaña. Se conserva el primer texto hasta 30 KB/100 segmentos y se indica al visitante si se alcanza el límite. Las revisiones evitan que una petición antigua sobrescriba una más nueva; un registro finalizado no acepta más cambios. Fallos de red o cierre brusco pueden perder los últimos segundos. No se guarda texto en localStorage. El sitio informa si no pudo confirmar el guardado.

El equipo debe aplicar el plazo de conservación de la política de privacidad (24 meses después del último contacto comercial) y atender solicitudes de eliminación en Supabase; esta versión no automatiza ese borrado. No registrar datos sensibles. La tabla puede contener datos de contacto si el visitante los expresa voluntariamente.

Validación pendiente de credenciales: guardar una conversación consentida real, confirmar ambos roles en la tabla, y comprobar que una conversación sin consentimiento no crea registro. Las pruebas automatizadas usan respuestas simuladas; no prueban permisos reales de la cuenta Google ni el acceso REST de Netlify al proyecto.
