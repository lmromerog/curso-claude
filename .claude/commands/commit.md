---
description: Crea un commit siguiendo el formato Conventional Commits
argument-hint: [pista opcional sobre el tipo o el alcance del cambio]
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*)
---

Crea un commit de git con los cambios actuales siguiendo la especificación Conventional Commits 1.0.0.

## Contexto

- Estado: !`git status --short`
- Cambios (staged y unstaged): !`git diff HEAD`
- Commits recientes: !`git log --oneline -10`

## Formato

```
<tipo>(<alcance opcional>): <descripción>

[cuerpo opcional]

[pie(s) opcional(es)]
```

### Tipos permitidos

- `feat`: nueva funcionalidad
- `fix`: corrección de un error
- `docs`: solo documentación
- `style`: formato que no afecta al código (espacios, punto y coma, etc.)
- `refactor`: cambio de código que no corrige un error ni añade funcionalidad
- `perf`: mejora de rendimiento
- `test`: añadir o corregir tests
- `build`: sistema de build o dependencias
- `ci`: configuración de integración continua
- `chore`: tareas de mantenimiento que no tocan `src` ni tests
- `revert`: revierte un commit anterior

### Reglas

- La descripción va en minúsculas, en modo imperativo, sin punto final y con un máximo de 72 caracteres en la primera línea.
- El alcance, si se usa, es un sustantivo entre paréntesis que identifica la zona afectada (p. ej. `auth`, `user-repository`, `token`).
- Un cambio incompatible se marca con `!` tras el tipo/alcance (`feat(api)!: ...`) y/o con un pie `BREAKING CHANGE: <explicación>`.
- El cuerpo explica el *qué* y el *porqué*, no el *cómo*. Se separa de la descripción con una línea en blanco.
- Un commit = un cambio lógico. Si los cambios mezclan varios propósitos, propón dividirlos en varios commits y haz `git add` solo de los archivos de cada uno.

## Pasos

1. Analiza el diff y decide el tipo y el alcance. Si se pasó una pista en `$ARGUMENTS`, tenla en cuenta: $ARGUMENTS
2. Si no hay cambios, díselo al usuario y no crees ningún commit.
3. Añade al área de staging solo los archivos relevantes (`git add <archivos>`). No incluyas `.env`, credenciales ni archivos generados.
4. Usa la tool `AskUserQuestion` para mostrarle al usuario el mensaje del commit, y que decida si le parece bien. Si te da el ok, continua. Si te dice que no, proponle otro mensaje y vuelve a preguntarle.
5. Crea el commit. Termina siempre el mensaje con esta línea de atribución, separada por una línea en blanco:

   ```
   Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
   ```

6. Ejecuta `git status` para confirmar que el commit se creó y muestra al usuario el mensaje resultante.

## Restricciones

- No hagas `git push`.
- No uses `--no-verify`, `--amend` ni `--force` salvo que el usuario lo pida explícitamente.
- Si un hook de pre-commit falla, corrige el problema y crea un commit nuevo; no lo saltes.
