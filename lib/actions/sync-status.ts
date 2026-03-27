"use server";

import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getCurrentMembership } from "@/lib/auth/get-current-membership";

export interface SyncStatus {
  status: "ok" | "error" | "stale" | "disabled" | "syncing";
  errorMessage: string | null;
  lastSyncedAt: string | null;
  totalProducts: number;
  processedProducts: number;
  createdProducts: number;
  updatedProducts: number;
  failedProducts: number;
}

export async function getSyncStatus(): Promise<SyncStatus | null> {
  const user = await getServerUser();
  if (!user) return null;

  const membership = await getCurrentMembership();
  if (!membership) return null;

  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select(
      "sync_status, sync_error_message, last_synced_at, sync_total_products, sync_processed_products, sync_created_products, sync_updated_products, sync_failed_products"
    )
    .eq("organization_id", membership.organization_id)
    .is("deleted_at", null)
    .single();

  if (!store) return null;

  return {
    status: store.sync_status,
    errorMessage: store.sync_error_message,
    lastSyncedAt: store.last_synced_at,
    totalProducts: store.sync_total_products ?? 0,
    processedProducts: store.sync_processed_products ?? 0,
    createdProducts: store.sync_created_products ?? 0,
    updatedProducts: store.sync_updated_products ?? 0,
    failedProducts: store.sync_failed_products ?? 0,
  };
}
