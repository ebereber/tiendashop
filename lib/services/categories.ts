import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface CategoryWithParent {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  depth: number;
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
