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

export type SortOption = "relevance" | "newest" | "price_asc" | "price_desc";

export interface SearchParams {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: SortOption;
  limit?: number;
}

export async function getPublicProducts(
  params: SearchParams = {}
): Promise<GetProductsResult> {
  const {
    query,
    category,
    minPrice,
    maxPrice,
    sort = "newest",
    limit = 48,
  } = params;

  const supabase = await createClient();

  // If filtering by category, first get product IDs from product_categories
  let productIdsFilter: string[] | null = null;
  if (category) {
    const { data: categoryData, error: categoryLookupError } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", category)
      .maybeSingle();

    if (categoryLookupError) {
      console.error("[Search] Category lookup error:", categoryLookupError);
      return { products: [], error: "Error al buscar productos" };
    }

    if (!categoryData) {
      return { products: [], error: null };
    }

    const { data: productCategories } = await supabase
      .from("product_categories")
      .select("product_id")
      .eq("category_id", categoryData.id);

    productIdsFilter = (productCategories ?? []).map((pc) => pc.product_id);

    // If no products in this category, return empty
    if (productIdsFilter.length === 0) {
      return { products: [], error: null };
    }
  }

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
    .neq("stores.sync_status", "disabled");

  // Category filter via product IDs
  if (productIdsFilter) {
    baseQuery = baseQuery.in("id", productIdsFilter);
  }

  // Price filters
  if (minPrice !== undefined && !isNaN(minPrice)) {
    baseQuery = baseQuery.gte("price_min", minPrice);
  }

  if (maxPrice !== undefined && !isNaN(maxPrice)) {
    baseQuery = baseQuery.lte("price_min", maxPrice);
  }

  // Full-text search
  if (query && query.trim()) {
    baseQuery = baseQuery.textSearch("search_vector", query, {
      type: "plain",
      config: "simple",
    });
  }

  // Sorting
  // sort=relevance only valid when there's a query
  const effectiveSort = sort === "relevance" && !query ? "newest" : sort;

  switch (effectiveSort) {
    case "price_asc":
      baseQuery = baseQuery.order("price_min", { ascending: true });
      break;
    case "price_desc":
      baseQuery = baseQuery.order("price_min", { ascending: false });
      break;
    case "relevance":
      // When using full-text search, order by created_at as fallback
      // (ts_rank not directly available in Supabase query builder)
      baseQuery = baseQuery.order("created_at", { ascending: false });
      break;
    case "newest":
    default:
      baseQuery = baseQuery.order("created_at", { ascending: false });
      break;
  }

  baseQuery = baseQuery.limit(limit);

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
