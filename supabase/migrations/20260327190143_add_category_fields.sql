-- Add category fields to products table
-- auto_category_id: calculated by sync, always updated
-- manual_category_id: set by merchant, never touched by sync
-- tn_category_raw: original TN category for auditing

alter table products
  add column if not exists auto_category_id uuid references categories(id),
  add column if not exists manual_category_id uuid references categories(id),
  add column if not exists tn_category_raw text;

-- Index for category lookups
create index if not exists idx_products_auto_category on products(auto_category_id);
create index if not exists idx_products_manual_category on products(manual_category_id);
