"use server";

import { getCurrentMembership } from "@/lib/auth/get-current-membership";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface UpdateCategoryResult {
  error?: string;
}

export async function updateProductCategory(
  productId: string,
  categoryId: string | null
): Promise<UpdateCategoryResult> {
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
      p_manual_category_id: categoryId,
    }
  );

  if (updateError) {
    console.error("[Products] update_product_manual_category rpc error:", updateError);
    return { error: "Error al actualizar categoria" };
  }

  return {};
}
