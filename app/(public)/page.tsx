import Link from "next/link";
import { SearchInput } from "@/components/search/search-input";
import { ProductGrid } from "@/components/product/product-grid";
import { getPublicProducts } from "@/lib/services/search";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const { products, error } = await getPublicProducts(undefined, 24);

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
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Productos recientes</h2>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/buscar" />}>
              Ver todos
            </Button>
          </div>

          {error ? (
            <p className="text-center text-muted-foreground">{error}</p>
          ) : products.length === 0 ? (
            <p className="text-center text-muted-foreground">
              No hay productos disponibles todavia.
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
