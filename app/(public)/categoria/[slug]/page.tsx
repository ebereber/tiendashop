import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import {
  getPublicCategoryBySlug,
  getPublicProductsByCategorySlug,
  getPublicCategories,
} from "@/lib/services/categories";
import { ProductGrid } from "@/components/product/product-grid";
import { CategoryNav } from "@/components/category/category-nav";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getPublicCategoryBySlug(slug);

  if (!category) {
    return {
      title: "Categoria no encontrada - TiendaShop",
    };
  }

  return {
    title: `${category.name} | TiendaShop`,
    description: `Encuentra los mejores productos de ${category.name} en TiendaShop`,
  };
}

export default async function CategoriaPage({ params }: Props) {
  const { slug } = await params;
  const category = await getPublicCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const [products, allCategories] = await Promise.all([
    getPublicProductsByCategorySlug(slug),
    getPublicCategories(),
  ]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="border-b bg-muted/30 py-8">
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <nav className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Inicio
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{category.name}</span>
          </nav>

          <h1 className="text-2xl font-bold sm:text-3xl">{category.name}</h1>

          {/* Subcategories */}
          {category.subcategories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {category.subcategories.map((sub) => (
                <Link
                  key={sub.path}
                  href={`/categoria/${slug}/${sub.path}`}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  {sub.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Products */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {/* Category navigation */}
          {allCategories.length > 0 && (
            <div className="mb-6">
              <CategoryNav
                categories={allCategories}
                activeSlug={slug}
                basePath="/categoria"
              />
            </div>
          )}

          {products.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                No hay productos disponibles en esta categoria por el momento.
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
