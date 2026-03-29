# TiendaShop — Tasks

Regla: una task a la vez, completa y funcional antes de pasar a la siguiente.
Cada task es un módulo — cuando termina, algo nuevo funciona end-to-end.

---

## Índice

- [x] TASK-01 — Setup del proyecto
- [x] TASK-02 — Auth (registro + login + sesión)
- [x] TASK-03 — Dashboard layout + protección de rutas\*\*
- [x] TASK-04 — Onboarding + OAuth con Tiendanube
- [x] TASK-05 — OAuth callback (tokens + crear store)
- [x] TASK-06 — Sync de productos
- [x] TASK-07 - Mejorar la UX del sync inicial/manual de productos
- [x] TASK-08 — Dashboard productos
- [x] TASK-09-10 — Home público
- [x] TASK-11 — Implementar páginas de entidad públicas: tienda y producto.
- [x] TASK-12 — Implementar Filtros en paginas.
- [x] TASK-13 -Implementar páginas públicas de categoría con URLs jerárquicas.
- [x] TASK-14 - Implementar métricas básicas de clicks en el dashboard
- [ ] TASK-15 -**Implementar toggle publish/unpublish por producto usando `merchant_status`** ← actual

---

## TASK-03 — Dashboard layout + protección de rutas

### Objetivo

Construir el layout del dashboard y proteger las rutas con sesión activa.
La validación de store conectada se agrega en TASK-05, cuando exista el OAuth.

### Contexto importante

El dashboard es exclusivo para usuarios con tienda conectada via OAuth de Tiendanube.
Ese flujo completo se implementa en TASK-04 y TASK-05.
En esta task solo se valida que haya sesión activa.

### Skills a usar antes de implementar

- Leer `.agents/skills/nextjs-best-practices/SKILL.md`
- Leer `.agents/skills/frontend-design/SKILL.md`
- Usar Context7 MCP para documentación actualizada de Next.js

### Archivos a crear

```
app/(dashboard)/dashboard/layout.tsx
app/(dashboard)/dashboard/page.tsx
lib/auth/require-user.ts            (si no existe)
lib/auth/get-current-membership.ts  (opcional, se usará en TASK-05)
components/dashboard/sidebar.tsx
components/dashboard/header.tsx
```

### Comportamiento esperado

**Protección de rutas:**

- Cualquier ruta bajo `(dashboard)` requiere sesión activa
- Sin sesión → redirigir a `/auth/login`
- La verificación de store conectada se implementa en TASK-05

**Layout:**

- Sidebar izquierdo con navegación
- Header superior con nombre del usuario y botón cerrar sesión
- Área de contenido principal a la derecha
- Responsive: sidebar colapsable en mobile

**Sidebar — links de navegación:**

- Resumen → `/dashboard`
- Productos → `/dashboard/productos`
- Configuración → `/dashboard/configuracion`
- Indicador visual de ruta activa

**Header:**

- Nombre o email del usuario actual
- Botón "Cerrar sesión" → llama a Server Action `signOut()` de `lib/actions/auth.ts`

**Página `/dashboard`:**

- Placeholder simple: "Bienvenido" + nombre del usuario
- Sin lógica de datos todavía — eso es TASK-07

### Criterios de diseño

- Usar componentes de shadcn/ui
- Sidebar limpio, sin íconos decorativos innecesarios
- Colores neutros — el contenido es lo importante
- Textos en español
- Sin animaciones ni transiciones por ahora

### Lo que NO hacer en esta task

- No validar si el usuario tiene store conectada — eso es TASK-05
- No implementar el botón "Publicar mi tienda" — eso es TASK-09
- No implementar el OAuth ni el callback — eso es TASK-04 y TASK-05
- No agregar datos reales al dashboard — eso es TASK-07
- No crear páginas de productos ni configuración — solo los links en el sidebar

### Resultado esperado al terminar

- Usuario con sesión activa accede a `/dashboard` y ve el layout completo con sidebar y header
- Usuario sin sesión intenta entrar a `/dashboard` → redirigido a `/login`

## TASK-04 real: unlock dashboard only after Tiendanube connection

Regla principal

- El dashboard NO es para cualquier usuario registrado
- El dashboard solo se habilita para usuarios que ya conectaron una tienda Tiendanube
- No quiero bootstrap merchant manual desde dashboard
- El botón para iniciar esto vive en la parte pública

Flujo correcto

1. usuario en pantalla pública ve CTA “Conectar tienda”
2. inicia OAuth con Tiendanube
3. acepta en Tiendanube
4. vuelve a mi app por callback
5. en callback se persiste todo lo necesario
6. recién ahí queda habilitado `/dashboard`

Objetivo de esta tarea
Implementar el flujo base de OAuth Tiendanube + persistencia mínima + guard de acceso al dashboard

Alcance

1. CTA pública “Conectar tienda”
2. route handler para iniciar OAuth Tiendanube
3. route handler callback Tiendanube
4. persistencia mínima al volver del callback:
   - organization
   - organization_members
   - store
   - actualización de users.role si sigue aplicando
5. guard para dashboard:
   - usuario autenticado
   - con acceso real por tienda conectada
   - si no cumple, no entra
6. CTA pública "Conectar tienda":

- vive en app/(public)/conectar/page.tsx (ya existe, está vacío)
- página simple con título, descripción breve y botón que inicia el OAuth
- si no hay sesión → redirigir a /login con ?next=/conectar para volver después

### Archivos a crear/modificar

- app/(public)/conectar/page.tsx
- app/api/tiendanube/connect/route.ts
- app/api/tiendanube/callback/route.ts
- lib/auth/get-current-membership.ts ← solo si falta o hay que ajustarlo
- app/(dashboard)/dashboard/layout.tsx ← agregar guard de acceso real al dashboard

Decisiones ya tomadas

- usuarios arrancan iguales
- pasan a merchant después de conectar tienda
- dashboard solo para quienes tienen tienda
- server components por defecto
- server actions para mutaciones cuando corresponda
- admin client solo backend seguro
- no usar service role en frontend
- código en inglés
- UI en español

