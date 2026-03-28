"use server";

import { getCurrentMembership } from "@/lib/auth/get-current-membership";
import { createTiendanubeClient } from "@/lib/tiendanube/client";
import { extractLocalizedText } from "@/lib/tiendanube/helpers";
import type { TiendanubeProduct } from "@/lib/tiendanube/types";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type DiscrepancyType =
  | "missing_local" // exists in TN, not locally
  | "missing_remote" // exists locally, not in TN
  | "price_mismatch"
  | "stock_mismatch"
  | "title_mismatch";

export interface ProductDiscrepancy {
  tiendanubeProductId: string;
  localProductId: string | null;
  productTitle: string;
  type: DiscrepancyType;
  localValue: string | null;
  remoteValue: string | null;
}

export interface DiscrepancyReport {
  discrepancies: ProductDiscrepancy[];
  localCount: number;
  remoteCount: number;
  error: string | null;
}

interface LocalProduct {
  id: string;
  tiendanube_product_id: string;
  title: string;
  price_min: number | null;
  price_max: number | null;
  has_stock: boolean;
}

function getMainVariantData(tnProduct: TiendanubeProduct): {
  price: number | null;
  hasStock: boolean;
} {
  const variants = tnProduct.variants ?? [];
  if (variants.length === 0) {
    return { price: null, hasStock: false };
  }

  // Sort by price asc and get first (main variant)
  const sorted = [...variants].sort((a, b) => {
    const priceA = parseFloat(a.price) || 0;
    const priceB = parseFloat(b.price) || 0;
    return priceA - priceB;
  });

  const main = sorted[0];
  const parsedPrice = parseFloat(main.price);
  const price = Number.isNaN(parsedPrice) ? null : parsedPrice;
  const hasStock = variants.some(
    (variant) =>
      variant.stock_management === false ||
      (variant.stock_management === true && (variant.stock ?? 0) > 0)
  );

  return { price, hasStock };
}

function formatPrice(value: number | null): string {
  if (value === null) return "Sin precio";
  return `$${value.toLocaleString("es-AR")}`;
}

