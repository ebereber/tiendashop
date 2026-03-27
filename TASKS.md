# TiendaShop — Tasks

Regla: una task a la vez, completa y funcional antes de pasar a la siguiente.
Cada task es un módulo — cuando termina, algo nuevo funciona end-to-end.

---

## Índice

- [x] TASK-01 — Setup del proyecto
- [x] TASK-02 — Auth (registro + login + sesión)
- [x] TASK-03 — Dashboard layout + protección de rutas** 
- [x] **TASK-04 — Onboarding + OAuth con Tiendanube
- [x] TASK-05 — OAuth callback (tokens + crear store)
- [x] **TASK-06 — Sync de productos** 
- [x] **TASK-07 - Mejorar la UX del sync inicial/manual de productos** ← actual
- [ ] TASK-08 — Dashboard resumen
- [ ] TASK-09 — Dashboard productos
- [ ] TASK-10 — Home público
- [ ] TASK-11 — Búsqueda pública
- [ ] TASK-12 — Redirect tracking

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