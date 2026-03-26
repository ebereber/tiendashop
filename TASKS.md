# TiendaShop — Tasks

Regla: una task a la vez, completa y funcional antes de pasar a la siguiente.
Cada task es un módulo — cuando termina, algo nuevo funciona end-to-end.

---

## Índice

- [x] TASK-01 — Setup del proyecto
- [x] TASK-02 — Auth (registro + login + sesión)
- [ ] **TASK-03 — Dashboard layout + protección de rutas** ← actual
- [ ] TASK-04 — Onboarding + OAuth con Tiendanube
- [ ] TASK-05 — OAuth callback (tokens + crear store)
- [ ] TASK-06 — Sync de productos
- [ ] TASK-07 — Dashboard resumen
- [ ] TASK-08 — Dashboard productos
- [ ] TASK-09 — Home público
- [ ] TASK-10 — Búsqueda pública
- [ ] TASK-11 — Redirect tracking

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