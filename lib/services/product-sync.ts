import { SupabaseClient } from "@supabase/supabase-js";
import { createTiendanubeClient } from "@/lib/tiendanube/client";
import type { TiendanubeProduct } from "@/lib/tiendanube/types";
import type { Database } from "@/lib/supabase/database.types";

export interface SyncResult {
  success: boolean;
  productsProcessed: number;
  variantsProcessed: number;
  imagesProcessed: number;
  error: string | null;
}

interface SyncParams {
  supabase: SupabaseClient<Database>;
  storeId: string;
  tiendanubeStoreId: string;
  accessToken: string;
}

export async function syncStoreProducts(params: SyncParams): Promise<SyncResult> {
  const { supabase, storeId, tiendanubeStoreId, accessToken } = params;

  // Set syncing state
  await supabase
    .from("stores")
    .update({
      sync_status: "syncing" as Database["public"]["Enums"]["sync_status"],
      sync_error_message: null,
      sync_total_products: 0,
      sync_processed_products: 0,
      sync_created_products: 0,
      sync_updated_products: 0,
      sync_failed_products: 0,
    })
    .eq("id", storeId);

  // Fetch products from Tiendanube
  const client = createTiendanubeClient(tiendanubeStoreId, accessToken);
  const productsResult = await client.getAllProducts();

  if (productsResult.error) {
    console.error("[Sync] Tiendanube API error:", productsResult.error);
    await supabase
      .from("stores")
      .update({
        sync_status: "error",
        sync_error_message: `Error al obtener productos: ${productsResult.error}`,
      })
      .eq("id", storeId);
    return {
      success: false,
      productsProcessed: 0,
      variantsProcessed: 0,
      imagesProcessed: 0,
      error: `Error al obtener productos: ${productsResult.error}`,
    };
  }

  const tiendanubeProducts = productsResult.data || [];
  let productsProcessed = 0;
  let variantsProcessed = 0;
  let imagesProcessed = 0;
  let createdProducts = 0;
  let updatedProducts = 0;
  let failedProducts = 0;
  const errorMessages: string[] = [];

  // Update total count
  await supabase
    .from("stores")
    .update({ sync_total_products: tiendanubeProducts.length })
    .eq("id", storeId);

  const registerError = (message: string) => {
    failedProducts++;
    if (errorMessages.length < 5) {
      errorMessages.push(message);
    }
  };

  const updateProgress = async () => {
    await supabase
      .from("stores")
      .update({
        sync_processed_products: productsProcessed,
        sync_created_products: createdProducts,
        sync_updated_products: updatedProducts,
        sync_failed_products: failedProducts,
      })
      .eq("id", storeId);
  };

  // Process each product
  for (const tnProduct of tiendanubeProducts) {
    try {
      const upsertResult = await upsertProduct(supabase, storeId, tnProduct);

      if (!upsertResult.productId) {
        registerError(`Producto ${tnProduct.id}: upsert fallido`);
        productsProcessed++;
        await updateProgress();
        continue;
      }

      if (upsertResult.isNew) {
        createdProducts++;
      } else {
        updatedProducts++;
      }

      // Delete and recreate variants
      const { error: deleteVariantsError } = await supabase
        .from("product_variants")
        .delete()
        .eq("product_id", upsertResult.productId);

      if (deleteVariantsError) {
        console.error(`[Sync] Variants delete error for product ${tnProduct.id}:`, deleteVariantsError);
        registerError(`Producto ${tnProduct.id}: error al borrar variantes`);
        productsProcessed++;
        await updateProgress();
        continue;
      }

      const variantResult = await insertVariants(supabase, upsertResult.productId, tnProduct);
      variantsProcessed += variantResult.count;
      if (variantResult.error) {
        registerError(`Producto ${tnProduct.id}: ${variantResult.error}`);
        productsProcessed++;
        await updateProgress();
        continue;
      }

      // Delete and recreate images
      const { error: deleteImagesError } = await supabase
        .from("product_images")
        .delete()
        .eq("product_id", upsertResult.productId);

      if (deleteImagesError) {
        console.error(`[Sync] Images delete error for product ${tnProduct.id}:`, deleteImagesError);
        registerError(`Producto ${tnProduct.id}: error al borrar imagenes`);
        productsProcessed++;
        await updateProgress();
        continue;
      }

      const imageResult = await insertImages(supabase, upsertResult.productId, tnProduct);
      imagesProcessed += imageResult.count;
      if (imageResult.error) {
        registerError(`Producto ${tnProduct.id}: ${imageResult.error}`);
      }

      productsProcessed++;
      await updateProgress();
    } catch (err) {
      console.error(`[Sync] Error processing product ${tnProduct.id}:`, err);
      registerError(`Producto ${tnProduct.id}: error inesperado`);
      productsProcessed++;
      await updateProgress();
    }
  }

  const hadErrors = failedProducts > 0;
  const syncErrorMessage =
    hadErrors && errorMessages.length > 0
      ? errorMessages.join(" | ")
      : hadErrors
        ? "Sync finalizado con errores"
        : null;

  // Update store sync status
  const { error: storeUpdateError } = await supabase
    .from("stores")
    .update({
      last_synced_at: new Date().toISOString(),
      sync_status: hadErrors ? "error" : "ok",
      sync_error_message: syncErrorMessage,
    })
    .eq("id", storeId);

  if (storeUpdateError) {
    console.error("[Sync] Store sync status update error:", storeUpdateError);
    return {
      success: false,
      productsProcessed,
      variantsProcessed,
      imagesProcessed,
      error: `Error al actualizar estado de sync: ${storeUpdateError.message}`,
    };
  }

  return {
    success: !hadErrors,
    productsProcessed,
    variantsProcessed,
    imagesProcessed,
    error: syncErrorMessage,
  };
}

