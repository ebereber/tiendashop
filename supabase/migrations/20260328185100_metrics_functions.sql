-- security definer: corre con permisos del owner, no del caller
-- el filtro por p_store_id garantiza que cada merchant solo ve sus propios datos
-- Function to get top clicked products for a store
create or replace function get_top_clicked_products(
  p_store_id uuid,
  p_limit int default 5
)
returns table (
  product_id uuid,
  title text,
  clicks bigint
)
language sql
stable
security definer
as $$
  select
    re.product_id,
    p.title,
    count(*) as clicks
  from redirect_events re
  join products p on p.id = re.product_id
  where re.store_id = p_store_id
    and re.product_id is not null
  group by re.product_id, p.title
  order by clicks desc
  limit p_limit;
$$;

-- Function to get click counts per product for a store
create or replace function get_product_click_counts(
  p_store_id uuid
)
returns table (
  product_id uuid,
  clicks bigint
)
language sql
stable
security definer
as $$
  select
    re.product_id,
    count(*) as clicks
  from redirect_events re
  where re.store_id = p_store_id
    and re.product_id is not null
  group by re.product_id;
$$;
