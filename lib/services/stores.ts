"use server";

import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import type { ProductWithStore } from "./search";

export interface PublicStore {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
}

export interface StoreCategory {
  slug: string;
  name: string;
}

export type StoreSortOption = "newest" | "price_asc" | "price_desc";

export interface StoreProductsParams {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: StoreSortOption;
  limit?: number;
}

export const getStoreBySlug = cache(async (slug: string): Promise<PublicStore | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("stores")
    .select("id, name, slug, domain")
    .eq("slug", slug)
    .is("deleted_at", null)
    .neq("sync_status", "disabled")
    .maybeSingle();

  if (error) {
    console.error("[Stores] getStoreBySlug error:", error);
    return null;
  }

  return data;
});

// Get categories present in visible products for a specific store
// Uses product_categories which reflects the effective category (coalesce of manual/auto)
export const getCategoriesByStore = cache(
  async (storeId: string): Promise<StoreCategory[]> => {
    const supabase = await createClient();

    // Get category IDs from product_categories for visible products
    const { data: productCategories, error } = await supabase
      .from("product_categories")
      .select(
        `
        category_id,
        products!inner (
          store_id,
          merchant_status,
          system_status,
          has_stock,
          price_min,
          stores!inner (
            deleted_at,
            sync_status
          )
        )
      `
      )
      .eq("products.store_id", storeId)
      .eq("products.merchant_status", "active")
      .eq("products.system_status", "visible")
      .eq("products.has_stock", true)
      .gt("products.price_min", 0)
      .is("products.stores.deleted_at", null)
      .neq("products.stores.sync_status", "disabled");

    if (error) {
      console.error("[Stores] getCategoriesByStore error:", error);
      return [];
    }

    // Get unique category IDs
    const categoryIds = [
      ...new Set((productCategories ?? []).map((pc) => pc.category_id)),
    ];

    if (categoryIds.length === 0) {
      return [];
    }

    // Fetch category details (only top-level, depth=0)
    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("slug, name")
      .in("id", categoryIds)
      .eq("depth", 0)
      .order("name");

    if (catError) {
      console.error("[Stores] getCategoriesByStore categories error:", catError);
      return [];
    }

    return (categories ?? []).map((c) => ({
      slug: c.slug,
      name: c.name,
    }));
  }
);

export async function getPublicProductsByStoreId(
  storeId: string,
  params: StoreProductsParams = {}
): Promise<ProductWithStore[]> {
  const {
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
      console.error("[Stores] Category lookup error:", categoryLookupError);
      return [];
    }

    if (!categoryData) {
      return [];
    }

    const { data: productCategories } = await supabase
      .from("product_categories")
      .select("product_id")
      .eq("category_id", categoryData.id);

    productIdsFilter = (productCategories ?? []).map((pc) => pc.product_id);

    // If no products in this category, return empty
    if (productIdsFilter.length === 0) {
      return [];
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
        slug
      ),
      product_images!inner (
        url,
        position
      )
    `
    )
    .eq("store_id", storeId)
    .eq("merchant_status", "active")
    .eq("system_status", "visible")
    .eq("has_stock", true)
    .gt("price_min", 0);

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

  // Sorting (no relevance for store page - no full-text search)
  switch (sort) {
    case "price_asc":
      baseQuery = baseQuery.order("price_min", { ascending: true });
      break;
    case "price_desc":
      baseQuery = baseQuery.order("price_min", { ascending: false });
      break;
    case "newest":
    default:
      baseQuery = baseQuery.order("created_at", { ascending: false });
      break;
  }

  baseQuery = baseQuery.limit(limit);

  const { data, error } = await baseQuery;

  if (error) {
    console.error("[Stores] getPublicProductsByStoreId error:", error);
    return [];
  }

  return (data ?? []).map((p) => {
    const store = p.stores as unknown as { name: string; slug: string };
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
}
