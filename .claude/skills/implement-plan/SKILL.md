---
name: implement-plan
description: Implementa un plan de docs/plans/ (generado con plan-feature) en un git worktree aislado, tarea a tarea con TDD estricto, un commit por tarea y marcando cada tarea como hecha en el plan hasta cumplir los criterios de aceptación.
argument-hint: [ruta del plan, p. ej. docs/plans/endpoint-me.md]
allowed-tools: Read, Edit, Write, Grep, Glob, Bash, AskUserQuestion, mcp__slack__slack_list_channels, mcp__slack__slack_post_message
---

Implementa el plan indicado siguiendo el flujo de abajo, sin saltarte ningún paso.

Plan: $ARGUMENTS

## Paso 0 — Preparar

1. Lee el plan. Si `$ARGUMENTS` está vacío, lista `docs/plans/*.md` y pregunta cuál con `AskUserQuestion`. Si el plan no sigue la estructura de `plan-feature` (Tareas `T1..Tn`, Criterios de aceptación), díselo al usuario y detente.
2. Lee `CLAUDE.md` y respeta sus convenciones (capas, clases, métodos en `snake_case`, sin dependencias externas si hay solución nativa, errores en español).
3. Si el plan ya tiene tareas marcadas `- [x]`, retoma desde la primera sin marcar.
4. Comprueba con `git status` que no hay cambios sin commitear que puedan mezclarse; si los hay, avisa al usuario.

## Paso 1 — Crear el git worktree

1. Deriva `<slug>` del nombre del plan (`docs/plans/endpoint-me.md` → `endpoint-me`).
2. Crea el worktree en una carpeta hermana del repositorio, con rama nueva (si ya existe, reutilízalo en lugar de recrearlo):

   ```bash
   git worktree add ../<repo>-<slug> -b feat/<slug>
   ```

   Usa el prefijo `fix/` o `refactor/` según el **Tipo** del plan.
3. Trabaja **solo dentro del worktree** a partir de aquí (rutas absolutas). Si el plan está sin commitear en la rama base, cópialo al worktree y commitéalo primero como `docs(plan): añadir plan <slug>`.
4. Si hay `package.json`, ejecuta la instalación de dependencias en el worktree (`npm install`) y verifica que los archivos de entorno necesarios existen (el `.env` no se versiona: cópialo o usa `.env.test`).
5. Ejecuta la suite existente para fijar la línea base. Si ya falla, díselo al usuario antes de continuar.

## Paso 2 — Bucle por tarea (TDD estricto)

Recorre las tareas en el orden del plan (`T1`, `T2`, ...). Para **cada** tarea:

1. **Rojo.** Escribe primero el test que describe el comportamiento de la tarea. Ejecútalo y **comprueba que falla por la razón esperada** (no por un error de sintaxis o de import). Si pasa sin código nuevo, el test no sirve: reformúlalo.
2. **Verde.** Escribe el código mínimo para que el test pase. Nada más. Ejecuta los tests y confirma que pasan.
3. **Refactor.** Limpia duplicación manteniendo todos los tests en verde. Ejecuta la suite completa.
4. **Commit.** Sigue `.claude/commands/commit.md` (Conventional Commits, atribución `Co-Authored-By`, mensaje confirmado con `AskUserQuestion`). Un commit por tarea con los archivos de código, de test y la marca del plan.
5. **Marcar en el plan.** Antes de commitear, cambia `- [ ] **Tn**` por `- [x] **Tn**` en el plan del worktree, de modo que la marca viaje en el mismo commit de la tarea.
6. Pasa a la siguiente tarea.

Reglas del bucle:

- Prohibido escribir código de producción sin un test rojo previo que lo exija.
- Si una tarea es puramente de configuración o documentación (sin comportamiento testeable, p. ej. actualizar `CLAUDE.md`), no inventes un test: indícalo explícitamente, verifícala de otra forma (ejecutar el comando, revisar el diff) y commitea con tipo `docs`/`chore`/`build`.
- Si una tarea requiere más de lo previsto (>10 min) o descubres una tarea no contemplada, **detente y avisa**; propón dividirla o ampliar el plan y actualiza el plan antes de seguir.
- Si un test falla de forma inesperada dos veces seguidas, para y diagnostica la causa raíz; no cambies el test para que pase.
- Nunca marques una tarea como hecha con tests en rojo.

## Paso 3 — Cierre: criterios de aceptación

1. Ejecuta la suite completa y confirma que está en verde.
2. Recorre **uno a uno** los criterios de aceptación del plan y verifícalos de verdad (tests, ejecutar la app con `/run` o `curl`, revisar el diff frente a las convenciones). Marca `- [x]` solo los que hayas comprobado.
3. Si algún criterio no se cumple, añade las tareas necesarias al plan (siguiendo el formato `Tn`) y vuelve al Paso 2 para ellas.
4. Cuando todo esté marcado, commitea los cambios del plan (`docs(plan): marcar criterios de aceptación de <slug>`).

## Aviso en Slack

Cuando todas las tareas estén hechas y todos los criterios de aceptación verificados, publica un mensaje en el canal `revisar-plan` con `mcp__slack__slack_post_message` (si necesitas el ID del canal, búscalo antes con `mcp__slack__slack_list_channels`). El mensaje, en español, indica que la implementación está lista para revisarse e incluye el nombre del plan, la rama, la ruta del worktree y el resultado de la suite. No avises si queda alguna tarea o criterio pendiente. Si el canal no existe o el envío falla, díselo al usuario; no reintentes en otro canal.

## Informe final

Muestra al usuario: ruta del worktree y rama, lista de commits (`git log --oneline <base>..HEAD`), resultado de la suite y estado de cada criterio. Indica los pasos siguientes (revisar, fusionar la rama, `git worktree remove ../<repo>-<slug>`), pero **no** los ejecutes.

## Restricciones

- No hagas `git push`, ni merge, ni elimines el worktree sin que el usuario lo pida.
- No uses `--no-verify`, `--amend` ni `--force`.
- No modifiques el alcance del plan por tu cuenta: los cambios al plan se limitan a marcar casillas y a añadir tareas justificadas, avisando al usuario.
- No añadas dependencias externas sin que el plan lo contemple.
- El único mensaje de Slack permitido es el aviso final, en el canal `revisar-plan`.
