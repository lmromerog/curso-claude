# Plan: Generar documentación con OpenAPI

**Tipo:** feature

## Objetivo

Describir el funcionamiento de la API de Resttek en un documento OpenAPI 3 (`docs/openapi.yaml`) y generar a partir de él una página HTML (`docs/openapi.html`) que se pueda publicar tal cual.

## Alcance

- **Incluye:**
  - `docs/openapi.yaml` (OpenAPI 3.0.3) con los 29 endpoints actuales: `/health`, auth, employees, restaurant employees, restaurants (admin y públicos), ingredients, dishes (admin y públicos) y orders.
  - Esquema de seguridad `bearerAuth` (JWT) y roles permitidos por endpoint en la descripción de cada operación.
  - Esquemas reutilizables (`components/schemas`) para entidades, peticiones y el formato de error.
  - `docs/openapi.html` autocontenido, generado desde el YAML.
  - Script `docs:api` en `packages/api/package.json` para regenerar el HTML y validar el YAML.
  - Referencia a la documentación en `CLAUDE.md`.
- **No incluye:**
  - Cambios en el código de la API (no se sirve Swagger UI desde Express).
  - Corregir los gaps conocidos de `docs/revisiones/` (órdenes sin control de rol, etc.); se documentan tal como están.
  - Generación automática del YAML desde el código (se escribe a mano).

## Tareas

Cada tarea dura entre 5 y 10 minutos y contiene un único cambio.

- [x] **T1** (~5 min) — Leer los modelos y controllers para anotar cuerpos de petición, respuestas y códigos de error de cada endpoint — `models`, `controllers`, `contexts/employee`
- [x] **T2** (~10 min) — Crear la cabecera del YAML: `info`, `servers` (`/api/v1`), `tags`, `securitySchemes.bearerAuth` — `docs/openapi.yaml`
- [x] **T3** (~10 min) — Definir `components/schemas` de errores (`AppError`) y de empleado/auth (`LoginRequest`, `RegisterRequest`, `Employee`, `CreateEmployeeRequest`, `TokenResponse`) — `docs/openapi.yaml`
- [x] **T4** (~10 min) — Definir `components/schemas` de restaurante, ingrediente y plato (entidad + petición create/update, enums `unit` y `category`) — `docs/openapi.yaml`
- [x] **T5** (~10 min) — Definir `components/schemas` de pedidos (`Order`, `OrderItem`, `CreateOrderRequest`, `UpdateItemStatusRequest`, enum de estados) — `docs/openapi.yaml`
- [x] **T6** (~10 min) — Documentar `/health`, `POST /auth/login` y `POST /auth/register` — `docs/openapi.yaml`
- [x] **T7** (~10 min) — Documentar `/employees` (POST, GET, GET `/{id}`) y `/restaurants/{restaurantId}/employees` — `docs/openapi.yaml`
- [x] **T8** (~10 min) — Documentar `/restaurants` (POST, GET, GET `/{id}`, PUT `/{id}`) y `/public/restaurants` (GET, GET `/{id}`) — `docs/openapi.yaml`
- [x] **T9** (~10 min) — Documentar los 5 endpoints de `/restaurants/{restaurantId}/ingredients` con roles y errores — `docs/openapi.yaml`
- [x] **T10** (~10 min) — Documentar los 5 endpoints de `/restaurants/{restaurantId}/dishes` y `GET /public/restaurants/{restaurantId}/dishes` — `docs/openapi.yaml`
- [x] **T11** (~10 min) — Documentar `/orders` (POST, GET `/active`, GET `/mine`, GET `/{id}`, PATCH `/{orderId}/items/{itemId}/status`) — `docs/openapi.yaml`
- [x] **T12** (~5 min) — Validar el YAML con `npx @redocly/cli lint docs/openapi.yaml` y corregir errores — `docs/openapi.yaml`
- [x] **T13** (~5 min) — Añadir el script `docs:api` (lint + `build-docs` con salida a `docs/openapi.html`) — `packages/api/package.json`
- [x] **T14** (~5 min) — Ejecutar `npm run docs:api -w @resttek/api` y comprobar que se genera `docs/openapi.html` — `docs/openapi.html`
- [ ] **T15** (~5 min) — Abrir el HTML y contrastar 3-4 endpoints (uno público, uno con rol, uno de pedidos) con el código real — `docs/openapi.html`
- [ ] **T16** (~5 min) — Añadir a `CLAUDE.md` la ubicación de `docs/openapi.yaml`, `docs/openapi.html` y el comando para regenerarlo — `CLAUDE.md`

## Criterios de aceptación

- [ ] Existe `docs/openapi.yaml` con `openapi: 3.0.3` y pasa `npx @redocly/cli lint` sin errores.
- [ ] Los 29 endpoints montados en `app.ts` aparecen en el YAML con el mismo método y ruta (verificable comparando con `grep "router\." src`).
- [ ] Cada endpoint protegido declara `security: bearerAuth` e indica en la descripción los roles permitidos; los públicos no declaran seguridad.
- [ ] Cada endpoint documenta el caso feliz y al menos un caso de error (400/401/403/404) con el esquema de error de la API; p. ej. `POST /auth/login` con credenciales inválidas responde 401 con su mensaje en español, tal como lo devuelve la API.
- [ ] Existe `docs/openapi.html` autocontenido (se abre con doble clic, sin servidor) que muestra todos los endpoints agrupados por tag.
- [ ] `npm run docs:api -w @resttek/api` regenera el HTML sin pasos manuales.
- [ ] No se modifica código de la API ni se añaden dependencias a `dependencies`/`devDependencies` (la herramienta se invoca con `npx`).
- [ ] `CLAUDE.md` referencia la documentación OpenAPI.

## Riesgos y notas

- **Herramienta externa:** Node no tiene solución nativa para renderizar OpenAPI a HTML; se propone `@redocly/cli` vía `npx` (sin instalarlo en el proyecto). Alternativa: HTML escrito a mano que cargue Redoc desde CDN (necesita red al abrirlo).
- **Mantenimiento manual:** el YAML puede desincronizarse del código; el script `docs:api` mitiga solo la parte HTML.
- **Mensajes de error:** en T1 hay que copiar los mensajes reales de `DomainErrors`/controllers, no inventarlos.
- Las tareas T6-T11 dependen de T2-T5 (esquemas referenciados con `$ref`).
- Los pedidos no validan rol ni restaurante (gap conocido); se documenta el comportamiento actual con una nota.
