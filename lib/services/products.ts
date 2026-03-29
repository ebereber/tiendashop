import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { getCurrentMembership } from "@/lib/auth/get-current-membership";

const PAGE_SIZE = 50;

// --- Public product detail ---

export interface ProductImage {
  url: string;
  position: number;
}

export interface ProductVariant {
  id: string;
  title: string;
  price: number;
  stock: number;
  attributes: Record<string, string>[] | null;
}

export interface ProductWithDetails {
  id: string;
  title: string;
  description: string | null;
  brand: string | null;
  priceMin: number | null;
  hasStock: boolean;
  storeName: string;
  storeSlug: string;
  images: ProductImage[];
  variants: ProductVariant[];
}

export async function getPublicProductById(id: string): Promise<ProductWithDetails | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products", `product-${id}`);

  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id,
      title,
      description,
      brand,
      price_min,
      has_stock,
      stores!inner (
        name,
        slug,
        deleted_at,
        sync_status
      ),
      product_images (
        url,
        position
      ),
      product_variants (
        id,
        title,
        price,
        stock,
        attributes
      )
    `
    )
    .eq("id", id)
    .eq("merchant_status", "active")
    .eq("system_status", "visible")
    .eq("has_stock", true)
    .gt("price_min", 0)
    .is("stores.deleted_at", null)
    .neq("stores.sync_status", "disabled")
    .maybeSingle();

  if (error) {
    console.error("[Products] getPublicProductById error:", error);
    return null;
  }

  if (!data) {
    return null;
  }

  const store = data.stores as unknown as { name: string; slug: string };
  const images = (data.product_images as { url: string; position: number }[]) ?? [];
  const sortedImages = [...images].sort((a, b) => a.position - b.position);

  // Must have at least one image
  if (sortedImages.length === 0) {
    return null;
  }

  const rawVariants =
    (data.product_variants as {
      id: string;
      title: string;
      price: number;
      stock: number;
      attributes: Record<string, string>[] | null;
    }[]) ?? [];
  const sortedVariants = [...rawVariants].sort((a, b) => a.price - b.price);

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    brand: data.brand,
    priceMin: data.price_min,
    hasStock: data.has_stock,
    storeName: store.name,
    storeSlug: store.slug,
    images: sortedImages,
    variants: sortedVariants,
  };
}

// --- Dashboard products ---

export interface ProductVariantListItem {
  id: string;
  title: string;
  sku: string | null;
  price: number;
  stock: number;
}

export interface ProductListItem {
  id: string;
  title: string;
  brand: string | null;
  imageUrl: string | null;
  priceMin: number | null;
  priceMax: number | null;
  hasStock: boolean;
  isActive: boolean;
  systemStatus: "visible" | "hidden" | "error";
  sku: string | null;
  variantsCount: number;
  variants: ProductVariantListItem[];
  autoCategoryId: string | null;
  manualCategoryId: string | null;
  effectiveCategoryId: string | null;
}

export interface ProductsResult {
  products: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error: string | null;
}

export async function getProducts(page: number = 1): Promise<ProductsResult> {
  const membership = await getCurrentMembership();
  if (!membership) {
    return {
      products: [],
      total: 0,
      page: 1,
      pageSize: PAGE_SIZE,
      totalPages: 0,
      error: "No hay organizacion activa",
    };
  }

  const supabase = await createClient();

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id")
    .eq("organization_id", membership.organization_id)
    .is("deleted_at", null)
    .single();

  if (storeError || !store) {
    return {
      products: [],
      total: 0,
      page: 1,
      pageSize: PAGE_SIZE,
      totalPages: 0,
      error: "No hay tienda conectada",
    };
  }

  const { count, error: countError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", store.id);

  if (countError) {
    return {
      products: [],
      total: 0,
      page: 1,
      pageSize: PAGE_SIZE,
      totalPages: 0,
      error: "Error al contar productos",
    };
  }

  const total = count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));
  const offset = (currentPage - 1) * PAGE_SIZE;

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select(
      `
      id,
      title,
      brand,
      price_min,
      price_max,
      has_stock,
      merchant_status,
      system_status,
      auto_category_id,
      manual_category_id,
      product_images (
        url,
        position
      ),
      product_variants (
        id,
        title,
        sku,
        price,
        stock
      )
    `
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (productsError) {
    return {
      products: [],
      total,
      page: currentPage,
      pageSize: PAGE_SIZE,
      totalPages,
      error: "Error al cargar productos",
    };
  }

  const productList: ProductListItem[] = (products ?? []).map((product) => {
    const images = product.product_images ?? [];
    const firstImage =
      images.length > 0
        ? [...images].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]
        : null;

    const variants = product.product_variants ?? [];
    const sortedVariants = [...variants].sort((a, b) => a.price - b.price);
    const normalizedVariants: ProductVariantListItem[] = sortedVariants.map(
      (variant, index) => ({
        id: String(variant.id),
        title: variant.title || `Variante ${index + 1}`,
        sku: variant.sku ?? null,
        price: variant.price,
        stock: variant.stock ?? 0,
      })
    );

    const sku = variants.length === 1 ? (variants[0].sku ?? null) : null;

    const autoCategoryId = product.auto_category_id ?? null;
    const manualCategoryId = product.manual_category_id ?? null;
    const effectiveCategoryId = manualCategoryId ?? autoCategoryId;

    return {
      id: product.id,
      title: product.title,
      brand: product.brand,
      imageUrl: firstImage?.url ?? null,
      priceMin: product.price_min,
      priceMax: product.price_max,
      hasStock: product.has_stock,
      isActive: product.merchant_status === "active",
      systemStatus: product.system_status as "visible" | "hidden" | "error",
      sku,
      variantsCount: variants.length,
      variants: normalizedVariants,
      autoCategoryId,
      manualCategoryId,
      effectiveCategoryId,
    };
  });

  return {
    products: productList,
    total,
    page: currentPage,
    pageSize: PAGE_SIZE,
    totalPages,
    error: null,
  };
}
