"use server";

import { getServerUser } from "@/lib/auth/get-server-user";
import { getCurrentMembership } from "@/lib/auth/get-current-membership";
import { syncStoreProducts, type SyncResult } from "@/lib/services/product-sync";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type { SyncResult };

export async function syncProducts(): Promise<SyncResult> {
  const user = await getServerUser();
  if (!user) {
    return {
      success: false,
      productsProcessed: 0,
      variantsProcessed: 0,
      imagesProcessed: 0,
      error: "No hay sesion activa",
    };
  }

  const membership = await getCurrentMembership();
  if (!membership) {
    return {
      success: false,
      productsProcessed: 0,
      variantsProcessed: 0,
      imagesProcessed: 0,
      error: "No tienes acceso a una organizacion",
    };
  }

  // Get store for this organization via service role after validating membership.
  // access_token is not selectable by authenticated clients.
  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id, tiendanube_store_id, access_token")
    .eq("organization_id", membership.organization_id)
    .is("deleted_at", null)
    .single();

  if (storeError || !store) {
    return {
      success: false,
      productsProcessed: 0,
      variantsProcessed: 0,
      imagesProcessed: 0,
      error: "No hay tienda conectada",
    };
  }

  if (!store.access_token) {
    return {
      success: false,
      productsProcessed: 0,
      variantsProcessed: 0,
      imagesProcessed: 0,
      error: "La tienda no tiene token de acceso",
    };
  }

  return syncStoreProducts({
    supabase: supabaseAdmin,
    storeId: store.id,
    tiendanubeStoreId: store.tiendanube_store_id,
    accessToken: store.access_token,
  });
}
