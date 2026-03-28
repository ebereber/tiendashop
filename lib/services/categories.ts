import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ProductWithStore } from "./search";

export interface CategoryWithParent {
  id: string;
  slug: string;
  path: string;
  name: string;
  parentId: string | null;
  depth: number;
}

export interface PublicCategory {
  slug: string;
  path: string;
  name: string;
}

export interface PublicCategoryDetails {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  depth: number;
  subcategories: PublicCategory[];
}

export interface CategoryNavItem {
  slug: string;
  path: string;
  name: string;
  subcategories: PublicCategory[];
}

// Categorías son estáticas — solo cambian via migración + redeploy.
// Usa cache() de React para deduplicar dentro del mismo request.
export const getAllCategories = cache(async (): Promise<CategoryWithParent[]> => {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("id, slug, path, name, parent_id, depth")
    .order("depth", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("[Categories] getAllCategories error:", error);
    return [];
  }

  return (data ?? []).map((cat) => ({
    id: cat.id,
    slug: cat.slug,
    path: cat.path,
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
    .select("slug, path, name")
    .in("id", categoryIds)
    .eq("depth", 0)
    .order("name");

  if (catError) {
    console.error("[Categories] getPublicCategories categories error:", catError);
    return [];
  }

  return (categories ?? []).map((c) => ({
    slug: c.slug,
    path: c.path,
    name: c.name,
  }));
});

// Get a main category by path segment with its subcategories
// URL: /categoria/moda → pathSegment = 'moda'
// URL: /categoria/hogar-deco → pathSegment = 'hogar-deco'
export const getPublicCategoryBySlug = cache(
  async (pathSegment: string): Promise<PublicCategoryDetails | null> => {
    const supabase = await createClient();

    // Get the category by path (path matches URL segment for depth=0)
    const { data: category, error } = await supabase
      .from("categories")
      .select("id, slug, name, parent_id, depth, path")
      .eq("path", pathSegment)
      .eq("depth", 0)
      .maybeSingle();

    if (error) {
      console.error("[Categories] getPublicCategoryBySlug error:", error);
      return null;
    }

    if (!category) {
      return null;
    }

    // Get subcategories - return the child segment of path for URL building
    const { data: subcategories, error: subError } = await supabase
      .from("categories")
      .select("path, name")
      .eq("parent_id", category.id)
      .order("name");

    if (subError) {
      console.error("[Categories] getPublicCategoryBySlug subcategories error:", subError);
    }

    return {
      id: category.id,
      slug: category.path, // Use path for URL building
      name: category.name,
      parentId: category.parent_id,
      depth: category.depth,
      subcategories: (subcategories ?? []).map((s) => {
        // Extract child segment from path (e.g., 'moda/remeras' → 'remeras')
        const childSegment = s.path.split("/").pop() ?? s.path;
        return {
          slug: childSegment,
          path: childSegment,
          name: s.name,
        };
      }),
    };
  }
);

// Get a subcategory by path segments
// URL: /categoria/moda/remeras → parentSegment = 'moda', childSegment = 'remeras'
// Searches by path = 'moda/remeras'
export const getPublicSubcategoryBySlugs = cache(
  async (
    parentSegment: string,
    childSegment: string
  ): Promise<{ category: PublicCategoryDetails; parent: PublicCategory } | null> => {
    const supabase = await createClient();

    const fullPath = `${parentSegment}/${childSegment}`;

    // Get the subcategory by full path, including parent info
    const { data: child, error: childError } = await supabase
      .from("categories")
      .select("id, slug, name, parent_id, depth, path")
      .eq("path", fullPath)
      .eq("depth", 1)
      .maybeSingle();

    if (childError || !child) {
      return null;
    }

    // Get the parent category
    const { data: parent, error: parentError } = await supabase
      .from("categories")
      .select("slug, name, path")
      .eq("id", child.parent_id)
      .maybeSingle();

    if (parentError || !parent) {
      return null;
    }

    return {
      category: {
        id: child.id,
        slug: childSegment, // Use path segment for URL building
        name: child.name,
        parentId: child.parent_id,
        depth: child.depth,
        subcategories: [],
      },
      parent: {
        slug: parent.path, // Use path for URL building
        path: parent.path,
        name: parent.name,
      },
    };
  }
);

// Get products for a main category (includes products from subcategories)
// pathSegment matches the URL segment (e.g., 'moda', 'hogar-deco')
export async function getPublicProductsByCategorySlug(
  pathSegment: string,
  limit: number = 48
): Promise<ProductWithStore[]> {
  const supabase = await createClient();

  // Get the category by path
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("path", pathSegment)
    .eq("depth", 0)
    .maybeSingle();

  if (!category) {
    return [];
  }

  // Get all category IDs (main + subcategories)
  const { data: subcategories } = await supabase
    .from("categories")
    .select("id")
    .eq("parent_id", category.id);

  const categoryIds = [category.id, ...(subcategories ?? []).map((s) => s.id)];

  // Get product IDs from product_categories
  const { data: productCategories } = await supabase
    .from("product_categories")
    .select("product_id")
    .in("category_id", categoryIds);

  const productIds = (productCategories ?? []).map((pc) => pc.product_id);

  if (productIds.length === 0) {
    return [];
  }

  // Fetch products
  const { data: products, error } = await supabase
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
    .in("id", productIds)
    .eq("merchant_status", "active")
    .eq("system_status", "visible")
    .eq("has_stock", true)
    .gt("price_min", 0)
    .is("stores.deleted_at", null)
    .neq("stores.sync_status", "disabled")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[Categories] getPublicProductsByCategorySlug error:", error);
    return [];
  }

  return (products ?? []).map((p) => {
    const store = p.stores as unknown as { name: string; slug: string };
    const images = (p.product_images as { url: string; position: number }[]) ?? [];
    const sortedImages = [...images].sort((a, b) => a.position - b.position);

    return {
      id: p.id,
      title: p.title,
      priceMin: p.price_min,
      storeName: store.name,
      storeSlug: store.slug,
      imageUrl: sortedImages[0]?.url ?? null,
    };
  });
}

// Get products for a specific subcategory only
export async function getPublicProductsBySubcategorySlug(
  parentSlug: string,
  childSlug: string,
  limit: number = 48
): Promise<ProductWithStore[]> {
  const supabase = await createClient();

  // Validate and get the subcategory
  const result = await getPublicSubcategoryBySlugs(parentSlug, childSlug);
  if (!result) {
    return [];
  }

  // Get product IDs from product_categories
  const { data: productCategories } = await supabase
    .from("product_categories")
    .select("product_id")
    .eq("category_id", result.category.id);

  const productIds = (productCategories ?? []).map((pc) => pc.product_id);

  if (productIds.length === 0) {
    return [];
  }

  // Fetch products
  const { data: products, error } = await supabase
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
    .in("id", productIds)
    .eq("merchant_status", "active")
    .eq("system_status", "visible")
    .eq("has_stock", true)
    .gt("price_min", 0)
    .is("stores.deleted_at", null)
    .neq("stores.sync_status", "disabled")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[Categories] getPublicProductsBySubcategorySlug error:", error);
    return [];
  }

  return (products ?? []).map((p) => {
    const store = p.stores as unknown as { name: string; slug: string };
    const images = (p.product_images as { url: string; position: number }[]) ?? [];
    const sortedImages = [...images].sort((a, b) => a.position - b.position);

    return {
      id: p.id,
      title: p.title,
      priceMin: p.price_min,
      storeName: store.name,
      storeSlug: store.slug,
      imageUrl: sortedImages[0]?.url ?? null,
    };
  });
}

// Get all main categories with their subcategories for navigation
export const getPublicCategoryNavigation = cache(
  async (): Promise<CategoryNavItem[]> => {
    const supabase = await createClient();

    // Get all categories
    const { data: categories, error } = await supabase
      .from("categories")
      .select("id, slug, path, name, parent_id, depth")
      .order("name");

    if (error) {
      console.error("[Categories] getPublicCategoryNavigation error:", error);
      return [];
    }

    // Build navigation structure
    const mainCategories = (categories ?? []).filter((c) => c.depth === 0);
    const subcategories = (categories ?? []).filter((c) => c.depth === 1);

    return mainCategories.map((main) => ({
      slug: main.slug,
      path: main.path,
      name: main.name,
      subcategories: subcategories
        .filter((sub) => sub.parent_id === main.id)
        .map((sub) => ({
          slug: sub.slug,
          path: sub.path.split("/").pop() ?? sub.path,
          name: sub.name,
        })),
    }));
  }
);
