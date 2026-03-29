-- Allow null for p_manual_category_id parameter
create or replace function public.update_product_manual_category(
  p_product_id uuid,
  p_manual_category_id uuid default null
)
returns void
language plpgsql
as $$
begin
  -- Update manual_category_id first.
  update public.products
  set manual_category_id = p_manual_category_id
  where id = p_product_id;

  -- Reset all category assignments (primary + secondary).
  delete from public.product_categories
  where product_id = p_product_id;

  -- Insert only the effective primary category.
  insert into public.product_categories (product_id, category_id, is_primary)
  select
    p_product_id,
    coalesce(p_manual_category_id, p.auto_category_id),
    true
  from public.products p
  where p.id = p_product_id
    and coalesce(p_manual_category_id, p.auto_category_id) is not null;
end;
$$;