Importante

- no implementar todavía sync completo
- no agregar lógica de trial/billing/permisos complejos
- no meter checks pesados en layout sin necesidad
- no inventar onboarding manual previo al OAuth

Quiero en la respuesta

1. archivos creados/modificados
2. decisiones breves
3. código o diff final
4. confirmar `pnpm exec tsc --noEmit`

Regla del guard de dashboard

- usuario autenticado
- membership existente
- store conectada y no eliminada
- si no cumple → redirect("/")

## TASK-06: sync inicial de productos desde Tiendanube

Objetivo
Implementar la sincronización inicial de productos desde una tienda Tiendanube ya conectada.

Alcance

1. traer productos desde la API de Tiendanube
2. persistir en DB:
   - `public.products`
   - `public.product_variants`
   - `public.product_images`
3. dejar el sync listo para correrse manualmente desde dashboard
4. no implementar todavía búsqueda pública, scoring, publicación fina ni webhooks

Contexto ya resuelto

- OAuth Tiendanube funcionando
- callback crea:
  - `organizations`
  - `organization_members`
  - `stores`
- dashboard solo accesible para usuarios con tienda conectada
- `users.role` pasa a `owner` al conectar tienda

Decisiones a respetar

- código en inglés
- UI en español
- Server Components por defecto
- Server Actions para mutaciones
- `lib/services` para lecturas/lógica reusable
- no usar service role en frontend
- usar `supabaseAdmin` solo en backend seguro si realmente hace falta
- cambios chicos, auditables
- no sobrecomplicar

Objetivo funcional exacto
Desde el dashboard, el usuario debe poder disparar una sincronización manual de sus productos de Tiendanube y guardarlos en la base.

Flujo esperado

1. usuario entra al dashboard
2. ve su tienda conectada
3. hace click en “Sincronizar productos”
4. se llama una Server Action
5. la action:
   - identifica la tienda conectada del usuario
   - usa el `access_token` guardado
   - consulta la API de Tiendanube
   - upsertea productos
   - reemplaza/actualiza variantes
   - reemplaza/actualiza imágenes
6. devuelve resultado simple:
   - cantidad de productos procesados
   - cantidad de variantes
   - cantidad de imágenes
   - error claro si falla

Archivos a crear/modificar
Sugeridos:

- `lib/actions/tiendanube-sync.ts`
- `lib/tiendanube/client.ts`
- `lib/tiendanube/types.ts` ← si no quedó ya creado en la task anterior
- `app/(dashboard)/dashboard/page.tsx` ← agregar botón y estado simple
- opcional: `lib/services/store-service.ts` o similar si ayuda a ordenar

Implementación esperada

A) Cliente/helper Tiendanube
Crear helper reusable para requests autenticadas a Tiendanube.

Debe:

- recibir `access_token`
- setear headers correctos
- manejar errores HTTP
- parsear JSON de forma segura

B) Sync action
Crear una Server Action para sync manual.

Debe:

1. validar usuario autenticado
2. obtener membership actual
3. obtener store activa de esa organización
4. validar que tenga `access_token`
5. pedir productos a Tiendanube
6. persistir:
   - `products`
   - `product_variants`
   - `product_images`

C) Persistencia
Tabla `products`

- upsert por:
  - `(store_id, tiendanube_product_id)`
- mapear mínimo:
  - `store_id`
  - `tiendanube_product_id`
  - `title`
  - `description`
  - `brand`
  - `synced_at`

Tabla `product_variants`

- asociadas al producto local
- para cada variante guardar mínimo:
  - `product_id`
  - `tiendanube_variant_id`
  - `title`
  - `price`
  - `compare_price`
  - `stock`
  - `sku`
  - `attributes`

Tabla `product_images`

- asociadas al producto local
- guardar mínimo:
  - `product_id`
  - `url`
  - `position`
  - `width`
  - `height`
  - `is_external`

Regla importante de sync

- para variantes e imágenes, no quiero merges raros
- prefiero estrategia simple y confiable:
  - upsert producto
  - borrar variantes previas de ese producto
  - recrear variantes actuales
  - borrar imágenes previas de ese producto
  - recrear imágenes actuales

Eso simplifica muchísimo el primer sync.

D) Dashboard UI mínima
En `/dashboard/page.tsx`:

- mostrar nombre de tienda conectada
- mostrar dominio
- botón “Sincronizar productos”
- feedback simple:
  - sincronizando...
  - éxito
  - error

No hace falta tabla de productos todavía.

E) Resultado de la action
Devolver algo como:

- `productsProcessed`
- `variantsProcessed`
- `imagesProcessed`
- `error`

No tirar errores crudos al cliente.
Usar mensajes claros en español.

No hacer todavía

- categorías
- product_quality_flags
- scoring
- merchant_status custom
- system_status complejo
- search_vector tuning
- sincronización incremental
- webhooks
- publish/unpublish fino
- sync de colecciones/categorías TN
- paginación avanzada si no hace falta todavía
- jobs/background processing

Validaciones mínimas

- si no hay tienda conectada → error claro
- si falta token → error claro
- si Tiendanube responde error → log y mensaje claro
- si un producto no trae variantes o imágenes, no romper

Decisiones de implementación

- si la API de Tiendanube devuelve HTML en descripción, por ahora guardarla tal cual
- `title_normalized` no tocar ahora
- `search_vector` no tocar ahora
- `quality_score` no tocar ahora
- `merchant_status` y `system_status` dejar defaults de DB salvo necesidad mínima

Qué quiero en la respuesta

1. lista de archivos creados/modificados
2. decisiones breves
3. código o diff por archivo
4. confirmar `pnpm exec tsc --noEmit`

Importante
No cambies decisiones base.
No metas arquitectura extra.
No te adelantes a módulos futuros.
Implementá solo este sync inicial manual.

Ajustes:

