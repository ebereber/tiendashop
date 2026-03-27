import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/auth/get-current-membership";

const PAGE_SIZE = 50;

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
  sku: string | null;
  variantsCount: number;
  variants: ProductVariantListItem[];
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

    return {
      id: product.id,
      title: product.title,
      brand: product.brand,
      imageUrl: firstImage?.url ?? null,
      priceMin: product.price_min,
      priceMax: product.price_max,
      hasStock: product.has_stock,
      isActive: product.merchant_status === "active",
      sku,
      variantsCount: variants.length,
      variants: normalizedVariants,
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
