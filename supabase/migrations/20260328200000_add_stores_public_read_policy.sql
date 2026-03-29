-- Allow anonymous users to read active stores
-- Required for public catalog to work without authentication
create policy "stores: lectura pública activas"
  on stores for select
  using (
    deleted_at is null
    and sync_status != 'disabled'::sync_status
  );
