-- ============================================================
-- SCHEMA COMPLETO — Buscador Tiendanube
-- Supabase + PostgreSQL
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ============================================================
-- LIMPIEZA SEGURA DE FUNCIONES/TRIGGERS/VISTAS
-- ============================================================

drop view if exists active_stores;

drop function if exists handle_new_user() cascade;
drop function if exists set_updated_at() cascade;
drop function if exists sync_product_aggregates() cascade;
drop function if exists soft_delete_store(uuid) cascade;
drop function if exists auth_user_id() cascade;
drop function if exists is_org_member(uuid) cascade;
drop function if exists is_org_admin(uuid) cascade;

-- ============================================================
-- ENUMS
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('buyer', 'owner');
  end if;

  if not exists (select 1 from pg_type where typname = 'org_member_role') then
    create type org_member_role as enum ('owner', 'admin', 'member');
  end if;

  if not exists (select 1 from pg_type where typname = 'merchant_status') then
    create type merchant_status as enum ('active', 'paused');
  end if;

  if not exists (select 1 from pg_type where typname = 'system_status') then
    create type system_status as enum ('visible', 'hidden', 'error');
  end if;

  if not exists (select 1 from pg_type where typname = 'system_status_reason') then
    create type system_status_reason as enum (
      'no_image',
      'no_stock',
      'sync_error',
      'store_disconnected',
      'store_deleted',
      'manual_review',
      'spam_detected'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'sync_status') then
    create type sync_status as enum ('ok', 'error', 'stale', 'disabled');
  end if;

  if not exists (select 1 from pg_type where typname = 'redirect_source_type') then
    create type redirect_source_type as enum (
      'search',
      'category',
      'brand',
      'store',
      'saved'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'quality_flag_type') then
    create type quality_flag_type as enum (
      'no_image',
      'no_stock',
      'title_too_short',
      'no_description',
      'no_price',
      'external_image',
      'description_too_short'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'flag_severity') then
    create type flag_severity as enum ('warning', 'error');
  end if;
end$$;

-- ============================================================
-- USERS
-- ============================================================

