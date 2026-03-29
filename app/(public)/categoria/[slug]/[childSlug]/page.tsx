import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import {
  getPublicSubcategoryBySlugs,
  getPublicProductsBySubcategorySlug,
  getPublicCategoryBySlug,
} from "@/lib/services/categories";
import { ProductGrid } from "@/components/product/product-grid";
import { CategoryNav } from "@/components/category/category-nav";
import { ProductGridSkeleton } from "@/components/product/product-grid-skeleton";

interface Props {
  params: Promise<{ slug: string; childSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: parentSlug, childSlug } = await params;
  const result = await getPublicSubcategoryBySlugs(parentSlug, childSlug);

  if (!result) {
    return {
      title: "Categoria no encontrada - TiendaShop",
    };
  }

  return {
    title: `${result.category.name} | ${result.parent.name} | TiendaShop`,
    description: `Encuentra los mejores productos de ${result.category.name} en TiendaShop`,
  };
}

export default async function SubcategoriaPage({ params }: Props) {
  const { slug: parentSlug, childSlug } = await params;
  const [result, parentCategory] = await Promise.all([
    getPublicSubcategoryBySlugs(parentSlug, childSlug),
    getPublicCategoryBySlug(parentSlug),
  ]);

  if (!result) {
    notFound();
  }

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
            <Link href={`/categoria/${parentSlug}`} className="hover:text-foreground">
              {result.parent.name}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{result.category.name}</span>
          </nav>

          <h1 className="text-2xl font-bold sm:text-3xl">{result.category.name}</h1>

          {/* Sibling subcategories */}
          {parentCategory && parentCategory.subcategories.length > 1 && (
            <div className="mt-4">
              <CategoryNav
                categories={parentCategory.subcategories}
                activeSlug={childSlug}
                basePath={`/categoria/${parentSlug}`}
              />
            </div>
          )}
        </div>
      </section>

      {/* Products */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <Suspense fallback={<ProductGridSkeleton />}>
            <SubcategoryProducts
              parentSlug={parentSlug}
              childSlug={childSlug}
              parentName={result.parent.name}
            />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

async function SubcategoryProducts({
  parentSlug,
  childSlug,
  parentName,
}: {
  parentSlug: string;
  childSlug: string;
  parentName: string;
}) {
  const products = await getPublicProductsBySubcategorySlug(parentSlug, childSlug);

  if (products.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          No hay productos disponibles en esta categoria por el momento.
        </p>
        <Link
          href={`/categoria/${parentSlug}`}
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          Ver todos los productos de {parentName}
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="mb-6 text-sm text-muted-foreground">
        {products.length} producto{products.length !== 1 ? "s" : ""}
      </p>
      <ProductGrid products={products} />
    </>
  );
}
