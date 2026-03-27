import type { Metadata } from "next";
import { SearchInput } from "@/components/search/search-input";
import { ProductGrid } from "@/components/product/product-grid";
import { getPublicProducts } from "@/lib/services/search";

interface Props {
  searchParams: Promise<{ q?: string }>;
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

  const { products, error } = await getPublicProducts(query || undefined, 48);

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
              ) : (
                <p className="text-muted-foreground">
                  No hay productos disponibles todavia.
                </p>
              )}
            </div>
          ) : (
            <ProductGrid products={products} source="search" query={query || undefined} />
          )}
        </div>
      </section>
    </div>
  );
}