1. Tomá esta task como la siguiente disponible en TASKS.md; no pises una task existente. Si hay desfase de numeración, alinealo con el índice actual.
2. Agregá paginación básica de Tiendanube: seguir pidiendo páginas hasta que no haya más resultados. Es requisito mínimo del sync inicial.
3. Para la sync action usá server client con sesión y RLS. No uses supabaseAdmin para este flujo manual.

Mantené el resto del alcance igual.

## TASK-07

Objetivo
Mejorar la UX del sync inicial/manual de productos mostrando progreso visible al usuario.

Alcance

1. Durante el sync mostrar estado visible:
   - pendiente
   - sincronizando
   - completado
   - error
2. Mostrar barra de progreso
3. Mostrar avance numérico:
   - X de Y productos
4. Mostrar resumen final:
   - productos nuevos
   - productos actualizados
   - productos fallidos
5. Reutilizar esto tanto para:
   - sync inicial automático post-OAuth
   - re-sync manual desde dashboard

Implementación esperada

- No usar realtime ni websockets
- No agregar jobs/colas/workers
- Resolver con polling simple desde frontend
- El backend debe ir actualizando progreso en DB por página/lote de sync
- Usar el componente Progress de shadcn/ui

Persistencia de progreso
Agregar en `stores` los campos mínimos necesarios para exponer progreso del sync, por ejemplo:

- `sync_status`
- `sync_error_message`
- `last_synced_at`
- `sync_total_products`
- `sync_processed_products`
- `sync_created_products`
- `sync_updated_products`
- `sync_failed_products`

Si alguno ya existe, reutilizarlo.
Si falta migración, crear migración chica y puntual.

Comportamiento esperado

1. Cuando empieza el sync:
   - store pasa a estado sincronizando
   - processed = 0
   - total = conocido apenas se pueda
2. En cada página/lote:
   - actualizar processed
   - actualizar created/updated/failed
3. Al finalizar:
   - estado completado si salió bien
   - estado error si hubo fallos
   - dejar resumen final visible
4. En dashboard:
   - si la tienda está sincronizando, el usuario debe ver progreso claro
   - si terminó, ver resumen final
   - si falló, ver mensaje claro

UI mínima
En `/dashboard/resumen` o donde ya se muestra la tienda:

- nombre de tienda
- dominio
- estado del sync
- barra de progreso
- texto tipo `200 de 500 productos`
- resumen:
  - nuevos
  - actualizados
  - fallidos
- botón de re-sync manual

No hace falta tabla compleja ni diseño extra.

Reglas

- No cambies el alcance
- No agregues features extra
- No modifiques decisiones base
- Respetá la estructura existente
- No dupliques lógica del sync
- El callback OAuth y el botón manual deben reutilizar el mismo servicio de sync

Output:

1. lista de archivos creados/modificados
2. decisiones (breve)
3. código o diff por archivo
4. confirmar `pnpm exec tsc --noEmit`

## TASK-08

Implementar listado de productos en el dashboard.

Objetivo
Mostrar los productos ya sincronizados desde Tiendanube en `/dashboard/productos`.

Alcance

- solo lectura
- no edición
- no filtros complejos
- no búsqueda avanzada
- paginación básica

Datos disponibles
Tablas:

- products
- product_variants
- product_images

Relaciones:

- products → tiene variantes e imágenes
- cada producto pertenece a una store
- store pertenece a una organization

Implementación

1. Backend (lectura)
   Crear función en:

- lib/services/products.ts

Debe:

- obtener usuario actual
- obtener organization actual
- obtener store activa
- traer productos de esa store

Campos mínimos por producto:

- id
- title
- brand
- created_at
- primera imagen (si existe)
- precio
- stock

Regla para precio/stock:

- “variante principal” = primera variante ordenada por precio asc
- si no hay variantes, mostrar precio y stock vacíos sin romper

2. Query

- no hacer N+1
- usar select con embed de Supabase en una sola query, trayendo:
  - products
  - product_variants
  - product_images
- ejemplo esperado: query embebida tipo `.select(... product_variants(...), product_images(...))`
- seleccionar solo lo necesario

3. Paginación

- implementar paginación básica
- límite: 50 productos por página
- usar offset simple
- ordenar por `created_at desc`

4. UI
   Archivo:

- app/(dashboard)/dashboard/productos/page.tsx

Mostrar:

- lista o tabla simple
- cada producto:
  - imagen (thumbnail)
  - nombre
  - precio
  - stock
  - marca (opcional)

5. UX mínima

- loading state
- empty state:
  - “No tenés productos todavía”
- error state simple
- controles básicos de paginación si aplica

6. Reglas

- no usar supabaseAdmin en frontend
- usar server component para la página
- no agregar librerías nuevas
- no refactorizar sync
- no implementar edición
- no implementar search todavía

No hacer

- categorías
- filtros
- calidad
- estados publish
- scoring
- marketplace features

Output esperado

1. archivos creados/modificados
2. decisiones breves
3. código o diff por archivo
4. confirmar `pnpm exec tsc --noEmit`

## TASK 09-10 Implementar el catálogo público global — home y búsqueda.

## Objetivo

Mostrar productos de todas las tiendas sincronizadas en una interfaz pública.
Esta es la pantalla principal de la plataforma — lo que ve cualquier visitante al entrar.

---

## Contexto

- Los productos ya están en DB, sincronizados desde Tiendanube
- Solo mostrar productos con `merchant_status = 'active'` y `system_status = 'visible'`
- Solo de stores con `deleted_at IS NULL` y `sync_status != 'disabled'`
- No llamar a la API de Tiendanube — solo leer DB local
- La búsqueda usa `search_vector` (tsvector ya generado en DB)

---

## Rutas

- `/` → home con productos y buscador
- `/buscar` → resultados de búsqueda (`?q=...`)

---

## Alcance

### 1. Home `/`

- Buscador prominente (input de texto)
- Al hacer submit → navegar a `/buscar?q=...`
- Listado de productos recientes (sin query, ordenados por `created_at desc`)
- CTA visible: "Publicar mi tienda" → `/conectar`
- SSR — no client-side fetching

