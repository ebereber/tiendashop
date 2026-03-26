revoke select (access_token, refresh_token)
on public.stores
from anon, authenticated;

alter table public.stores
drop constraint if exists stores_tiendanube_store_id_key;

alter table public.stores
add constraint stores_org_tn_unique
unique (organization_id, tiendanube_store_id);