interface UpsertProductResult {
  productId: string | null;
  isNew: boolean;
}

async function upsertProduct(
  supabase: SupabaseClient<Database>,
  storeId: string,
  tnProduct: TiendanubeProduct
): Promise<UpsertProductResult> {
  const title = extractLocalizedText(tnProduct.name);
  const description = extractLocalizedText(tnProduct.description);

  // Calculate price range from variants
  const prices = tnProduct.variants
    .map((v) => parseFloat(v.price))
    .filter((p) => !isNaN(p) && p > 0);

  const priceMin = prices.length > 0 ? Math.min(...prices) : null;
  const priceMax = prices.length > 0 ? Math.max(...prices) : null;

  // Calculate total stock
  const totalStock = tnProduct.variants.reduce((sum, v) => {
    return sum + (v.stock ?? 0);
  }, 0);

  // Check if product exists
  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .eq("store_id", storeId)
    .eq("tiendanube_product_id", String(tnProduct.id))
    .maybeSingle();

  const isNew = !existing;

  const productData = {
    store_id: storeId,
    tiendanube_product_id: String(tnProduct.id),
    title,
    description,
    brand: tnProduct.brand,
    price_min: priceMin,
    price_max: priceMax,
    has_stock: totalStock > 0,
    synced_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("products")
    .upsert(productData, {
      onConflict: "store_id,tiendanube_product_id",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Sync] Product upsert error:", error);
    return { productId: null, isNew: false };
  }

  return { productId: data.id, isNew };
}

async function insertVariants(
  supabase: SupabaseClient<Database>,
  productId: string,
  tnProduct: TiendanubeProduct
): Promise<{ count: number; error: string | null }> {
  if (!tnProduct.variants || tnProduct.variants.length === 0) {
    return { count: 0, error: null };
  }

  const variants = tnProduct.variants.map((v) => ({
    product_id: productId,
    tiendanube_variant_id: String(v.id),
    title: buildVariantTitle(v.values),
    price: parseFloat(v.price) || 0,
    compare_price: v.compare_at_price ? parseFloat(v.compare_at_price) : null,
    stock: v.stock ?? 0,
    sku: v.sku,
    attributes: v.values.length > 0 ? v.values : null,
  }));

  const { error } = await supabase.from("product_variants").insert(variants);

  if (error) {
    console.error("[Sync] Variants insert error:", error);
    return { count: 0, error: "error al insertar variantes" };
  }

  return { count: variants.length, error: null };
}

async function insertImages(
  supabase: SupabaseClient<Database>,
  productId: string,
  tnProduct: TiendanubeProduct
): Promise<{ count: number; error: string | null }> {
  if (!tnProduct.images || tnProduct.images.length === 0) {
    return { count: 0, error: null };
  }

  const images = tnProduct.images.map((img) => {
    const isExternal = !img.src.includes("tiendanube.com");

    return {
      product_id: productId,
      url: img.src,
      position: img.position,
      is_external: isExternal,
      width: null,
      height: null,
    };
  });

  const { error } = await supabase.from("product_images").insert(images);

  if (error) {
    console.error("[Sync] Images insert error:", error);
    return { count: 0, error: "error al insertar imagenes" };
  }

  return { count: images.length, error: null };
}

function extractLocalizedText(
  text: Record<string, string> | null | undefined
): string {
  if (!text) return "";
  return text.es || text.en || text.pt || Object.values(text)[0] || "";
}

function buildVariantTitle(
  values: Array<Record<string, string | undefined>>
): string {
  if (!values || values.length === 0) return "Default";

  return (
    values
      .map((v) => v.es || v.en || v.pt || Object.values(v)[0] || "")
      .filter(Boolean)
      .join(" / ") || "Default"
  );
}
