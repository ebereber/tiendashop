import type { Metadata } from "next";
import { SearchInput } from "@/components/search/search-input";
import { ProductGrid } from "@/components/product/product-grid";
import { CategoryRow } from "@/components/category/category-row";
import { FilterSheet } from "@/components/filters/filter-sheet";
import { getPublicProducts, type SortOption } from "@/lib/services/search";
import { getPublicCategories } from "@/lib/services/categories";

interface Props {
  searchParams: Promise<{
    q?: string;
    category?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
  }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const query = params.q?.trim();

  if (query) {
    return {
      title: `${query} - Buscar en TiendaShop`,
      description: `Resultados de busqueda para "${query}" en TiendaShop`,
    };
  }

  return {
    title: "Buscar productos - TiendaShop",
    description: "Busca entre miles de productos de tiendas Tiendanube",
  };
}

export default async function BuscarPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = params.q?.trim() || "";
  const activeCategory = params.category;
  const minPrice = params.minPrice ? Number(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;
  const sort = (params.sort as SortOption) || undefined;

  const [{ products, error }, categories] = await Promise.all([
    getPublicProducts({
      query: query || undefined,
      category: activeCategory,
      minPrice,
      maxPrice,
      sort,
      limit: 48,
    }),
    getPublicCategories(),
  ]);

  return (
    <div className="min-h-screen">
      {/* Search header */}
      <section className="border-b bg-muted/30 py-8">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl">
            <SearchInput defaultValue={query} autoFocus />
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {/* Categories + Filters */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 overflow-hidden">
              {categories.length > 0 && (
                <CategoryRow categories={categories} activeCategory={activeCategory} />
              )}
            </div>
            <div className="shrink-0">
              <FilterSheet hasQuery={!!query} />
            </div>
          </div>

          {query && (
            <p className="mb-6 text-sm text-muted-foreground">
              {products.length > 0
                ? `${products.length} resultado${products.length !== 1 ? "s" : ""} para "${query}"`
                : null}
            </p>
          )}

          {error ? (
            <p className="py-12 text-center text-muted-foreground">{error}</p>
          ) : products.length === 0 ? (
            <div className="py-12 text-center">
              {query ? (
                <>
                  <p className="text-lg font-medium">
                    No encontramos resultados para &quot;{query}&quot;
                  </p>
                  <p className="mt-2 text-muted-foreground">
                    Intenta con otro termino de busqueda.
                  </p>
                </>
              ) : activeCategory ? (
                <p className="text-muted-foreground">
                  No hay productos en esta categoria.
                </p>
              ) : (
                <p className="text-muted-foreground">
                  No hay productos disponibles todavia.
                </p>
              )}
            </div>
          ) : (
            <ProductGrid products={products} />
          )}
        </div>
      </section>
    </div>
  );
}
