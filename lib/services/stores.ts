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

export async function getPublicProductsByStoreId(
  storeId: string,
  limit: number = 48
): Promise<ProductWithStore[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
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
    .gt("price_min", 0)
    .order("created_at", { ascending: false })
    .limit(limit);

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