### 2. Búsqueda `/buscar`

- Recibe `?q=` como query param
- Búsqueda full-text usando `plainto_tsquery('simple', query)` — no usar `to_tsquery` porque rompe con espacios e input de usuario
- Ordenar resultados por `ts_rank(search_vector, plainto_tsquery('simple', query)) desc`
- Si `q` está vacío → mostrar todos los productos ordenados por `created_at desc`
- SSR — la página es indexable por Google
- Metadata dinámica: `<title>` con el término buscado
- Empty state con el término: `No encontramos resultados para "{q}"`

### 3. Product card

Componente reutilizable `components/product/product-card.tsx`:

- imagen principal (primera de `product_images` por `position asc`)
- nombre del producto (`title`)
- precio (`price_min` — ya calculado por trigger)
- nombre de la tienda
- click → `/api/r/[productId]?q=...&from=search&pos=N`

---

## Backend

### `lib/services/search.ts`

Crear función:

```ts
getProducts(query?: string, limit?: number): Promise<ProductWithStore[]>
```

Debe:

- si hay `query`:
  - filtrar con `search_vector @@ plainto_tsquery('simple', query)`
  - ordenar por `ts_rank(search_vector, plainto_tsquery('simple', query)) desc`
- si no hay `query`: ordenar por `created_at desc`
- join con `stores` para traer nombre de tienda
- imagen principal: `product_images` con `order by position asc limit 1` por producto
- usar `price_min` directo desde `products` (no calcular acá)
- filtros siempre activos:
  - `products.merchant_status = 'active'`
  - `products.system_status = 'visible'`
  - `stores.deleted_at IS NULL`
  - `stores.sync_status != 'disabled'`
- límite default: 48 productos
- no hacer N+1

Índice requerido — verificar que exista, crear migración si falta:

```sql
CREATE INDEX IF NOT EXISTS idx_products_search_vector
ON products USING GIN (search_vector);
```

---

## UI

- usar componentes de shadcn/ui existentes
- leer `.agents/skills/frontend-design/SKILL.md` antes de implementar
- textos en español
- sin animaciones ni transiciones por ahora

### Estados necesarios

- **loading**: Suspense con skeleton cards
- **empty**: `No encontramos resultados para "{q}"`
- **error**: mensaje simple, sin stack trace

---

## Redirect tracking

El click en un producto debe pasar por `/api/r/[productId]`.

Si el endpoint no existe todavía, crearlo en esta task:

`app/api/r/[productId]/route.ts`

Debe:

1. recibir query params: `?q=`, `?from=`, `?pos=`
2. insertar en `redirect_events`:
   - `product_id`
   - `store_id`
   - `user_id` (si hay sesión, nullable)
   - `session_id` (desde cookie, siempre presente)
   - `query_origin` (desde `?q=`)
   - `source_type` (desde `?from=`)
   - `result_position` (desde `?pos=`)
3. redirigir a la URL de la tienda original (302)
4. responder siempre con redirect aunque falle el log — nunca bloquear al usuario

`session_id`:

- leer desde cookie `session_id`
- si no existe, generar con `crypto.randomUUID()` y persistir en cookie con `maxAge` largo
- no regenerar en cada request — siempre reusar el existente

---

## SEO

- `generateMetadata` en `/buscar` con el término buscado
- URLs legibles y sin parámetros innecesarios
- SSR obligatorio — no usar client fetching para el listado principal

---

## No hacer

- filtros por categoría, precio, marca — task posterior
- página `/categoria/[slug]` — task posterior
- página `/tienda/[slug]` — task posterior
- página `/producto/[id]` — task posterior
- carrito, checkout, pagos
- autenticación obligatoria para ver productos
- ranking avanzado — `ts_rank` es suficiente ahora
- infinite scroll — límite fijo de 48

---

## Skills a usar antes de implementar

- Leer `.agents/skills/nextjs-best-practices/SKILL.md`
- Leer `.agents/skills/frontend-design/SKILL.md`
- Usar Context7 MCP para documentación actualizada de Next.js

---

## Archivos a crear/modificar

```
app/(public)/page.tsx                     ← home
app/(public)/buscar/page.tsx              ← resultados
components/product/product-card.tsx       ← card reutilizable
components/product/product-grid.tsx       ← grilla de cards
components/search/search-input.tsx        ← input con submit
lib/services/search.ts                    ← lógica de búsqueda
app/api/r/[productId]/route.ts            ← redirect tracking (si no existe)
```

---

## Output esperado

1. archivos creados/modificados
2. decisiones breves
3. código o diff por archivo
4. confirmar `pnpm exec tsc --noEmit`

---

## Reglas

- no refactor de lo que ya funciona
- no tocar sync ni dashboard
- cambios chicos y auditables
- no inventar features fuera del alcance

---

## TASK 11 Implementar páginas de entidad públicas: tienda y producto.

---

## Objetivo

Crear las páginas públicas de tienda individual y producto individual.
Dependen del catálogo global (home + búsqueda) que ya está funcionando.

---

## Contexto

- Productos, variantes e imágenes ya están en DB
- Filtros públicos ya definidos en `lib/services/search.ts`:
  - `merchant_status = 'active'`
  - `system_status = 'visible'`
  - `has_stock = true`
  - `price_min > 0`
  - al menos una imagen
  - store activa
- Reutilizar los mismos filtros en estas páginas — no duplicar lógica
- No llamar a la API de Tiendanube — solo leer DB local

---

## Rutas

- `/tienda/[slug]` → catálogo de una tienda específica
- `/producto/[id]` → detalle de un producto

---

## Alcance

### 1. Página de tienda `/tienda/[slug]`

Mostrar:

- nombre de la tienda
- dominio como link externo con `target="_blank" rel="noopener noreferrer"`
- grilla de productos de esa tienda

Productos:

- mismos filtros públicos que home/búsqueda
- ordenados por `created_at desc`
- límite de 48 productos
- reutilizar `ProductCard` y `ProductGrid` con `source="store"`

Metadata dinámica:

