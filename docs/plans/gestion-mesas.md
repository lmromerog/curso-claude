# Plan: Gestión de mesas

**Tipo:** feature

## Objetivo

Permitir gestionar las mesas de cada restaurante (issue #5): el administrador hace el CRUD, los empleados ven y cambian su estado y consultan los pedidos de las mesas ocupadas, y el cliente elige mesa según el número de comensales antes de ir a la carta.

## Alcance

- **Incluye:**
  - **Contrato primero:** `docs/gestion-mesas.openapi.yaml`, separado de `docs/openapi.yaml`, acordado entre los agentes de API y de los tres frontales antes de implementar.
  - **API:** tabla `restaurant_tables` (`id`, `number`, `description`, `capacity`, `status` = `libre | ocupada | reservada`, `restaurantId`, fechas), CRUD de admin, cambio de estado por empleados, listado público de mesas libres filtrado por comensales, ocupación atómica por el cliente y `tableNumber` en los pedidos.
  - **web-admin:** CRUD de mesas por restaurante.
  - **web-empleados:** página de mesas con estados, cambio de estado y pedidos de las mesas ocupadas.
  - **web-clientes:** pasos "número de personas" → "elegir mesa" → carta, enviando `tableId` en el pedido.
  - Actualizar `CLAUDE.md` y `docs/openapi.yaml` (referencia al nuevo fichero).
- **No incluye:**
  - Sistema de reservas con fecha y hora (el estado `reservada` solo lo fija un empleado a mano).
  - Liberación automática de la mesa al entregar todos los pedidos.
  - Control de rol/restaurante en los endpoints de pedidos (gap conocido de `docs/revisiones/`).
  - Tests de los frontales (no existen en el proyecto).

## Tareas

Cada tarea dura entre 5 y 10 minutos y contiene un único cambio.

**Contrato (equipo completo)**

- [x] **T1** (~10 min) — Redactar el contrato de `docs/gestion-mesas.openapi.yaml`: esquemas `Table`, `CreateTableRequest`, `UpdateTableRequest`, `UpdateTableStatusRequest`, enum de estados y errores — `docs/gestion-mesas.openapi.yaml`
- [x] **T2** (~10 min) — Definir en el contrato las rutas de admin/empleados (`/restaurants/{restaurantId}/tables` GET/POST, `/{id}` GET/PUT/DELETE, `/{id}/status` PATCH) con roles y errores — `docs/gestion-mesas.openapi.yaml`
- [x] **T3** (~10 min) — Definir en el contrato las rutas de cliente (`GET /public/restaurants/{restaurantId}/tables?people=N`, `POST /restaurants/{restaurantId}/tables/{id}/occupy`) y `tableNumber` en `Order` — `docs/gestion-mesas.openapi.yaml`
- [x] **T4** (~5 min) — Validar el contrato con `npx @redocly/cli lint` y enlazarlo desde `docs/openapi.yaml` — `docs/gestion-mesas.openapi.yaml`

**API (`packages/api`)**

- [x] **T5** (~5 min) — Crear el modelo `Table` con `normalizeTableStatus` — `models/table.model.ts`
- [x] **T6** (~5 min) — Añadir errores de dominio (`TableNotFoundError`, `InvalidTableStatusError`, `InvalidTableCapacityError`, `TableNumberAlreadyExistsError`, `TableNotAvailableError`) y mapearlos a 404/409 — `errors/DomainErrors.ts`, `errorHandler.ts`
- [x] **T7** (~5 min) — Crear la tabla `restaurant_tables` con `UNIQUE(restaurant_id, number)` — `config/database.ts`
- [x] **T8** (~10 min) — Implementar `SqliteTableRepository` (`findById`, `findByRestaurantId`, `findAvailable(restaurantId, people)`, `save`, `delete`) — `repositories/table.repository.ts`
- [x] **T9** (~5 min) — Añadir `occupyIfFree` atómico (`UPDATE ... WHERE status = 'libre'`) al repositorio — `repositories/table.repository.ts`
- [x] **T10** (~5 min) — Crear el doble `MockTableRepository` — `repositories/mocks/MockTableRepository.ts`
- [x] **T11** (~10 min) — Implementar `TableService` con `create`, `update`, `delete`, `findByRestaurantId` y sus validaciones (capacidad > 0, número único) — `services/table.service.ts`
- [x] **T12** (~10 min) — Añadir a `TableService` `updateStatus`, `listAvailable(restaurantId, people)` y `occupy` — `services/table.service.ts`
- [x] **T13** (~10 min) — Implementar `TableController` usando `next(error)` y `errorHandler` — `controllers/table.controller.ts`
- [x] **T14** (~5 min) — Crear las rutas de admin/empleados con `authenticate` y `authorize` — `routes/table.routes.ts`
- [x] **T15** (~5 min) — Crear la ruta pública de mesas libres y la ruta `occupy` del cliente — `routes/table.public.routes.ts`, `routes/table.routes.ts`
- [x] **T16** (~5 min) — Montar las rutas en `app.ts` — `app.ts`
- [x] **T17** (~10 min) — Validar en `OrderService.create` que `tableId`, si llega, existe en el restaurante y está `ocupada` — `services/order.service.ts`
- [x] **T18** (~10 min) — Devolver `tableNumber` en los pedidos (JOIN con `restaurant_tables`) — `repositories/order.repository.ts`, `models/order.model.ts`
- [x] **T19** (~5 min) — Añadir mesas al seed (idempotente) — `scripts/seed.ts`

**web-admin**

- [x] **T20** (~5 min) — Crear modelo y servicio HTTP de mesas — `features/tables/models`, `features/tables/services`
- [x] **T21** (~10 min) — Crear `TableStore` con señales — `features/tables/store/table.store.ts`
- [x] **T22** (~10 min) — Crear la página de listado con borrado — `features/tables/pages/table-list`
- [x] **T23** (~10 min) — Crear el formulario de alta/edición — `features/tables/pages/table-form`
- [x] **T24** (~5 min) — Registrar rutas lazy y enlace en el dashboard del restaurante — `features/tables/tables.routes.ts`, `app.routes.ts`

**web-empleados**

- [x] **T25** (~5 min) — Crear modelo, servicio y `TableStore` (con polling como `OrderStore`) — `features/tables/`
- [x] **T26** (~10 min) — Crear la página de mesas con estados y cambio de estado — `features/tables/pages/mesas`
- [x] **T27** (~10 min) — Mostrar en cada mesa ocupada sus pedidos activos (cruce por `tableId`) — `features/tables/pages/mesas`
- [x] **T28** (~5 min) — Registrar la ruta `/mesas` y el enlace del menú — `app.routes.ts`, `core/layout/shell.component`

**web-clientes**

- [x] **T29** (~5 min) — Crear modelo y servicio de mesas — `core/models/table.model.ts`, `core/services/table.service.ts`
- [x] **T30** (~10 min) — Crear el paso "número de personas" y mostrar las mesas libres válidas — `features/tables/table-select.component.ts`
- [x] **T31** (~10 min) — Al continuar, llamar a `occupy`, guardar la mesa en `CartStore` y navegar a la carta — `features/tables/`, `core/store/cart.store.ts`
- [x] **T32** (~5 min) — Enviar `tableId` al crear el pedido y redirigir a la selección si no hay mesa — `core/services/order.service.ts`, `features/cart/cart.component.ts`

**Verificación**

- [x] **T33** (~10 min) — Probar con `curl` los endpoints contra el contrato y la ocupación concurrente — API
- [x] **T34** (~5 min) — Actualizar `docs/openapi.yaml`/`openapi.html` (`docs:api`) y `CLAUDE.md` (tablas, rutas, estados) — `docs/`, `CLAUDE.md`


- [x] Dado un admin, cuando hace `POST /restaurants/{id}/tables` con número, descripción y capacidad válidos, entonces responde 201 con la mesa en estado `libre`.
- [x] Dado un número de mesa ya existente en el restaurante, cuando se crea otra igual, entonces responde 400/409 con un mensaje en español.
- [x] Dada una capacidad menor que 1, cuando se crea o edita una mesa, entonces se rechaza con un mensaje en español.
- [x] Dado un cliente, cuando consulta `GET /public/restaurants/{id}/tables?people=4`, entonces solo recibe mesas `libre` con capacidad ≥ 4.
- [x] Dado un cliente, cuando llama a `occupy` sobre una mesa libre, entonces pasa a `ocupada`; si otra petición la ocupa antes, responde 409 "La mesa ya no está disponible".
- [x] Dado un empleado (admin, manager o camarero), cuando cambia el estado de una mesa a `libre`, `ocupada` o `reservada`, entonces se guarda; un estado inválido responde 400 con mensaje en español.
- [x] Dado un pedido con `tableId` de una mesa no ocupada o de otro restaurante, cuando se crea, entonces se rechaza.
- [ ] Dado un empleado, cuando abre `/mesas` en web-empleados, entonces ve las mesas con su estado y, en las ocupadas, el estado de sus pedidos.
- [ ] Dado un cliente, cuando elige restaurante, indica personas y mesa y pulsa continuar, entonces la mesa queda ocupada y llega a la carta; el pedido enviado lleva su `tableId`.
- [x] `docs/gestion-mesas.openapi.yaml` pasa el lint y coincide con las rutas, roles y errores implementados.
- [x] `npm test` de la API está en verde y las tres apps Angular compilan.
- [x] Se respetan las convenciones del proyecto (capas, clases, acceso a SQLite solo desde `repositories`, sin dependencias nuevas).

## Riesgos y notas

- **Equipo de agentes:** API, web-admin, web-empleados y web-clientes trabajan en paralelo tras cerrar T1-T4. Ningún frontal debe cambiar el contrato sin pasar por los demás; los cambios se acuerdan por mensaje.
- **Convención de nombres:** la skill pide métodos en `snake_case`, pero el código existente usa `camelCase` (`findById`, `updateItemStatus`). Decisión pendiente; se propone seguir el código existente.
- **Esquema sin migraciones:** `CREATE TABLE IF NOT EXISTS` crea `restaurant_tables` en bases existentes, pero `orders.table_id` no tiene FK y no se añade para evitar tocar el `.db` existente.
- **Pedidos sin control de restaurante** (gap conocido): la validación de T17 es la única comprobación de pertenencia de la mesa.
- **Mesas abandonadas:** si el cliente ocupa una mesa y no pide, queda `ocupada` hasta que un empleado la libere. Fuera de alcance; se resuelve a mano.
- **Rango de tiempo:** T22, T26 y T30 están en el límite de 10 min; si se pasan, dividir.
