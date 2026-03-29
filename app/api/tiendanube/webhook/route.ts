import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/tiendanube/webhook";
import { createTiendanubeClient } from "@/lib/tiendanube/client";
import { syncSingleProduct } from "@/lib/services/product-sync";
import type { TiendanubeWebhookPayload } from "@/lib/tiendanube/types";

interface AppUninstalledResult {
  success: boolean;
  status?: "already_deleted" | "store_disabled";
  error?: string;
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-linkedstore-hmac-sha256");

  // Read raw body for signature verification
  const rawBody = await request.text();

  // Verify signature
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error("[Webhook][ERROR] signature=invalid");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Parse payload
  let payload: TiendanubeWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("[Webhook][ERROR] payload=invalid");
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { store_id, event, id: productId } = payload;
  const logCtx = productId
    ? `${event} store=${store_id} product=${productId}`
    : `${event} store=${store_id}`;
  console.log(`[Webhook] ${logCtx}`);

  // Handle app/uninstalled separately (store might already be deleted)
  if (event === "app/uninstalled") {
    const result = await handleAppUninstalled(String(store_id), logCtx);
    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Webhook processing failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // Get store by tiendanube_store_id (for product events)
  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id, access_token")
    .eq("tiendanube_store_id", String(store_id))
    .is("deleted_at", null)
    .maybeSingle();

  if (storeError) {
    const isAmbiguousLookup =
      storeError.code === "PGRST116" ||
      storeError.details?.toLowerCase().includes("multiple") ||
      storeError.message.toLowerCase().includes("multiple");

    console.error(
      `[Webhook][ERROR] ${logCtx} lookup=${
        isAmbiguousLookup ? "ambiguous_store" : "query_error"
      } msg=${storeError.message}`
    );
    return NextResponse.json({ error: "Store lookup failed" }, { status: 500 });
  }

  if (!store) {
    console.warn(`[Webhook] ${logCtx} skip=store_not_found`);
    return NextResponse.json({ ok: true, skipped: "store_not_found" });
  }

  if (!store.access_token) {
    console.warn(`[Webhook] ${logCtx} skip=no_access_token`);
    return NextResponse.json({ ok: true, skipped: "no_access_token" });
  }

  // Handle product events
  try {
    if (event === "product/deleted" && productId !== undefined) {
      await handleProductDeleted(store.id, productId, logCtx);
    } else if ((event === "product/created" || event === "product/updated") && productId !== undefined) {
      await handleProductUpsert(store.id, String(store_id), store.access_token, productId, logCtx);
    }
  } catch (err) {
    console.error(
      `[Webhook][ERROR] ${logCtx} error=${err instanceof Error ? err.message : "unknown"}`
    );
  }

  return NextResponse.json({ ok: true });
}

async function handleProductDeleted(
  storeId: string,
  tiendanubeProductId: number,
  logCtx: string
): Promise<void> {
  // Get product ID before deletion for cache invalidation
  const { data: product } = await supabaseAdmin
    .from("products")
    .select("id")
    .eq("store_id", storeId)
    .eq("tiendanube_product_id", String(tiendanubeProductId))
    .maybeSingle();

  const { error } = await supabaseAdmin
    .from("products")
    .delete()
    .eq("store_id", storeId)
    .eq("tiendanube_product_id", String(tiendanubeProductId));

  if (error) {
    console.error(`[Webhook][ERROR] ${logCtx} result=delete_error msg=${error.message}`);
  } else {
    console.log(`[Webhook] ${logCtx} result=deleted`);
    // Invalidate cache (stale-while-revalidate)
    revalidateTag("products", "max");
    if (product?.id) {
      revalidateTag(`product-${product.id}`, "max");
    }
  }
}

async function handleProductUpsert(
  storeId: string,
  tiendanubeStoreId: string,
  accessToken: string,
  tiendanubeProductId: number,
  logCtx: string
): Promise<void> {
  const client = createTiendanubeClient(tiendanubeStoreId, accessToken);
  const productResult = await client.getProduct(tiendanubeProductId);

  if (productResult.error) {
    console.error(`[Webhook][ERROR] ${logCtx} result=fetch_error msg=${productResult.error}`);
    return;
  }

  if (!productResult.data) {
    console.warn(`[Webhook] ${logCtx} result=not_found_in_tiendanube`);
    return;
  }

  const syncResult = await syncSingleProduct(
    supabaseAdmin,
    storeId,
    productResult.data
  );

  if (syncResult.success) {
    const action = syncResult.isNew ? "created" : "updated";
    console.log(`[Webhook] ${logCtx} result=${action} local_id=${syncResult.productId}`);
    // Cache invalidation handled by syncSingleProduct
  } else {
    console.error(`[Webhook][ERROR] ${logCtx} result=sync_error msg=${syncResult.error}`);
    // Cache invalidation handled by syncSingleProduct (even on partial failure)
  }
}

async function handleAppUninstalled(
  tiendanubeStoreId: string,
  logCtx: string
): Promise<AppUninstalledResult> {
  console.log(`[Webhook] app/uninstalled store=${tiendanubeStoreId}`);

  // Find store (including already deleted ones to be idempotent)
  const { data: stores, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id, deleted_at")
    .eq("tiendanube_store_id", tiendanubeStoreId)
    .limit(2);

  if (storeError) {
    console.error(`[Webhook][ERROR] ${logCtx} result=store_lookup_error msg=${storeError.message}`);
    return { success: false, error: "store_lookup_error" };
  }

  if (!stores || stores.length === 0) {
    console.error(`[Webhook][ERROR] ${logCtx} result=store_not_found`);
    return { success: false, error: "store_not_found" };
  }

  if (stores.length > 1) {
    console.error(`[Webhook][ERROR] ${logCtx} result=ambiguous_store count=${stores.length}`);
    return { success: false, error: "ambiguous_store" };
  }

  const store = stores[0];

  // Already deleted - idempotent
  if (store.deleted_at) {
    console.log(`[Webhook] ${logCtx} result=already_deleted`);
    return { success: true, status: "already_deleted" };
  }

  // Get store slug before deletion for cache invalidation
  const { data: storeData } = await supabaseAdmin
    .from("stores")
    .select("slug")
    .eq("id", store.id)
    .maybeSingle();

  // Call soft_delete_store function
  const { error } = await supabaseAdmin.rpc("soft_delete_store", {
    p_store_id: store.id,
  });

  if (error) {
    console.error(`[Webhook][ERROR] ${logCtx} result=soft_delete_error msg=${error.message}`);
    return { success: false, error: "soft_delete_error" };
  } else {
    console.log(`[Webhook] store disabled local_id=${store.id}`);
    console.log(`[Webhook] ${logCtx} result=store_disabled`);
    // Invalidate cache (stale-while-revalidate)
    revalidateTag("stores", "max");
    revalidateTag("products", "max");
    if (storeData?.slug) {
      revalidateTag(`store-${storeData.slug}`, "max");
    }
    return { success: true, status: "store_disabled" };
  }
}