- `<title>` con nombre de la tienda
- `<description>` simple

Si la tienda no existe o está inactiva → `notFound()`

### 2. Página de producto `/producto/[id]`

Mostrar:

- nombre del producto
- marca (si existe)
- precio desde `price_min` — no traer variantes, ya está calculado
- stock desde `has_stock` — no traer variantes, ya está calculado
- galería de imágenes (todas las de `product_images` ordenadas por `position asc`)
- nombre de la tienda con link a `/tienda/[slug]`
- botón "Comprar" → `/api/r/[productId]?from=product&pos=0`

Si el producto no existe o no cumple filtros públicos → `notFound()`

Metadata dinámica:

- `<title>` con nombre del producto
- `<description>` con descripción truncada si existe

---

## Backend

### `lib/services/stores.ts`

Dos funciones separadas:

```ts
getStoreBySlug(slug: string): Promise<Store | null>
```

- buscar store por `slug`
- validar que `deleted_at IS NULL` y `sync_status != 'disabled'`
- traer solo campos de la tienda — sin productos

```ts
getPublicProductsByStoreId(storeId: string, limit?: number): Promise<ProductWithStore[]>
```

- traer productos de esa store con los mismos filtros públicos
- join con `product_images` para imagen principal (`position asc limit 1`)
- no hacer N+1
- límite default: 48

### `lib/services/products.ts`

```ts
getPublicProductById(id: string): Promise<ProductWithDetails | null>
```

Debe:

- buscar producto por `id`
- aplicar mismos filtros públicos
- join con `stores` para nombre y slug
- join con `product_images` todas, ordenadas por `position asc`
- NO traer `product_variants` — usar `price_min` y `has_stock` directo desde `products`
- retornar `null` si no cumple filtros

---

## UI

- reutilizar `ProductCard` y `ProductGrid` donde aplique
- leer `.agents/skills/frontend-design/SKILL.md` antes de implementar
- textos en español
- sin animaciones ni transiciones
- sin diseño complejo — funcional y limpio

### Estados necesarios

- **not found**: usar `notFound()` de Next.js
- **empty** (tienda sin productos visibles): "Esta tienda no tiene productos disponibles por el momento"

---

## SEO

- `generateMetadata` en ambas páginas
- `generateStaticParams` NO — SSR con cache
- URLs limpias: `/tienda/nombre-tienda`, `/producto/uuid`

---

## No hacer

- carrito, checkout, pagos
- variantes seleccionables — mostrar solo `price_min`
- reviews o comentarios
- productos relacionados
- infinite scroll o paginación — límite fijo de 48
- compartir en redes
- favoritos

---

## Skills a usar antes de implementar

- Leer `.agents/skills/nextjs-best-practices/SKILL.md`
- Leer `.agents/skills/frontend-design/SKILL.md`
- Usar Context7 MCP para documentación actualizada de Next.js

---

## Archivos a crear/modificar

```
app/(public)/tienda/[slug]/page.tsx       ← página de tienda
app/(public)/producto/[id]/page.tsx       ← página de producto
lib/services/stores.ts                    ← getStoreBySlug + getPublicProductsByStoreId
lib/services/products.ts                  ← getPublicProductById
```

---

## Output esperado

1. archivos creados/modificados
2. decisiones breves
3. código o diff por archivo
4. confirmar `pnpm exec tsc --noEmit`

---

## Reglas

- no duplicar filtros públicos — extraer a constante compartida si hace falta
- no tocar sync ni dashboard
- no refactor de lo que ya funciona
- cambios chicos y auditables
- no inventar features fuera del alcance

## TASK 12 Implementar filtros públicos iniciales siguiendo este patrón de UX:

- categorías visibles en row horizontal
- filtros secundarios dentro de un sheet

---

## Objetivo

Mejorar discovery/navegación pública sin sobrecargar la UI.

---

## Alcance

### 1. Home `/`

- mostrar categorías globales en row horizontal visible
- al hacer click en una categoría → filtrar productos por esa categoría
- usar query param en URL: `/?category=moda`
- no agregar sheet de filtros en home todavía
- mantener CTA "Publicar mi tienda"

### 2. Búsqueda `/buscar`

- mostrar categorías globales en row horizontal visible
- agregar botón "Filtros"
- al hacer click → abrir sheet con rango de precio y orden

### 3. Tienda `/tienda/[slug]`

- mostrar solo categorías presentes en los productos visibles de esa tienda
- agregar botón "Filtros"
- al hacer click → abrir sheet con rango de precio y orden

---

## Patrón UX

- categorías = navegación primaria visible en row horizontal
- precio/orden = filtros secundarios dentro de sheet
- no meter categorías dentro del sheet
- usar query params para persistir estado en URL

---

## Query params

```
category=moda
minPrice=1000
maxPrice=5000
sort=relevance | newest | price_asc | price_desc
page=1
```

---

## Reglas de navegación

- al cambiar cualquier filtro o categoría → resetear `page=1`
- al limpiar filtros → preservar `q` si existe, resetear `page=1`

---

## Importante — SSR y client components

El filtrado es siempre SSR:

- las pages leen `searchParams` y pasan los filtros al service
- el fetch nunca ocurre en client components
- `CategoryRow` y `FilterSheet` solo manejan navegación de URL — no hacen fetch

```
searchParams → service (server) → props → componentes (client solo para UI)
```

---

## Lógica de categoría efectiva

Usar siempre:

```sql
coalesce(manual_category_id, auto_category_id)
```

No duplicar esta lógica — extraer a constante o helper reutilizable si hace falta.

---

## Reglas de ordenamiento

```ts
// sort=relevance → solo si hay q (búsqueda full-text con ts_rank)
// si sort=relevance y no hay q → ignorar, usar created_at desc
// NUNCA pasar ts_rank sin query — explota en runtime

// sort=newest       → order by created_at desc
// sort=price_asc    → order by price_min asc
// sort=price_desc   → order by price_min desc
// default (sin sort) → created_at desc
```

---

## Componentes nuevos

