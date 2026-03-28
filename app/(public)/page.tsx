import Link from "next/link";
import { SearchInput } from "@/components/search/search-input";
import { ProductGrid } from "@/components/product/product-grid";
import { CategoryRow } from "@/components/category/category-row";
import { getPublicProducts } from "@/lib/services/search";
import { getPublicCategories } from "@/lib/services/categories";
import { Button } from "@/components/ui/button";

interface Props {
  searchParams: Promise<{ category?: string }>;
}

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const activeCategory = params.category;

  const [{ products, error }, categories] = await Promise.all([
    getPublicProducts({ category: activeCategory, limit: 24 }),
    getPublicCategories(),
  ]);

  return (
    <div className="min-h-screen">
      {/* Hero section */}
      <section className="border-b bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Encuentra los mejores productos
            </h1>
            <p className="mt-3 text-muted-foreground">
              Miles de productos de tiendas Tiendanube en un solo lugar.
            </p>
            <div className="mt-6 flex justify-center">
              <SearchInput placeholder="Buscar productos..." />
            </div>
          </div>
        </div>
      </section>

      {/* Products section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {activeCategory ? "Productos" : "Productos recientes"}
            </h2>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/buscar" />}>
              Ver todos
            </Button>
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="mb-6">
              <CategoryRow categories={categories} activeCategory={activeCategory} />
            </div>
          )}

          {error ? (
            <p className="text-center text-muted-foreground">{error}</p>
          ) : products.length === 0 ? (
            <p className="text-center text-muted-foreground">
              {activeCategory
                ? "No hay productos en esta categoria."
                : "No hay productos disponibles todavia."}
            </p>
          ) : (
            <ProductGrid products={products} />
          )}
        </div>
      </section>

      {/* CTA section */}
      <section className="border-t bg-muted/30 py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-xl font-semibold">Tenes una tienda Tiendanube?</h2>
          <p className="mt-2 text-muted-foreground">
            Conecta tu tienda y empieza a mostrar tus productos a miles de compradores.
          </p>
          <Button className="mt-4" nativeButton={false} render={<Link href="/conectar" />}>
            Publicar mi tienda
          </Button>
        </div>
      </section>
    </div>
  );
}
