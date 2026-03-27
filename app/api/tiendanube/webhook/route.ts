import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/tiendanube/webhook";
import { createTiendanubeClient } from "@/lib/tiendanube/client";
import { syncSingleProduct } from "@/lib/services/product-sync";
import type { TiendanubeWebhookPayload } from "@/lib/tiendanube/types";

export async function POST(request: NextRequest) {
  // Read raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get("x-linkedstore-hmac-sha256");

  // Verify signature
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error("[Webhook] signature=invalid");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Parse payload
  let payload: TiendanubeWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("[Webhook] payload=invalid");
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { store_id, event, id: productId } = payload;
  const logCtx = `${event} store=${store_id} product=${productId}`;

  // Get store by tiendanube_store_id
  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id, access_token")
    .eq("tiendanube_store_id", String(store_id))
    .is("deleted_at", null)
    .maybeSingle();

  if (storeError || !store) {
    console.warn(`[Webhook] ${logCtx} skip=store_not_found`);
    return NextResponse.json({ ok: true, skipped: "store_not_found" });
  }

  if (!store.access_token) {
    console.warn(`[Webhook] ${logCtx} skip=no_access_token`);
    return NextResponse.json({ ok: true, skipped: "no_access_token" });
  }

  // Handle event
  try {
    if (event === "product/deleted") {
      await handleProductDeleted(store.id, productId, logCtx);
    } else if (event === "product/created" || event === "product/updated") {
      await handleProductUpsert(store.id, String(store_id), store.access_token, productId, logCtx);
    }
  } catch (err) {
    console.error(`[Webhook] ${logCtx} error=${err instanceof Error ? err.message : "unknown"}`);
  }

  return NextResponse.json({ ok: true });
}

async function handleProductDeleted(
  storeId: string,
  tiendanubeProductId: number,
  logCtx: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("products")
    .delete()
    .eq("store_id", storeId)
    .eq("tiendanube_product_id", String(tiendanubeProductId));

  if (error) {
    console.error(`[Webhook] ${logCtx} result=delete_error msg=${error.message}`);
  } else {
    console.log(`[Webhook] ${logCtx} result=deleted`);
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
    console.error(`[Webhook] ${logCtx} result=fetch_error msg=${productResult.error}`);
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
  } else {
    console.error(`[Webhook] ${logCtx} result=sync_error msg=${syncResult.error}`);
  }
}
