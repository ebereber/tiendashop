# TiendaShop — reglas de arquitectura

Guía de implementación para TiendaShop (Next.js + Supabase + shadcn).

---

## 1. Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Supabase (Auth + Postgres + RLS)
- Tailwind + shadcn/ui

---

## 2. Estructura

app/
  (public)/
  (auth)/
  (dashboard)/
  api/
lib/
  actions/
  services/
  supabase/
  auth/
    get-server-user.ts
    require-user.ts
    get-current-membership.ts
  validations/
components/
  ui/
  shared/
  <feature>/
supabase/
  migrations/
types/

---

## 3. Idioma

- Código: inglés
- Variables, funciones, types: inglés
- UI: español
- URLs:
  - públicas: español (/buscar, /producto, /categoria, /tienda)
  - dashboard: /dashboard
  - api: /api/*
- Sin acentos en URLs

---

## 4. Componentes

- Nombre de archivo: kebab-case
  - login-form.tsx
  - product-card.tsx
- Component export: PascalCase

Ejemplo:
export function LoginForm() {}

---

## 5. Supabase

- auth.users → autenticación
- public.users → perfil

Nunca insertar public.users desde el cliente.  
Se crea vía trigger.

### Clientes

- browser client → client components
- server client → server components
- admin client → solo backend seguro

Nunca usar service role en el frontend.

---

## 6. Arquitectura de datos

Regla principal: el flujo de datos se basa en Server Actions.

- Mutaciones → lib/actions/
- Lecturas → lib/services/

### Roles de services

1. lecturas cacheadas ("use cache")
2. lógica reutilizable (sync, integraciones)

No poner lógica compleja en client components.

---

## 7. Multi-tenant

- Todo lo privado se filtra por organization_id
- Validar membresía en cada operación sensible
- Nunca confiar en IDs del cliente

---

## 8. Auth y roles

- Todos los usuarios son iguales al registrarse
- No diferenciar buyer vs merchant en login

Un usuario pasa a merchant cuando:
- crea organization
- conecta tienda

---

## 9. Tiendanube

- OAuth para conectar tienda
- Guardar tokens
- Import inicial
- Sync incremental

Separar siempre:
- datos de Tiendanube
- datos internos

Nunca sobreescribir campos internos en sync.

---

## 10. Productos

Estados separados:

- merchant_status
- system_status

Un producto es visible si:
- merchant activo
- system visible
- store activa

---

## 11. Búsqueda

- SSR por defecto
- No lógica pesada en runtime
- Usar datos ya normalizados

---

## 12. Redirect tracking

Todo click externo pasa por endpoint:

- producto
- store
- posición
- query
- filtros
- sesión

---

## 13. Dashboard

Simple:

- resumen
- productos
- configuración

Lenguaje claro, no técnico.

---

## 14. Validación

- usar Zod en lib/validations
- validar siempre en server

---

## 15. Error handling

- Server Actions retornan siempre `{ data, error }`
- Nunca throwear errores directos al cliente
- Errores de integraciones (Tiendanube) deben:
  - loguearse
  - actualizar `sync_status` en la store
- Nunca mostrar errores técnicos en UI
- Mensajes siempre en español y entendibles

---

## 16. Tipos

- Usar tipos generados de Supabase:
  - import { Database } from '@/lib/supabase/database.types'
- Nunca definir tipos de tablas a mano
- Regenerar después de cada migración:
  - pnpm types:db

---

## 17. Variables de entorno

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (solo server)
- TIENDANUBE_CLIENT_ID
- TIENDANUBE_CLIENT_SECRET
- NEXT_PUBLIC_APP_URL

Nunca exponer service role en cliente.

---

## 18. DB y migraciones

- SQL en supabase/migrations
- no usar dashboard como fuente de verdad

Después de cambios:
- supabase db push
- pnpm types:db

---

## 19. Next.js

- Server Components por defecto
- Client Components solo cuando sea necesario
- Server Actions > API routes (cuando posible)

---

## 20. Convenciones

- no usar any
- funciones pequeñas
- evitar abstracciones prematuras
- no agregar librerías sin motivo

---

## 21. Qué evitar

- lógica innecesaria en cliente
- mezclar datos externos con internos
- sobreingeniería
- features avanzadas prematuras

---

## 22. Flujo de trabajo

El orden de implementación vive en TASKS.md.

- CLAUDE.md → reglas permanentes
- TASKS.md → estado actual y pasos a seguir

No hardcodear roadmap dentro de este archivo.

---

## 23. Regla principal

Construir siempre end-to-end con datos reales antes de optimizar.

## Supabase clients

Existen 3 clientes:

### Browser client
- lib/supabase/client.ts
- usado en client components
- respeta RLS

### Server client
- lib/supabase/server.ts
- usado en server components y server actions
- respeta RLS y sesión

### Admin client
- lib/supabase/admin.ts
- usa SUPABASE_SERVICE_ROLE_KEY
- no respeta RLS
- solo backend seguro (webhooks, OAuth, sync)

Nunca usar admin client en el frontend.

## Auth helpers

- get-server-user.ts → obtiene el usuario actual desde server (public.users)
- require-user.ts → redirige a /auth/login si no hay sesión
- get-current-membership.ts → obtiene membership del usuario en organization

## Auth helpers — cuándo usar cada uno

- `get-server-user` → cuando necesitás el usuario pero no es obligatorio tenerlo
- `require-user` → en cualquier server component o action de área privada
- `get-current-membership` → antes de cualquier operación sobre organization o store