### `components/category/category-row.tsx`

Client component (`'use client'`).

- row horizontal con `overflow-x-auto`
- pill/badge por categoría
- estado activo visible (categoría seleccionada)
- al hacer click → actualizar URL con `?category=slug` usando `useRouter` + `useSearchParams`
- al hacer click en categoría ya activa → limpiar filtro (quitar param)
- reutilizable en home, búsqueda y tienda
- recibe `categories` como prop — no hace fetch

Props:

```ts
interface CategoryRowProps {
  categories: { slug: string; name: string }[]
  activeCategory?: string  // leído desde searchParams por el padre, pasado como prop
}
```

### `components/filters/filter-sheet.tsx`

Client component (`'use client'`).

- botón "Filtros" que abre el sheet
- estado local mientras el sheet está abierto
- los filtros NO se aplican on-change — solo al confirmar con "Aplicar"
- al aplicar → actualizar URL con query params
- al limpiar → quitar minPrice, maxPrice, sort de URL (preservar q y category)

Contenido del sheet:

- Orden: selector con opciones `Más recientes | Precio: menor a mayor | Precio: mayor a menor | Más relevantes (solo si hay búsqueda)`
- Precio mínimo: input numérico
- Precio máximo: input numérico
- Botón "Aplicar"
- Botón "Limpiar filtros"

Props:

```ts
interface FilterSheetProps {
  hasQuery?: boolean  // si es true, mostrar opción "Más relevantes" en orden
}
```

---

## Backend — services a ajustar

### `lib/services/search.ts` — `getProducts`

Agregar parámetros:

```ts
getProducts(params: {
  query?: string
  category?: string      // slug de categoría
  minPrice?: number
  maxPrice?: number
  sort?: 'relevance' | 'newest' | 'price_asc' | 'price_desc'
  limit?: number
}): Promise<ProductWithStore[]>
```

Filtros a aplicar:

- `category` → filtrar por `coalesce(manual_category_id, auto_category_id)` join con `categories.slug`
- `minPrice` → `price_min >= minPrice`
- `maxPrice` → `price_min <= maxPrice`
- `sort` → según reglas de ordenamiento definidas arriba

### `lib/services/stores.ts` — dos funciones nuevas

```ts
// categorías presentes en productos visibles de una tienda
getCategoriesByStore(storeId: string): Promise<{ slug: string; name: string }[]>
// solo categorías con al menos 1 producto visible en esa store
// "visible" = merchant_status=active, system_status=visible, has_stock=true, price_min>0, al menos 1 imagen

// productos de tienda con filtros
getPublicProductsByStoreId(storeId: string, params: {
  category?: string
  minPrice?: number
  maxPrice?: number
  sort?: 'newest' | 'price_asc' | 'price_desc'  // sin relevance — no hay full-text en tienda
  limit?: number
}): Promise<ProductWithStore[]>
```

### `lib/services/categories.ts` — función nueva

```ts
// todas las categorías globales para home y búsqueda
// ya existe getAllCategories — verificar si alcanza o necesita ajuste
getPublicCategories(): Promise<{ slug: string; name: string }[]>
// solo categorías con al menos 1 producto visible en toda la plataforma
```

---

## Pages a modificar

### `app/(public)/page.tsx`

- leer `searchParams.category`
- pasar a `getProducts({ category })`
- renderizar `<CategoryRow>` arriba del grid con categorías globales
- pasar `activeCategory={searchParams.category}` al row

### `app/(public)/buscar/page.tsx`

- leer `searchParams`: `category`, `minPrice`, `maxPrice`, `sort`
- pasar a `getProducts({ query, category, minPrice, maxPrice, sort })`
- renderizar `<CategoryRow>` + botón/componente `<FilterSheet hasQuery={!!query}>`
- pasar `activeCategory={searchParams.category}` al row

### `app/(public)/tienda/[slug]/page.tsx`

- leer `searchParams`: `category`, `minPrice`, `maxPrice`, `sort`
- pasar a `getPublicProductsByStoreId(storeId, { category, minPrice, maxPrice, sort })`
- cargar categorías de esa tienda con `getCategoriesByStore`
- renderizar `<CategoryRow>` + `<FilterSheet>`
- pasar `activeCategory={searchParams.category}` al row

---

## No hacer

- filtros por color, talla, sexo
- filtros por oferta o más vendidos
- sidebar compleja
- infinite scroll
- páginas `/categoria/[slug]`
- fetch en client components
- sort=relevance en tienda — no hay full-text por tienda

---

## Skills a usar antes de implementar

- Leer `.agents/skills/nextjs-best-practices/SKILL.md`
- Leer `.agents/skills/frontend-design/SKILL.md`
- Usar Context7 MCP para documentación de Next.js `searchParams` en App Router

---

## Archivos a crear/modificar

```
components/category/category-row.tsx          ← nuevo, client component
components/filters/filter-sheet.tsx           ← nuevo, client component
lib/services/search.ts                        ← agregar filtros a getProducts
lib/services/stores.ts                        ← getCategoriesByStore + filtros en getPublicProductsByStoreId
lib/services/categories.ts                    ← getPublicCategories
app/(public)/page.tsx                         ← searchParams + CategoryRow
app/(public)/buscar/page.tsx                  ← searchParams + CategoryRow + FilterSheet
app/(public)/tienda/[slug]/page.tsx           ← searchParams + CategoryRow + FilterSheet
```

---

## Output esperado

1. archivos creados/modificados
2. decisiones breves
3. diff o código por archivo
4. confirmar `pnpm exec tsc --noEmit`

---

## Reglas

- filtrado siempre SSR — nunca fetch en client components
- categoría efectiva siempre con coalesce(manual, auto)
- sort=relevance solo cuando hay query — nunca sin ella
- no romper búsqueda ni páginas existentes
- no tocar sync ni dashboard
- cambios chicos y auditables
- textos en español

---

## TASK 13 Implementar páginas públicas de categoría con URLs jerárquicas.

## Objetivo

