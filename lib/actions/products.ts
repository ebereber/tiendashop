"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getCurrentMembership } from "@/lib/auth/get-current-membership";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface ActionResult {
  error?: string;
}

interface ToggleResult {
  error?: string;
  newStatus?: "active" | "paused";
}

export async function updateProductCategory(
  productId: string,
  categoryId: string | null
): Promise<ActionResult> {
  const membership = await getCurrentMembership();
  if (!membership) {
    return { error: "No hay sesion activa" };
  }

  // Get store for this organization
  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("organization_id", membership.organization_id)
    .is("deleted_at", null)
    .single();

  if (storeError || !store) {
    return { error: "No hay tienda conectada" };
  }

  // Verify product belongs to this store
  const { data: product, error: productError } = await supabaseAdmin
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("store_id", store.id)
    .single();

  if (productError || !product) {
    return { error: "Producto no encontrado" };
  }

  // If categoryId is provided, verify it exists
  if (categoryId !== null) {
    const { data: category, error: categoryError } = await supabaseAdmin
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .single();

    if (categoryError || !category) {
      return { error: "Categoria no encontrada" };
    }
  }

  const { error: updateError } = await supabaseAdmin.rpc(
    "update_product_manual_category",
    {
      p_product_id: product.id,
      p_manual_category_id: categoryId ?? undefined,
    }
  );

  if (updateError) {
    console.error("[Products] update_product_manual_category rpc error:", updateError);
    return { error: "Error al actualizar categoria" };
  }

  revalidateTag("products", "max");
  revalidateTag(`product-${productId}`, "max");

  return {};
}

/**
 * Toggle product merchant_status between 'active' and 'paused'.
 * - Pausing is always allowed
 * - Publishing requires system_status = 'visible'
 */
export async function toggleProductMerchantStatus(
  productId: string
): Promise<ToggleResult> {
  const membership = await getCurrentMembership();
  if (!membership) {
    return { error: "No hay sesion activa" };
  }

  // Get store for this organization
  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("organization_id", membership.organization_id)
    .is("deleted_at", null)
    .single();

  if (storeError || !store) {
    return { error: "No hay tienda conectada" };
  }

  // Get product with current status - verify ownership
  const { data: product, error: productError } = await supabaseAdmin
    .from("products")
    .select("id, merchant_status, system_status")
    .eq("id", productId)
    .eq("store_id", store.id)
    .single();

  if (productError || !product) {
    return { error: "Producto no encontrado" };
  }

  const currentStatus = product.merchant_status as "active" | "paused";
  const systemStatus = product.system_status as string;

  // Determine new status
  let newStatus: "active" | "paused";

  if (currentStatus === "active") {
    // Pausing is always allowed
    newStatus = "paused";
  } else {
    // Attempting to publish - check system_status
    if (systemStatus !== "visible") {
      return {
        error:
          "Este producto tiene problemas que impiden publicarlo. Revisa el estado en el panel de discrepancias.",
      };
    }
    newStatus = "active";
  }

  // Update merchant_status
  const { data: updatedRows, error: updateError } = await supabaseAdmin
    .from("products")
    .update({ merchant_status: newStatus })
    .eq("id", productId)
    .eq("store_id", store.id)
    .select("id");

  if (updateError) {
    console.error("[Products] toggleProductMerchantStatus error:", updateError);
    return { error: "Error al actualizar el estado del producto" };
  }

  if (!updatedRows || updatedRows.length !== 1) {
    return { error: "No se pudo actualizar el producto." };
  }

  revalidatePath("/dashboard/productos");
  revalidateTag("products", "max");
  revalidateTag(`product-${productId}`, "max");

  return { newStatus };
}
