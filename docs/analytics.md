# Medición de Genia Labs

El ID de producción `G-7DL0SCQKPQ` está configurado en `netlify.toml` (es un identificador público). Flujo web: `16106726544`, URL https://genialabs.cl. Para compilar localmente con analítica, definir `GA4_MEASUREMENT_ID`; Netlify aplica su configuración de build automáticamente. Sin ID no se inyecta Analytics. Solo opera en genialabs.cl y www.genialabs.cl y tras aceptar analítica; previews y localhost quedan excluidos.

Eventos: `generate_lead` (Netlify confirma envío), `voice_session_start` (conexión lista), `voice_assistant_use` (primera transcripción del visitante, una vez por conversación), `contact_cta_click`, `contact_form_start`, `calculator_use`, `email_click`.

Configurados en GA4: generate_lead como evento clave una vez por evento y voice_assistant_use una vez por sesión, ambos sin valor monetario inventado. Mantener sus resultados separados: una conversación no es un prospecto. Medición mejorada configurada: vistas de página y desplazamientos; historial, formularios, búsquedas, clics salientes, vídeo y descargas desactivados. Retención de eventos y usuarios: 2 meses, sin reinicio por nueva actividad. Google Signals y publicidad desactivados en la etiqueta.

Validación en producción: rechazar y comprobar que no se carga gtag; aceptar y verificar una vista; iniciar conversación y hablar para verificar voice_assistant_use una vez; comprobar que una solicitud fallida no genera generate_lead. Verificar solicitudes exitosas contra Netlify Forms. Comprobar revocación desde Preferencias de analítica. No usar visitar /gracias como conversión, porque se puede abrir directamente.

UTM admitidos: valores de hasta 100 caracteres, letras ASCII, números, guion y guion bajo. Ejemplo: ?utm_source=linkedin&utm_medium=social&utm_campaign=asesoria_gratis. No incluir datos personales. Las URLs enviadas excluyen query y fragmento; las campañas se pasan explícitamente. No se envían valores de formulario, audio ni transcripciones.

Publicado en producción mediante commit cdb5107. Propiedad GA4: 558419539; cuenta: 411520392. Se verificó en el navegador que rechazar evita cargar gtag y aceptar carga el ID real, sin errores de consola. No se enviaron solicitudes comerciales ficticias ni se activó el micrófono durante la prueba.
