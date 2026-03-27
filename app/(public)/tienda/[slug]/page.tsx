import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getStoreBySlug, getPublicProductsByStoreId } from "@/lib/services/stores";
import { ProductGrid } from "@/components/product/product-grid";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);

  if (!store) {
    return {
      title: "Tienda no encontrada - TiendaShop",
    };
  }

  return {
    title: `${store.name} - TiendaShop`,
    description: `Encuentra los mejores productos de ${store.name} en TiendaShop`,
  };
}

export default async function TiendaPage({ params }: Props) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);

  if (!store) {
    notFound();
  }

  const products = await getPublicProductsByStoreId(store.id, 48);

  const externalUrl = store.domain
    ? `https://${store.domain}`
    : `https://${store.slug}.mitiendanube.com`;

  return (
    <div className="min-h-screen">
      {/* Store header */}
      <section className="border-b bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold sm:text-3xl">{store.name}</h1>
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {store.domain ?? `${store.slug}.mitiendanube.com`}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </section>

      {/* Products */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {products.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                Esta tienda no tiene productos disponibles por el momento.
              </p>
              <Link
                href="/"
                className="mt-4 inline-block text-sm text-primary hover:underline"
              >
                Volver al inicio
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-6 text-sm text-muted-foreground">
                {products.length} producto{products.length !== 1 ? "s" : ""}
              </p>
              <ProductGrid products={products} />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