create table if not exists public.users (
  id          uuid primary key default gen_random_uuid(),
  auth_id     uuid not null unique references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text,
  avatar_url  text,
  role        user_role not null default 'buyer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    auth_id,
    email,
    full_name,
    avatar_url,
    role
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'buyer')
  )
  on conflict (auth_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

create table if not exists public.organizations (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  plan            text not null default 'free',
  product_limit   int not null default 30,
  is_active       boolean not null default true,
  trial_ends_at   timestamptz,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references public.users(id) on delete cascade,
  role            org_member_role not null default 'member',
  invited_by      uuid references public.users(id) on delete set null,
  accepted_at     timestamptz,
  created_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists org_members_user_idx on public.organization_members(user_id);
create index if not exists org_members_org_idx on public.organization_members(organization_id);

-- ============================================================
-- STORES
-- ============================================================

create table if not exists public.stores (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  tiendanube_store_id text not null unique,
  name                text not null,
  slug                text not null unique,
  domain              text,
  access_token        text not null,
  refresh_token       text,
  country             text not null default 'AR',
  currency            text not null default 'ARS',
  publish_all         boolean not null default false,
  sync_status         sync_status not null default 'ok',
  sync_error_message  text,
  last_synced_at      timestamptz,
  deleted_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists stores_org_idx on public.stores(organization_id);
create index if not exists stores_deleted_idx on public.stores(deleted_at) where deleted_at is null;
create index if not exists stores_sync_status_idx on public.stores(sync_status);

create or replace view public.active_stores as
select *
from public.stores
where deleted_at is null
  and sync_status <> 'disabled';

-- ============================================================
-- CATEGORIES
-- ============================================================

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references public.categories(id) on delete set null,
  name        text not null,
  slug        text not null unique,
  path        text not null,
  depth       int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists categories_parent_idx on public.categories(parent_id);
create index if not exists categories_slug_idx on public.categories(slug);

-- ============================================================
-- PRODUCTS
-- ============================================================

create table if not exists public.products (
  id                    uuid primary key default gen_random_uuid(),
  store_id              uuid not null references public.stores(id) on delete cascade,
  tiendanube_product_id text not null,

  title                 text not null,
  description           text,
  brand                 text,

  title_normalized      text,

  price_min             numeric,
  price_max             numeric,
  has_stock             boolean not null default false,

  merchant_status       merchant_status not null default 'active',
  system_status         system_status not null default 'visible',
  system_status_reason  system_status_reason,
  system_status_detail  text,

  quality_score         int not null default 0,

  search_vector         tsvector generated always as (
    to_tsvector(
      'simple',
      coalesce(title_normalized, title) || ' ' ||
      coalesce(brand, '') || ' ' ||
      coalesce(description, '')
    )
  ) stored,

  synced_at             timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  unique (store_id, tiendanube_product_id)
);

create index if not exists products_store_idx on public.products(store_id);
create index if not exists products_search_idx on public.products using gin(search_vector);
create index if not exists products_price_min_idx on public.products(price_min);
create index if not exists products_status_idx on public.products(merchant_status, system_status);
create index if not exists products_quality_idx on public.products(quality_score desc);

-- ============================================================
-- PRODUCT CATEGORIES
-- ============================================================

create table if not exists public.product_categories (
  product_id   uuid not null references public.products(id) on delete cascade,
  category_id  uuid not null references public.categories(id) on delete cascade,
  is_primary   boolean not null default false,
  primary key (product_id, category_id)
);

create index if not exists product_categories_category_idx on public.product_categories(category_id);

-- ============================================================
-- PRODUCT IMAGES
-- ============================================================

create table if not exists public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  url         text not null,
  position    int not null default 0,
  width       int,
  height      int,
  is_external boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists product_images_product_idx on public.product_images(product_id, position);

-- ============================================================
-- PRODUCT VARIANTS
-- ============================================================

create table if not exists public.product_variants (
  id                    uuid primary key default gen_random_uuid(),
  product_id            uuid not null references public.products(id) on delete cascade,
  tiendanube_variant_id text not null,
  title                 text not null,
  price                 numeric not null,
  compare_price         numeric,
  stock                 int not null default 0,
  sku                   text,
  attributes            jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  unique (product_id, tiendanube_variant_id)
);

create index if not exists product_variants_product_idx on public.product_variants(product_id);

create or replace function public.sync_product_aggregates()
returns trigger
language plpgsql
as $$
declare
  v_product_id uuid;
begin
  v_product_id := coalesce(new.product_id, old.product_id);

  update public.products p
  set
    price_min = (
      select min(v.price)
      from public.product_variants v
      where v.product_id = v_product_id
        and v.stock > 0
    ),
    price_max = (
      select max(v.price)
      from public.product_variants v
      where v.product_id = v_product_id
    ),
    has_stock = exists (
      select 1
      from public.product_variants v
      where v.product_id = v_product_id
        and v.stock > 0
    ),
    updated_at = now()
  where p.id = v_product_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists on_variant_change on public.product_variants;
create trigger on_variant_change
  after insert or update or delete on public.product_variants
  for each row execute procedure public.sync_product_aggregates();

-- ============================================================
-- PRODUCT QUALITY FLAGS
-- ============================================================

create table if not exists public.product_quality_flags (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  flag_type   quality_flag_type not null,
  severity    flag_severity not null default 'warning',
  resolved    boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (product_id, flag_type)
);

create index if not exists quality_flags_product_idx on public.product_quality_flags(product_id);
create index if not exists quality_flags_unresolved_idx
  on public.product_quality_flags(product_id)
  where resolved = false;

-- ============================================================
-- REDIRECT EVENTS
-- ============================================================

create table if not exists public.redirect_events (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid references public.products(id) on delete set null,
  store_id        uuid references public.stores(id) on delete set null,
  user_id         uuid references public.users(id) on delete set null,
  is_anonymous    boolean generated always as (user_id is null) stored,
  session_id      text not null,

  source_type     redirect_source_type,
  query_origin    text,
  result_position int,
  sort_key        text,
  filters_json    jsonb,

  created_at      timestamptz not null default now()
);

create index if not exists redirect_events_store_idx on public.redirect_events(store_id, created_at desc);
create index if not exists redirect_events_product_idx on public.redirect_events(product_id);
create index if not exists redirect_events_session_idx on public.redirect_events(session_id);
create index if not exists redirect_events_date_idx on public.redirect_events(created_at desc);

-- ============================================================
-- SEARCH QUERIES
-- ============================================================

create table if not exists public.search_queries (
  id            uuid primary key default gen_random_uuid(),
  query         text not null,
  user_id       uuid references public.users(id) on delete set null,
  session_id    text,
  result_count  int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists search_queries_query_idx on public.search_queries(query);
create index if not exists search_queries_zero_results_idx
  on public.search_queries(created_at desc)
  where result_count = 0;

-- ============================================================
-- SAVED PRODUCTS / STORES
-- ============================================================

create table if not exists public.saved_products (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, product_id)
);

create table if not exists public.saved_stores (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  store_id    uuid not null references public.stores(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, store_id)
);

-- ============================================================
-- UPDATED_AT
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_users on public.users;
create trigger set_updated_at_users
before update on public.users
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_organizations on public.organizations;
create trigger set_updated_at_organizations
before update on public.organizations
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_stores on public.stores;
create trigger set_updated_at_stores
before update on public.stores
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_categories on public.categories;
create trigger set_updated_at_categories
before update on public.categories
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_products on public.products;
create trigger set_updated_at_products
before update on public.products
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_variants on public.product_variants;
create trigger set_updated_at_variants
before update on public.product_variants
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_images on public.product_images;
create trigger set_updated_at_images
before update on public.product_images
for each row execute procedure public.set_updated_at();

-- ============================================================
-- SOFT DELETE STORE
-- ============================================================

create or replace function public.soft_delete_store(p_store_id uuid)
returns void
language plpgsql
as $$
begin
  update public.stores
  set
    deleted_at = now(),
    sync_status = 'disabled',
    updated_at = now()
  where id = p_store_id;

  update public.products
  set
    system_status = 'error',
    system_status_reason = 'store_deleted',
    system_status_detail = 'Store eliminada o deshabilitada',
    updated_at = now()
  where store_id = p_store_id;
end;
$$;

-- ============================================================
-- RLS HELPERS
-- ============================================================

create or replace function public.auth_user_id()
returns uuid
language sql
security definer
stable
as $$
  select u.id
  from public.users u
  where u.auth_id = auth.uid()
$$;

create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_org_id
      and om.user_id = public.auth_user_id()
  )
$$;

create or replace function public.is_org_admin(p_org_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_org_id
      and om.user_id = public.auth_user_id()
      and om.role in ('owner', 'admin')
  )
$$;

-- ============================================================
-- ENABLE RLS
-- ============================================================

alter table public.users enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.stores enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.product_quality_flags enable row level security;
alter table public.redirect_events enable row level security;
alter table public.search_queries enable row level security;
alter table public.saved_products enable row level security;
alter table public.saved_stores enable row level security;

-- ============================================================
-- DROP POLICIES IF EXISTS
-- ============================================================

drop policy if exists "users: ver su propio perfil" on public.users;
drop policy if exists "users: editar su propio perfil" on public.users;

drop policy if exists "orgs: ver si es miembro" on public.organizations;
drop policy if exists "orgs: editar si es admin" on public.organizations;

drop policy if exists "org_members: ver miembros de su org" on public.organization_members;

drop policy if exists "stores: ver si es miembro de la org" on public.stores;
drop policy if exists "stores: editar si es admin de la org" on public.stores;

drop policy if exists "categories: lectura pública" on public.categories;
drop policy if exists "categories: members lectura" on public.categories;

drop policy if exists "products: lectura pública activos" on public.products;
drop policy if exists "products: merchants ven todos los suyos" on public.products;
drop policy if exists "products: merchants editan los suyos" on public.products;

drop policy if exists "product_categories: lectura pública" on public.product_categories;
drop policy if exists "product_categories: merchants lectura" on public.product_categories;

drop policy if exists "variants: lectura pública si producto activo" on public.product_variants;
drop policy if exists "variants: merchants lectura" on public.product_variants;

drop policy if exists "images: lectura pública si producto activo" on public.product_images;
drop policy if exists "images: merchants lectura" on public.product_images;

drop policy if exists "quality_flags: merchants lectura" on public.product_quality_flags;
drop policy if exists "quality_flags: merchants update" on public.product_quality_flags;

drop policy if exists "redirect_events: merchants ven los de sus stores" on public.redirect_events;
drop policy if exists "redirect_events: inserción pública" on public.redirect_events;

drop policy if exists "search_queries: inserción pública" on public.search_queries;
drop policy if exists "search_queries: lectura admin org" on public.search_queries;

drop policy if exists "saved_products: solo el dueño" on public.saved_products;
drop policy if exists "saved_stores: solo el dueño" on public.saved_stores;

-- ============================================================
-- POLICIES
-- ============================================================

-- USERS
create policy "users: ver su propio perfil"
  on public.users
  for select
  using (auth_id = auth.uid());

create policy "users: editar su propio perfil"
  on public.users
  for update
  using (auth_id = auth.uid());

-- ORGANIZATIONS
create policy "orgs: ver si es miembro"
  on public.organizations
  for select
  using (
    deleted_at is null
    and public.is_org_member(id)
  );

create policy "orgs: editar si es admin"
  on public.organizations
  for update
  using (public.is_org_admin(id));

-- ORGANIZATION_MEMBERS
create policy "org_members: ver miembros de su org"
  on public.organization_members
  for select
  using (public.is_org_member(organization_id));

-- STORES
create policy "stores: ver si es miembro de la org"
  on public.stores
  for select
  using (
    deleted_at is null
    and public.is_org_member(organization_id)
  );

create policy "stores: editar si es admin de la org"
  on public.stores
  for update
  using (
    deleted_at is null
    and public.is_org_admin(organization_id)
  );

-- CATEGORIES
create policy "categories: lectura pública"
  on public.categories
  for select
  using (true);

create policy "categories: members lectura"
  on public.categories
  for select
  using (true);

-- PRODUCTS
create policy "products: lectura pública activos"
  on public.products
  for select
  using (
    merchant_status = 'active'
    and system_status = 'visible'
    and exists (
      select 1
      from public.stores s
      where s.id = products.store_id
        and s.deleted_at is null
        and s.sync_status <> 'disabled'
    )
  );

create policy "products: merchants ven todos los suyos"
  on public.products
  for select
  using (
    exists (
      select 1
      from public.stores s
      join public.organization_members om
        on om.organization_id = s.organization_id
      where s.id = products.store_id
        and s.deleted_at is null
        and om.user_id = public.auth_user_id()
    )
  );

create policy "products: merchants editan los suyos"
  on public.products
  for update
  using (
    exists (
      select 1
      from public.stores s
      join public.organization_members om
        on om.organization_id = s.organization_id
      where s.id = products.store_id
        and s.deleted_at is null
        and om.user_id = public.auth_user_id()
        and om.role in ('owner', 'admin')
    )
  );

-- PRODUCT_CATEGORIES
create policy "product_categories: lectura pública"
  on public.product_categories
  for select
  using (
    exists (
      select 1
      from public.products p
      join public.stores s on s.id = p.store_id
      where p.id = product_categories.product_id
        and p.merchant_status = 'active'
        and p.system_status = 'visible'
        and s.deleted_at is null
        and s.sync_status <> 'disabled'
    )
  );

create policy "product_categories: merchants lectura"
  on public.product_categories
  for select
  using (
    exists (
      select 1
      from public.products p
      join public.stores s on s.id = p.store_id
      join public.organization_members om on om.organization_id = s.organization_id
      where p.id = product_categories.product_id
        and om.user_id = public.auth_user_id()
        and s.deleted_at is null
    )
  );

-- VARIANTS
create policy "variants: lectura pública si producto activo"
  on public.product_variants
  for select
  using (
    exists (
      select 1
      from public.products p
      join public.stores s on s.id = p.store_id
      where p.id = product_variants.product_id
        and p.merchant_status = 'active'
        and p.system_status = 'visible'
        and s.deleted_at is null
        and s.sync_status <> 'disabled'
    )
  );

create policy "variants: merchants lectura"
  on public.product_variants
  for select
  using (
    exists (
      select 1
      from public.products p
      join public.stores s on s.id = p.store_id
      join public.organization_members om on om.organization_id = s.organization_id
      where p.id = product_variants.product_id
        and om.user_id = public.auth_user_id()
        and s.deleted_at is null
    )
  );

-- IMAGES
create policy "images: lectura pública si producto activo"
  on public.product_images
  for select
  using (
    exists (
      select 1
      from public.products p
      join public.stores s on s.id = p.store_id
      where p.id = product_images.product_id
        and p.merchant_status = 'active'
        and p.system_status = 'visible'
        and s.deleted_at is null
        and s.sync_status <> 'disabled'
    )
  );

create policy "images: merchants lectura"
  on public.product_images
  for select
  using (
    exists (
      select 1
      from public.products p
      join public.stores s on s.id = p.store_id
      join public.organization_members om on om.organization_id = s.organization_id
      where p.id = product_images.product_id
        and om.user_id = public.auth_user_id()
        and s.deleted_at is null
    )
  );

-- QUALITY FLAGS
create policy "quality_flags: merchants lectura"
  on public.product_quality_flags
  for select
  using (
    exists (
      select 1
      from public.products p
      join public.stores s on s.id = p.store_id
      join public.organization_members om on om.organization_id = s.organization_id
      where p.id = product_quality_flags.product_id
        and om.user_id = public.auth_user_id()
        and s.deleted_at is null
    )
  );

create policy "quality_flags: merchants update"
  on public.product_quality_flags
  for update
  using (
    exists (
      select 1
      from public.products p
      join public.stores s on s.id = p.store_id
      join public.organization_members om on om.organization_id = s.organization_id
      where p.id = product_quality_flags.product_id
        and om.user_id = public.auth_user_id()
        and om.role in ('owner', 'admin')
        and s.deleted_at is null
    )
  );

-- REDIRECT EVENTS
create policy "redirect_events: merchants ven los de sus stores"
  on public.redirect_events
  for select
  using (
    exists (
      select 1
      from public.stores s
      join public.organization_members om on om.organization_id = s.organization_id
      where s.id = redirect_events.store_id
        and om.user_id = public.auth_user_id()
    )
  );

create policy "redirect_events: inserción pública"
  on public.redirect_events
  for insert
  with check (true);

-- SEARCH QUERIES
create policy "search_queries: inserción pública"
  on public.search_queries
  for insert
  with check (true);

create policy "search_queries: lectura admin org"
  on public.search_queries
  for select
  using (false);

-- SAVED PRODUCTS
create policy "saved_products: solo el dueño"
  on public.saved_products
  for all
  using (user_id = public.auth_user_id())
  with check (user_id = public.auth_user_id());

-- SAVED STORES
create policy "saved_stores: solo el dueño"
  on public.saved_stores
  for all
  using (user_id = public.auth_user_id())
  with check (user_id = public.auth_user_id());

-- ============================================================
-- REFERENCIA DE UPSERT DE SYNC
-- ============================================================

-- insert into public.products (
--   store_id,
--   tiendanube_product_id,
--   title,
--   description,
--   brand,
--   synced_at
-- )
-- values (...)
-- on conflict (store_id, tiendanube_product_id)
-- do update set
--   title       = excluded.title,
--   description = excluded.description,
--   brand       = excluded.brand,
--   synced_at   = excluded.synced_at;
--
-- NO tocar desde sync:
--   title_normalized,
--   quality_score,
--   merchant_status,
--   system_status,
--   system_status_reason,
--   system_status_detail