Agregar navegación SEO-friendly por categorías públicas usando la taxonomía ya cargada en DB.

---

## Importante

- El modelo interno de categorías sigue siendo flexible (`categories` + `parent_id`)
- Solo la URL pública será jerárquica
- Soportar ambos niveles:
  - `/categoria/[slug]`
  - `/categoria/[parentSlug]/[childSlug]`

No ocultar categorías/subcategorías por cantidad de productos.
Si una categoría existe pero no tiene productos visibles, mostrar empty state.

---

## Rutas a implementar

### 1. `/categoria/[slug]`

- categoría principal
- mostrar productos de esa categoría principal
- incluir también productos de sus subcategorías hijas

### 2. `/categoria/[parentSlug]/[childSlug]`

- subcategoría
- validar que `childSlug` pertenezca a `parentSlug`
- si `parentSlug` existe pero `childSlug` no le pertenece → `notFound()`
- ejemplo: `/categoria/moda/tornillos` → `notFound()` aunque "tornillos" exista bajo otra categoría
- mostrar solo productos de esa subcategoría

Si la categoría no existe → `notFound()`

---

## Contexto

- Las tablas `categories` y `product_categories` ya existen
- Los productos ya tienen `auto_category_id` y `manual_category_id`
- La categoría efectiva es `coalesce(manual_category_id, auto_category_id)`
- Los filtros públicos ya existen y deben seguir aplicándose:
  - `merchant_status = 'active'`
  - `system_status = 'visible'`
  - `has_stock = true`
  - `price_min > 0`
  - al menos una imagen
  - store activa

---

## Backend / services

Crear o ajustar en `lib/services/categories.ts`:

```ts
getPublicCategoryBySlug(slug: string)
getPublicSubcategoryBySlugs(parentSlug: string, childSlug: string)
getPublicProductsByCategorySlug(slug: string, opts?)
getPublicProductsBySubcategorySlug(parentSlug: string, childSlug: string, opts?)
getPublicCategoryNavigation()
```

### `getPublicCategoryNavigation()`

- devolver solo categorías principales con sus subcategorías anidadas
- pensado para renderizar navegación pública de categorías

### `getPublicProductsByCategorySlug()`

Para categoría principal, traer productos donde:

- `product_categories.category_id = id de categoría principal`
- OR `product_categories.category_id IN (ids de subcategorías hijas de esa principal)`

Implementar en una sola query — no dos queries separadas ni merge en memoria.

### `getPublicSubcategoryBySlugs()`

Validar jerarquía explícitamente:

- buscar categoría por `childSlug`
- verificar que su `parent_id` corresponde a la categoría con `parentSlug`
- si no corresponde → retornar `null` (la page llama `notFound()`)

### Requisitos generales

- no duplicar la lógica de filtros públicos
- reutilizar la lógica de listado/grid ya existente
- no hacer N+1
- usar categoría efectiva (`manual_category_id ?? auto_category_id`) via `product_categories`

---

## UI

### Archivos

```
app/(public)/categoria/[slug]/page.tsx
app/(public)/categoria/[parentSlug]/[childSlug]/page.tsx
```

### Mostrar

- nombre de la categoría
- si es subcategoría, breadcrumb simple: `Categorías / Moda / Remeras`
- grid de productos reutilizando `ProductCard` y `ProductGrid` existentes
- empty state: "No hay productos disponibles en esta categoría por el momento"

### Navegación de categorías

- implementar por página, no en layout compartido
- no crear `layout.tsx` nuevo para `/categoria`
- categorías principales en row horizontal (reutilizar `CategoryRow` si aplica)
- subcategorías como row secundaria o links debajo del título cuando estés dentro de una categoría principal

---

## Metadata / SEO

`generateMetadata` en ambas páginas:

- título principal: `Moda | TiendaShop`
- título subcategoría: `Remeras | Moda | TiendaShop`
- description simple y corta

No usar `generateStaticParams` — mantener SSR.

---

## Cache

- no agregar caching custom en esta task
- usar el comportamiento SSR actual del proyecto
- no optimizar cache todavía

---

## URLs y comportamiento

- soportar siempre ambas: `/categoria/moda` y `/categoria/moda/remeras`
- no usar IDs en URL
- no crear versión flat tipo `/categoria/remeras`

---

## No hacer

- filtros avanzados por color/talle/sexo
- páginas de tienda nuevas
- refactor del catálogo global
- cambiar sync ni dashboard
- inventar categorías fuera de la taxonomía ya definida
- paginación en esta task
- layout compartido nuevo para `/categoria`
- `generateStaticParams`

---

## Skills a usar antes de implementar

- Leer `.agents/skills/nextjs-best-practices/SKILL.md`
- Leer `.agents/skills/frontend-design/SKILL.md`
- Usar Context7 MCP para documentación de Next.js App Router routing dinámico con múltiples segmentos

---

## Reglas

- cambios chicos y auditables
- no duplicar filtros públicos
- diseño simple y limpio
- textos en español
- SSR obligatorio
- `notFound()` cuando corresponda

---

## Output esperado

1. archivos creados/modificados
2. decisiones breves
3. diff o código por archivo
4. confirmar `pnpm exec tsc --noEmit`

# TASK 14 Implementar métricas básicas de clicks en el dashboard usando `redirect_events`.

## Objetivo

Mostrar métricas simples y útiles para la tienda actual, sin introducir complejidad innecesaria.

---

## Contexto

- `redirect_events` ya registra clicks de salida desde `/api/r/[productId]`
- Hoy el sistema opera con una tienda actual por organización
- No implementar multi-tienda todavía
- Las métricas deben ser para la tienda activa actual

---

## Resolución de tienda actual

- reutilizar la misma lógica/helper que ya usa el dashboard para resolver la store activa actual
- no inventar un nuevo mecanismo de "current store"
- si hoy se resuelve desde membership + store activa de la organización, mantener eso

---

## Alcance

### 1. `/dashboard`

Mostrar métricas básicas:

- clicks salientes totales
- clicks últimos 7 días
- clicks últimos 30 días
- top 5 productos más clickeados