export async function getProductDiscrepancies(): Promise<DiscrepancyReport> {
  const membership = await getCurrentMembership();
  if (!membership) {
    return {
      discrepancies: [],
      localCount: 0,
      remoteCount: 0,
      error: "No hay organizacion activa",
    };
  }

  // Read store + token via backend secure client after membership validation.
  const { data: stores, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id, tiendanube_store_id, access_token")
    .eq("organization_id", membership.organization_id)
    .is("deleted_at", null);

  if (storeError) {
    return {
      discrepancies: [],
      localCount: 0,
      remoteCount: 0,
      error: `Error al consultar tienda activa: ${storeError.message}`,
    };
  }

  const activeStores = stores ?? [];
  if (activeStores.length === 0) {
    return {
      discrepancies: [],
      localCount: 0,
      remoteCount: 0,
      error: "No hay tienda activa conectada para esta organizacion",
    };
  }

  if (activeStores.length > 1) {
    return {
      discrepancies: [],
      localCount: 0,
      remoteCount: 0,
      error: "Inconsistencia: hay multiples tiendas activas en la organizacion",
    };
  }

  const store = activeStores[0];

  if (!store.access_token) {
    return {
      discrepancies: [],
      localCount: 0,
      remoteCount: 0,
      error: "La tienda no tiene token de acceso",
    };
  }

  // Fetch remote products from Tiendanube
  const client = createTiendanubeClient(store.tiendanube_store_id, store.access_token);
  const remoteResult = await client.getAllProducts();

  if (remoteResult.error) {
    return {
      discrepancies: [],
      localCount: 0,
      remoteCount: 0,
      error: `Error al consultar Tiendanube: ${remoteResult.error}`,
    };
  }

  const remoteProducts = remoteResult.data ?? [];

  // Fetch local products
  const { data: localProducts, error: localError } = await supabaseAdmin
    .from("products")
    .select("id, tiendanube_product_id, title, price_min, price_max, has_stock")
    .eq("store_id", store.id);

  if (localError) {
    return {
      discrepancies: [],
      localCount: 0,
      remoteCount: remoteProducts.length,
      error: "Error al consultar productos locales",
    };
  }

  const localList: LocalProduct[] = localProducts ?? [];

  // Build lookup maps
  const localByTnId = new Map<string, LocalProduct>();
  for (const p of localList) {
    localByTnId.set(p.tiendanube_product_id, p);
  }

  const remoteTnIds = new Set<string>();
  for (const p of remoteProducts) {
    remoteTnIds.add(String(p.id));
  }

  const discrepancies: ProductDiscrepancy[] = [];

  // Check remote products against local
  for (const remote of remoteProducts) {
    const tnId = String(remote.id);
    const title = extractLocalizedText(remote.name) || `Producto ${tnId}`;
    const local = localByTnId.get(tnId);

    if (!local) {
      // Missing locally
      discrepancies.push({
        tiendanubeProductId: tnId,
        localProductId: null,
        productTitle: title,
        type: "missing_local",
        localValue: null,
        remoteValue: "Existe en Tiendanube",
      });
      continue;
    }

    // Compare fields
    const { price: remotePrice, hasStock: remoteHasStock } = getMainVariantData(remote);
    const remoteTitle = title;

    // Title mismatch
    if (local.title !== remoteTitle) {
      discrepancies.push({
        tiendanubeProductId: tnId,
        localProductId: local.id,
        productTitle: remoteTitle,
        type: "title_mismatch",
        localValue: local.title,
        remoteValue: remoteTitle,
      });
    }

    // Price mismatch
    // Use price_min if available, otherwise price_max (for out-of-stock products)
    const localComparablePrice = local.price_min ?? local.price_max ?? null;

    // Normalize: treat 0 and null as equivalent (both mean "no price")
    const normalizedLocal = localComparablePrice === 0 ? null : localComparablePrice;
    const normalizedRemote = remotePrice === 0 ? null : remotePrice;

    if (normalizedLocal === null && normalizedRemote !== null) {
      discrepancies.push({
        tiendanubeProductId: tnId,
        localProductId: local.id,
        productTitle: remoteTitle,
        type: "price_mismatch",
        localValue: formatPrice(localComparablePrice),
        remoteValue: formatPrice(remotePrice),
      });
    } else if (normalizedLocal !== null && normalizedRemote === null) {
      discrepancies.push({
        tiendanubeProductId: tnId,
        localProductId: local.id,
        productTitle: remoteTitle,
        type: "price_mismatch",
        localValue: formatPrice(localComparablePrice),
        remoteValue: formatPrice(remotePrice),
      });
    } else if (normalizedLocal !== null && normalizedRemote !== null) {
      // Allow small tolerance for floating point
      const priceDiff = Math.abs(normalizedRemote - normalizedLocal);
      if (priceDiff > 0.01) {
        discrepancies.push({
          tiendanubeProductId: tnId,
          localProductId: local.id,
          productTitle: remoteTitle,
          type: "price_mismatch",
          localValue: formatPrice(localComparablePrice),
          remoteValue: formatPrice(remotePrice),
        });
      }
    }

    // Stock mismatch
    if (local.has_stock !== remoteHasStock) {
      discrepancies.push({
        tiendanubeProductId: tnId,
        localProductId: local.id,
        productTitle: remoteTitle,
        type: "stock_mismatch",
        localValue: local.has_stock ? "Con stock" : "Sin stock",
        remoteValue: remoteHasStock ? "Con stock" : "Sin stock",
      });
    }
  }

  // Check local products missing from remote
  for (const local of localList) {
    if (!remoteTnIds.has(local.tiendanube_product_id)) {
      discrepancies.push({
        tiendanubeProductId: local.tiendanube_product_id,
        localProductId: local.id,
        productTitle: local.title,
        type: "missing_remote",
        localValue: "Existe localmente",
        remoteValue: null,
      });
    }
  }

  return {
    discrepancies,
    localCount: localList.length,
    remoteCount: remoteProducts.length,
    error: null,
  };
}
