import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface CategoryWithParent {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  depth: number;
}

export interface PublicCategory {
  slug: string;
  name: string;
}

// Categorías son estáticas — solo cambian via migración + redeploy.
// Usa cache() de React para deduplicar dentro del mismo request.
export const getAllCategories = cache(async (): Promise<CategoryWithParent[]> => {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("id, slug, name, parent_id, depth")
    .order("depth", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("[Categories] getAllCategories error:", error);
    return [];
  }

  return (data ?? []).map((cat) => ({
    id: cat.id,
    slug: cat.slug,
    name: cat.name,
    parentId: cat.parent_id,
    depth: cat.depth,
  }));
});

// Categorías con al menos 1 producto visible en la plataforma
// Solo categorías de nivel 0 (principales) para la navegación pública
// Usa product_categories que refleja la categoría efectiva (coalesce de manual/auto)
export const getPublicCategories = cache(async (): Promise<PublicCategory[]> => {
  const supabase = await createClient();

  // Get category IDs from product_categories for visible products
  const { data: productCategories, error } = await supabase
    .from("product_categories")
    .select(
      `
      category_id,
      products!inner (
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
    .eq("products.merchant_status", "active")
    .eq("products.system_status", "visible")
    .eq("products.has_stock", true)
    .gt("products.price_min", 0)
    .is("products.stores.deleted_at", null)
    .neq("products.stores.sync_status", "disabled");

  if (error) {
    console.error("[Categories] getPublicCategories error:", error);
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
    console.error("[Categories] getPublicCategories categories error:", catError);
    return [];
  }

  return (categories ?? []).map((c) => ({
    slug: c.slug,
    name: c.name,
  }));
});
