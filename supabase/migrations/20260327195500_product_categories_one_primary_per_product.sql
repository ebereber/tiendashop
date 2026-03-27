create unique index if not exists product_categories_one_primary_per_product
on product_categories(product_id)
where is_primary = true;
