---
name: plan-feature
description: Planifica un nuevo desarrollo, una corrección de código o un refactor, generando un plan con objetivo, tareas de 5-10 min y criterios de aceptación según template.md. Úsala antes de implementar cambios.
argument-hint: [descripción de lo que se quiere hacer]
allowed-tools: Read, Grep, Glob, Write, AskUserQuestion, mcp__slack__slack_list_channels, mcp__slack__slack_post_message
---

Planifica el cambio pedido por el usuario y devuelve un plan que siga exactamente la estructura de la plantilla. **No implementes nada**: esta skill solo planifica.

Petición: $ARGUMENTS

## Pasos

1. **Entiende la petición.** Si falta información que cambie el plan (alcance, comportamiento esperado, casos de error), pregunta con `AskUserQuestion`. No preguntes lo que puedas deducir del código.
2. **Clasifica** el cambio: `feature`, `fix` o `refactor`.
3. **Explora el código afectado** con `Read`, `Grep` y `Glob`. Lee `CLAUDE.md` y los archivos de las capas implicadas (`routes → controllers → services → repositories → models`). Reutiliza lo que ya exista en lugar de planificar código nuevo.
4. **Lee la plantilla** `${CLAUDE_SKILL_DIR}/template.md` y rellena todas sus secciones, respetando títulos y orden. Elimina solo la sección opcional "Riesgos y notas" si no aplica.
5. **Guarda el plan** en `docs/plans/<slug>.md` (`<slug>` en minúsculas y con guiones, p. ej. `endpoint-me.md`) y muéstraselo al usuario.
6. **Avisa en Slack.** Una vez guardado el plan, publica un mensaje en el canal `revisar-plan` con `mcp__slack__slack_post_message` (si necesitas el ID del canal, búscalo antes con `mcp__slack__slack_list_channels`). El mensaje, en español, indica que el plan está listo para revisarse e incluye el título, el tipo y la ruta (`docs/plans/<slug>.md`). Si el canal no existe o el envío falla, díselo al usuario; no reintentes en otro canal.

## Reglas para las tareas

- Cada tarea dura **5-10 minutos**. Si estimas más, divídela en varias.
- Una tarea = un único cambio, redactada con verbo en infinitivo e indicando el archivo o la capa y el tiempo estimado.
- Ordénalas por dependencia y de abajo arriba por capa: `models → repositories → services → controllers → routes`.
- Usa casillas `- [ ]` y numéralas `T1`, `T2`, ...
- Incluye las tareas de verificación (probar el endpoint, actualizar `CLAUDE.md` si cambia la arquitectura).

## Reglas para los criterios de aceptación

- Deben ser **verificables**: alguien debe poder comprobar con un sí/no si se cumplen.
- Cubren el caso feliz y al menos un caso de error (con mensajes de cara al usuario en español).
- Incluyen el cumplimiento de las convenciones del proyecto.

## Convenciones del proyecto a respetar en el plan

- Clases en las capas (nada de funciones sueltas exportadas) y métodos en `snake_case`.
- Sin librerías externas si Node tiene solución nativa (`crypto`, `node:sqlite`, `node:test`, `fetch`...).
- Variables de entorno desde `.env`, nunca hardcodeadas.
- Acceso a la base de datos (SQLite) solo desde `repositories`.

## Restricciones

- No modifiques código del proyecto; el único archivo que escribes es el plan en `docs/plans/`.
- El único mensaje de Slack permitido es el aviso del paso 6, en el canal `revisar-plan`.
- Si no puedes cumplir 5-10 min por tarea, indícalo en "Riesgos y notas" en lugar de saltarte la regla.
