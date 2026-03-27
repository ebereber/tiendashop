-- Add 'syncing' value to sync_status enum
ALTER TYPE sync_status ADD VALUE IF NOT EXISTS 'syncing';

-- Add sync progress fields to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS sync_total_products integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS sync_processed_products integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS sync_created_products integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS sync_updated_products integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS sync_failed_products integer DEFAULT 0;
