-- Harden metrics RPC functions:
-- Even with SECURITY DEFINER, ensure caller belongs to the store organization.

create or replace function public.get_top_clicked_products(
  p_store_id uuid,
  p_limit int default 5
)
returns table (
  product_id uuid,
  title text,
  clicks bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.stores s
    join public.organization_members om on om.organization_id = s.organization_id
    where s.id = p_store_id
      and om.user_id = auth.uid()
  ) then
    raise exception 'unauthorized';
  end if;

  return query
  select
    re.product_id,
    p.title,
    count(*) as clicks
  from public.redirect_events re
  join public.products p on p.id = re.product_id
  where re.store_id = p_store_id
    and re.product_id is not null
  group by re.product_id, p.title
  order by clicks desc
  limit p_limit;
end;
$$;

create or replace function public.get_product_click_counts(
  p_store_id uuid
)
returns table (
  product_id uuid,
  clicks bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.stores s
    join public.organization_members om on om.organization_id = s.organization_id
    where s.id = p_store_id
      and om.user_id = auth.uid()
  ) then
    raise exception 'unauthorized';
  end if;

  return query
  select
    re.product_id,
    count(*) as clicks
  from public.redirect_events re
  where re.store_id = p_store_id
    and re.product_id is not null
  group by re.product_id;
end;
$$;
