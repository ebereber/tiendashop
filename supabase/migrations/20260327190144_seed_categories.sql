-- Seed categories (idempotent)
-- Main categories (depth = 0)

insert into categories (slug, name, parent_id, path, depth)
values
  ('moda', 'Moda', null, 'moda', 0),
  ('calzado', 'Calzado', null, 'calzado', 0),
  ('accesorios', 'Accesorios', null, 'accesorios', 0),
  ('hogar_deco', 'Hogar & Deco', null, 'hogar-deco', 0),
  ('ferreteria', 'Ferreteria & Herramientas', null, 'ferreteria', 0),
  ('tecnologia', 'Tecnologia', null, 'tecnologia', 0),
  ('belleza', 'Belleza', null, 'belleza', 0),
  ('deportes', 'Deportes', null, 'deportes', 0),
  ('mascotas', 'Mascotas', null, 'mascotas', 0),
  ('juguetes', 'Juguetes', null, 'juguetes', 0),
  ('bebes', 'Bebes', null, 'bebes', 0),
  ('otros', 'Otros', null, 'otros', 0)
on conflict (slug) do nothing;

-- Subcategories (depth = 1)
-- Must run after main categories exist

insert into categories (slug, name, parent_id, path, depth)
select
  'moda_remeras',
  'Remeras',
  c.id,
  'moda/remeras',
  1
from categories c where c.slug = 'moda'
on conflict (slug) do nothing;

insert into categories (slug, name, parent_id, path, depth)
select
  'moda_pantalones',
  'Pantalones',
  c.id,
  'moda/pantalones',
  1
from categories c where c.slug = 'moda'
on conflict (slug) do nothing;

insert into categories (slug, name, parent_id, path, depth)
select
  'hogar_iluminacion',
  'Iluminacion',
  c.id,
  'hogar-deco/iluminacion',
  1
from categories c where c.slug = 'hogar_deco'
on conflict (slug) do nothing;

insert into categories (slug, name, parent_id, path, depth)
select
  'hogar_textil',
  'Textil',
  c.id,
  'hogar-deco/textil',
  1
from categories c where c.slug = 'hogar_deco'
on conflict (slug) do nothing;

insert into categories (slug, name, parent_id, path, depth)
select
  'ferreteria_manuales',
  'Herramientas manuales',
  c.id,
  'ferreteria/manuales',
  1
from categories c where c.slug = 'ferreteria'
on conflict (slug) do nothing;

insert into categories (slug, name, parent_id, path, depth)
select
  'tecnologia_accesorios',
  'Accesorios',
  c.id,
  'tecnologia/accesorios',
  1
from categories c where c.slug = 'tecnologia'
on conflict (slug) do nothing;