### 2. `/dashboard/productos`

Agregar columna simple:

- `Clicks` — clicks totales por producto (no por período configurable en esta task)

### 3. Backend — `lib/services/metrics.ts`

Funciones:

```ts
getDashboardMetrics(storeId: string, params: {
  since7days: Date
  since30days: Date
}): Promise<DashboardMetrics>

getProductClickCounts(storeId: string): Promise<Map<string, number>>
// productId → total clicks
```

Requisitos:

- no hacer N+1
- usar queries agregadas sobre `redirect_events`
- agrupar por `product_id` cuando haga falta
- siempre filtrar por `store_id` de la tienda actual
- queries separadas si eso deja el código más claro — no optimizar prematuramente

### Fechas — importante

Las fechas de referencia se calculan en la page, no en el service.
El service recibe fechas como parámetros — nunca llama a `new Date()` internamente.
Esto evita problemas con caching y mantiene el service puro.

```ts
// en la page o server component que llama al service:
const now = new Date()
const since7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
const since30days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

// pasar al service:
await getDashboardMetrics(storeId, { since7days, since30days })
```

---

## UI

- cards o bloques simples con números — sin charts
- top 5 productos como lista simple: nombre + cantidad de clicks
- columna "Clicks" en tabla de productos: número simple

### Carga / UX

- las métricas no deben bloquear el resto del dashboard
- usar `<Suspense>` con skeleton simple para las cards de métricas
- si el resto del dashboard carga antes, mejor

```tsx
// ejemplo de estructura en /dashboard
<DashboardShell>
  <Suspense fallback={<MetricsSkeleton />}>
    <MetricsCards storeId={storeId} />
  </Suspense>
  <Suspense fallback={<TopProductsSkeleton />}>
    <TopProducts storeId={storeId} />
  </Suspense>
</DashboardShell>
```

---

## Definición de "click"

- un click = una fila en `redirect_events` con el `store_id` de la tienda actual
- no contar visitas a `/tienda/[slug]`
- no contar visitas a `/producto/[id]`
- solo redirecciones salientes via `/api/r/[productId]`

---

## No hacer

- gráficos o charts
- embudos de conversión
- tiempo real o polling
- multi-store selector
- analytics avanzados
- filtros por período configurables
- métricas de impresiones o vistas de página

---

## Skills a usar antes de implementar

- Leer `.agents/skills/frontend-design/SKILL.md`

---

## Archivos a crear/modificar

```
lib/services/metrics.ts                              ← nuevo
app/(dashboard)/dashboard/page.tsx                   ← agregar métricas con Suspense
app/(dashboard)/dashboard/productos/page.tsx         ← agregar columna Clicks
components/dashboard/metrics-cards.tsx               ← nuevo, cards de métricas
components/dashboard/top-products.tsx                ← nuevo, lista top 5
```

---

## Reglas

- no refactor grande
- no tocar sync ni catálogo público
- cambios chicos y auditables
- fechas siempre como parámetro al service, nunca calculadas dentro
- textos en español

---

## Output esperado

1. archivos creados/modificados
2. decisiones breves
3. diff o código por archivo
4. confirmar `pnpm exec tsc --noEmit`

---

## TASK 15 Implementar toggle publish/unpublish por producto usando `merchant_status`.

## Objetivo

Dar control al merchant para mostrar u ocultar productos en el catálogo público.

---

## Contexto

- La tabla `products` tiene:
  - `merchant_status`: `'active'` | `'paused'`
  - `system_status`: `'visible'` | `'hidden'` | `'error'`
- El catálogo público filtra por:
  - `merchant_status = 'active'`
  - `system_status = 'visible'`

---

## Alcance

### 1. Backend — `lib/actions/products.ts`

Agregar Server Action:

```ts
toggleProductMerchantStatus(productId: string): Promise<{ error?: string }>
```

Debe:

1. validar usuario autenticado
2. validar que el producto pertenece a la organización actual — nunca confiar en el ID del cliente
3. leer `merchant_status` y `system_status` actuales del producto
4. si `merchant_status = 'active'` → pasar a `'paused'` (siempre permitido)
5. si `merchant_status = 'paused'` → intentar pasar a `'active'`:
   - si `system_status = 'visible'` → permitir
   - si `system_status != 'visible'` → no actualizar, retornar error claro en español
6. no tocar ningún otro campo
7. retornar `{ error }` — nunca throwear al cliente

Mensaje de error cuando `system_status != 'visible'`:

```
"Este producto tiene problemas que impiden publicarlo. Revisá el estado en el panel de discrepancias."
```

### 2. UI — `/dashboard/productos`

Agregar control por producto en la tabla existente:

- switch o botón toggle por fila
- estados visibles:
  - `merchant_status = 'active'` → "Publicado"
  - `merchant_status = 'paused'` → "Oculto"
- usar **optimistic update**: cambiar el switch visualmente de inmediato sin esperar respuesta del servidor
- si la acción falla → revertir al estado anterior y mostrar el error
- si falla por `system_status` → revertir y mostrar mensaje específico del error retornado por la action

---

## Reglas de negocio

- el merchant siempre puede pausar (`paused`) — sin restricciones
- el merchant solo puede publicar (`active`) si `system_status = 'visible'`
- si intenta publicar con `system_status != 'visible'` → error claro, sin actualizar

---

## No hacer

- no recalcular `system_status`
- no tocar sync ni catálogo público
- no refactor grande
- no bulk publish/unpublish — solo por producto individual

---

## Archivos a crear/modificar

```
lib/actions/products.ts                              ← agregar toggleProductMerchantStatus
components/dashboard/product-list.tsx                ← agregar toggle por fila
```

---

## Output esperado

1. archivos modificados
2. decisiones breves
3. diff o código por archivo
4. confirmar `pnpm exec tsc --noEmit`

---

## Reglas

- validar ownership del producto en servidor siempre
- optimistic update con rollback si falla
- mensajes de error en español
- no tocar campos que no sean `merchant_status`
