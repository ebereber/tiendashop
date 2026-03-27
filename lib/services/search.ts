"use server";

import { createClient } from "@/lib/supabase/server";

export interface ProductWithStore {
  id: string;
  title: string;
  priceMin: number | null;
  storeName: string;
  storeSlug: string;
  imageUrl: string | null;
}

interface GetProductsResult {
  products: ProductWithStore[];
  error: string | null;
}

export async function getPublicProducts(
  query?: string,
  limit: number = 48
): Promise<GetProductsResult> {
  const supabase = await createClient();

  // Base query with filters
  let baseQuery = supabase
    .from("products")
    .select(
      `
      id,
      title,
      price_min,
      stores!inner (
        name,
        slug,
        deleted_at,
        sync_status
      ),
      product_images!inner (
        url,
        position
      )
    `
    )
    .eq("merchant_status", "active")
    .eq("system_status", "visible")
    .eq("has_stock", true)
    .gt("price_min", 0)
    .is("stores.deleted_at", null)
    .neq("stores.sync_status", "disabled")
    .limit(limit);

  if (query && query.trim()) {
    // Full-text search with ranking
    // Using textSearch for plainto_tsquery
    baseQuery = baseQuery.textSearch("search_vector", query, {
      type: "plain",
      config: "simple",
    });

    // TODO: replace with explicit ts_rank ordering when moving to RPC/raw SQL search.
    // Query builder does not expose rank ordering directly.
    baseQuery = baseQuery.order("created_at", { ascending: false });
  } else {
    // No query - order by created_at desc
    baseQuery = baseQuery.order("created_at", { ascending: false });
  }

  const { data, error } = await baseQuery;

  if (error) {
    console.error("[Search] Query error:", error);
    return { products: [], error: "Error al buscar productos" };
  }

  // Transform to ProductWithStore
  const products: ProductWithStore[] = (data ?? []).map((p) => {
    const store = p.stores as unknown as {
      name: string;
      slug: string;
    };
    const images = (p.product_images as { url: string; position: number }[]) ?? [];
    const sortedImages = [...images].sort((a, b) => a.position - b.position);
    const firstImage = sortedImages[0]?.url ?? null;

    return {
      id: p.id,
      title: p.title,
      priceMin: p.price_min,
      storeName: store.name,
      storeSlug: store.slug,
      imageUrl: firstImage,
    };
  });

  return { products, error: null };
}
