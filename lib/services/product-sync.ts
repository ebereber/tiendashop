import { SupabaseClient } from "@supabase/supabase-js";
import { revalidateTag } from "next/cache";
import { createTiendanubeClient } from "@/lib/tiendanube/client";
import type { TiendanubeProduct } from "@/lib/tiendanube/types";
import type { Database } from "@/lib/supabase/database.types";
import { assignCategory } from "@/lib/categories/assign-category";

// Category cache type
interface CategoryCache {
  id: string;
  slug: string;
}

// Existing product data for manual category preservation
interface ExistingProductData {
  manual_category_id: string | null;
}

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

  // Load category cache (once at start, not per product)
  const { data: categoriesData, error: categoriesError } = await supabase
    .from("categories")
    .select("id, slug");
  if (categoriesError) {
    console.error("[Sync] Categories cache load error:", categoriesError);
    await supabase
      .from("stores")
      .update({
        sync_status: "error",
        sync_error_message: `Error al cargar categorias: ${categoriesError.message}`,
      })
      .eq("id", storeId);

    return {
      success: false,
      productsProcessed: 0,
      variantsProcessed: 0,
      imagesProcessed: 0,
      error: `Error al cargar categorias: ${categoriesError.message}`,
    };
  }
  const categoryCache: CategoryCache[] = categoriesData ?? [];

  // Load existing products to preserve manual_category_id
  const { data: existingProductsData } = await supabase
    .from("products")
    .select("tiendanube_product_id, manual_category_id")
    .eq("store_id", storeId);
  const existingProductsMap = new Map<string, ExistingProductData>(
    (existingProductsData ?? []).map((p) => [
      p.tiendanube_product_id,
      { manual_category_id: p.manual_category_id },
    ])
  );

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
      const upsertResult = await upsertProduct(
        supabase,
        storeId,
        tnProduct,
        categoryCache
      );

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

      // Assign categories (after successful upsert)
      const existingData = existingProductsMap.get(String(tnProduct.id));
      try {
        await assignProductCategories(
          supabase,
          upsertResult.productId,
          upsertResult.autoCategoryId,
          existingData?.manual_category_id ?? null,
          upsertResult.subcategoryId
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "error al asignar categorias";
        registerError(`Producto ${tnProduct.id}: ${message}`);
        productsProcessed++;
        await updateProgress();
        continue;
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

  // Invalidate cache after successful sync (stale-while-revalidate)
  revalidateTag("products", "max");

  return {
    success: !hadErrors,
    productsProcessed,
    variantsProcessed,
    imagesProcessed,
    error: syncErrorMessage,
  };
}

// --- Single product sync (used by webhooks) ---

export interface SingleProductSyncResult {
  success: boolean;
  productId: string | null;
  isNew: boolean;
  error: string | null;
}

export async function syncSingleProduct(
  supabase: SupabaseClient<Database>,
  storeId: string,
  tnProduct: TiendanubeProduct
): Promise<SingleProductSyncResult> {
  // Track if any mutations occurred (for cache invalidation on partial failure)
  let hasMutated = false;
  let mutatedProductId: string | null = null;

  const invalidateIfMutated = () => {
    if (hasMutated) {
      revalidateTag("products", "max");
      if (mutatedProductId) {
        revalidateTag(`product-${mutatedProductId}`, "max");
      }
    }
  };

  try {
    // Load category cache
    const { data: categoriesData, error: categoriesError } = await supabase
      .from("categories")
      .select("id, slug");
    if (categoriesError) {
      console.error("[Sync] Categories cache load error:", categoriesError);
      return {
        success: false,
        productId: null,
        isNew: false,
        error: `Error al cargar categorias: ${categoriesError.message}`,
      };
    }
    const categoryCache: CategoryCache[] = categoriesData ?? [];

    // Load existing product data for manual category
    const { data: existingProduct } = await supabase
      .from("products")
      .select("manual_category_id")
      .eq("store_id", storeId)
      .eq("tiendanube_product_id", String(tnProduct.id))
      .maybeSingle();

    const upsertResult = await upsertProduct(
      supabase,
      storeId,
      tnProduct,
      categoryCache
    );

    if (!upsertResult.productId) {
      return {
        success: false,
        productId: null,
        isNew: false,
        error: "Upsert fallido",
      };
    }

    // Mark mutation occurred (product was upserted)
    hasMutated = true;
    mutatedProductId = upsertResult.productId;

    // Assign categories
    try {
      await assignProductCategories(
        supabase,
        upsertResult.productId,
        upsertResult.autoCategoryId,
        existingProduct?.manual_category_id ?? null,
        upsertResult.subcategoryId
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "error al asignar categorias";
      invalidateIfMutated();
      return {
        success: false,
        productId: upsertResult.productId,
        isNew: upsertResult.isNew,
        error: message,
      };
    }

    // Delete and recreate variants
    const { error: deleteVariantsError } = await supabase
      .from("product_variants")
      .delete()
      .eq("product_id", upsertResult.productId);

    if (deleteVariantsError) {
      console.error("[Sync] Variants delete error:", deleteVariantsError);
      invalidateIfMutated();
      return {
        success: false,
        productId: upsertResult.productId,
        isNew: upsertResult.isNew,
        error: "Error al borrar variantes",
      };
    }

    const variantResult = await insertVariants(
      supabase,
      upsertResult.productId,
      tnProduct
    );
    if (variantResult.error) {
      invalidateIfMutated();
      return {
        success: false,
        productId: upsertResult.productId,
        isNew: upsertResult.isNew,
        error: variantResult.error,
      };
    }

    // Delete and recreate images
    const { error: deleteImagesError } = await supabase
      .from("product_images")
      .delete()
      .eq("product_id", upsertResult.productId);

    if (deleteImagesError) {
      console.error("[Sync] Images delete error:", deleteImagesError);
      invalidateIfMutated();
      return {
        success: false,
        productId: upsertResult.productId,
        isNew: upsertResult.isNew,
        error: "Error al borrar imagenes",
      };
    }

    const imageResult = await insertImages(
      supabase,
      upsertResult.productId,
      tnProduct
    );
    if (imageResult.error) {
      invalidateIfMutated();
      return {
        success: false,
        productId: upsertResult.productId,
        isNew: upsertResult.isNew,
        error: imageResult.error,
      };
    }

    // Success: invalidate cache for the mutated product
    invalidateIfMutated();

    return {
      success: true,
      productId: upsertResult.productId,
      isNew: upsertResult.isNew,
      error: null,
    };
  } catch (err) {
    console.error("[Sync] syncSingleProduct error:", err);
    invalidateIfMutated();
    return {
      success: false,
      productId: mutatedProductId,
      isNew: false,
      error: "Error inesperado",
    };
  }
}

// --- Internal helpers ---

interface UpsertProductResult {
  productId: string | null;
  isNew: boolean;
  autoCategoryId: string | null;
  subcategoryId: string | null;
}

const INFINITE_STOCK_SENTINEL = 2147483647;

function resolveVariantStock(variant: TiendanubeProduct["variants"][number]): number {
  // Tiendanube: stock_management=false means unlimited stock; stock may come as null.
  if (variant.stock_management === false) {
    return INFINITE_STOCK_SENTINEL;
  }

  return variant.stock ?? 0;
}

async function upsertProduct(
  supabase: SupabaseClient<Database>,
  storeId: string,
  tnProduct: TiendanubeProduct,
  categoryCache: CategoryCache[]
): Promise<UpsertProductResult> {
  const title = extractLocalizedText(tnProduct.name);
  const description = extractLocalizedText(tnProduct.description);
  const handle = extractLocalizedText(tnProduct.handle);

  // Calculate price range from variants
  const prices = tnProduct.variants
    .map((v) => parseFloat(v.price))
    .filter((p) => !isNaN(p) && p > 0);

  const priceMin = prices.length > 0 ? Math.min(...prices) : null;
  const priceMax = prices.length > 0 ? Math.max(...prices) : null;

  const hasAnyStock = tnProduct.variants.some((v) => resolveVariantStock(v) > 0);

  // Assign category (always recalculate auto)
  const categoryAssignment = assignCategory(tnProduct);
  const autoCategoryId =
    categoryCache.find((c) => c.slug === categoryAssignment.categorySlug)?.id ??
    null;
  const subcategoryId = categoryAssignment.subcategorySlug
    ? categoryCache.find((c) => c.slug === categoryAssignment.subcategorySlug)
        ?.id ?? null
    : null;

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
    handle: handle || null,
    brand: tnProduct.brand,
    price_min: priceMin,
    price_max: priceMax,
    has_stock: hasAnyStock,
    // Reactivate products previously disabled by store uninstallation.
    system_status: "visible" as Database["public"]["Enums"]["system_status"],
    system_status_reason: null,
    system_status_detail: null,
    synced_at: new Date().toISOString(),
    // Category fields (auto always updated, manual never touched)
    auto_category_id: autoCategoryId,
    tn_category_raw: categoryAssignment.tnCategoryRaw ?? null,
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
    return { productId: null, isNew: false, autoCategoryId: null, subcategoryId: null };
  }

  return { productId: data.id, isNew, autoCategoryId, subcategoryId };
}

async function assignProductCategories(
  supabase: SupabaseClient<Database>,
  productId: string,
  autoCategoryId: string | null,
  manualCategoryId: string | null,
  subcategoryId: string | null
): Promise<void> {
  // Effective category: manual takes precedence over auto
  const effectiveCategoryId = manualCategoryId ?? autoCategoryId;

  if (!effectiveCategoryId) {
    return;
  }

  // Delete existing category assignments
  const { error: deleteError } = await supabase
    .from("product_categories")
    .delete()
    .eq("product_id", productId);
  if (deleteError) {
    throw new Error(`error al borrar categorias: ${deleteError.message}`);
  }

  // Insert primary category
  const categoriesToInsert: Array<{
    product_id: string;
    category_id: string;
    is_primary: boolean;
  }> = [
    {
      product_id: productId,
      category_id: effectiveCategoryId,
      is_primary: true,
    },
  ];

  // Insert subcategory only when using auto category (never mix manual + auto subcategory)
  if (!manualCategoryId && subcategoryId && subcategoryId !== effectiveCategoryId) {
    categoriesToInsert.push({
      product_id: productId,
      category_id: subcategoryId,
      is_primary: false,
    });
  }

  const { error } = await supabase
    .from("product_categories")
    .insert(categoriesToInsert);

  if (error) {
    throw new Error(`error al insertar categorias: ${error.message}`);
  }
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
    stock: resolveVariantStock(v),
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
