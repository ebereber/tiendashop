import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/auth/get-current-membership";

export interface DashboardMetrics {
  totalClicks: number;
  clicks7days: number;
  clicks30days: number;
  topProducts: TopProduct[];
  error?: string;
}

export interface TopProduct {
  productId: string;
  title: string;
  clicks: number;
}

interface MetricsParams {
  since7days: Date;
  since30days: Date;
}

/**
 * Get dashboard metrics for the current store.
 * Dates are passed as parameters to keep the service pure (no internal Date calls).
 */
export async function getDashboardMetrics(
  storeId: string,
  params: MetricsParams
): Promise<DashboardMetrics> {
  const supabase = await createClient();

  // Total clicks
  const { count: totalClicks, error: totalClicksError } = await supabase
    .from("redirect_events")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId);
  if (totalClicksError) {
    console.error("[metrics] total clicks error:", totalClicksError);
    return {
      totalClicks: 0,
      clicks7days: 0,
      clicks30days: 0,
      topProducts: [],
      error: totalClicksError.message,
    };
  }

  // Clicks last 7 days
  const { count: clicks7days, error: clicks7daysError } = await supabase
    .from("redirect_events")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .gte("created_at", params.since7days.toISOString());
  if (clicks7daysError) {
    console.error("[metrics] clicks last 7 days error:", clicks7daysError);
    return {
      totalClicks: 0,
      clicks7days: 0,
      clicks30days: 0,
      topProducts: [],
      error: clicks7daysError.message,
    };
  }

  // Clicks last 30 days
  const { count: clicks30days, error: clicks30daysError } = await supabase
    .from("redirect_events")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .gte("created_at", params.since30days.toISOString());
  if (clicks30daysError) {
    console.error("[metrics] clicks last 30 days error:", clicks30daysError);
    return {
      totalClicks: 0,
      clicks7days: 0,
      clicks30days: 0,
      topProducts: [],
      error: clicks30daysError.message,
    };
  }

  // Top 5 products by clicks
  // Use raw SQL via rpc for GROUP BY aggregation
  const { data: topProductsData, error: topProductsError } = await supabase.rpc(
    "get_top_clicked_products",
    {
    p_store_id: storeId,
    p_limit: 5,
    }
  );
  if (topProductsError) {
    console.error("[metrics] top products rpc error:", topProductsError);
    return {
      totalClicks: 0,
      clicks7days: 0,
      clicks30days: 0,
      topProducts: [],
      error: topProductsError.message,
    };
  }

  const topProducts: TopProduct[] = (topProductsData ?? []).map(
    (row: { product_id: string; title: string; clicks: number }) => ({
      productId: row.product_id,
      title: row.title,
      clicks: row.clicks,
    })
  );

  return {
    totalClicks: totalClicks ?? 0,
    clicks7days: clicks7days ?? 0,
    clicks30days: clicks30days ?? 0,
    topProducts,
  };
}

/**
 * Get click counts per product for the current store.
 * Returns a Map for O(1) lookup when rendering product lists.
 */
export async function getProductClickCounts(
  storeId: string
): Promise<Map<string, number>> {
  const supabase = await createClient();

  // Use raw SQL via rpc for GROUP BY aggregation
  const { data, error } = await supabase.rpc("get_product_click_counts", {
    p_store_id: storeId,
  });
  if (error) {
    console.error("[metrics] product click counts rpc error:", error);
    return new Map<string, number>();
  }

  const clickCounts = new Map<string, number>();
  for (const row of data ?? []) {
    clickCounts.set(row.product_id, row.clicks);
  }

  return clickCounts;
}

/**
 * Helper to get the current store ID from membership.
 * Reuses the same logic as other dashboard services.
 */
export async function getCurrentStoreId(): Promise<string | null> {
  const membership = await getCurrentMembership();
  if (!membership) {
    return null;
  }

  const supabase = await createClient();
  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("organization_id", membership.organization_id)
    .is("deleted_at", null)
    .single();

  return store?.id ?? null;
}
