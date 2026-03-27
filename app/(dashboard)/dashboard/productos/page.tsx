import Link from "next/link";

import { getProducts } from "@/lib/services/products";
import { ProductList } from "@/components/dashboard/product-list";
import { ProductToolsMenu } from "@/components/dashboard/product-tools-menu";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function ProductosPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10) || 1;
  const result = await getProducts(page);

  if (result.error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Productos</h1>
        </div>

        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (result.products.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Productos</h1>
        </div>

        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              No tenes productos todavia.
            </p>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Sincroniza tu tienda para importar tus productos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Productos</h1>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {result.total} producto{result.total !== 1 ? "s" : ""}
          </p>
          <ProductToolsMenu />
        </div>
      </div>

      <ProductList products={result.products} />

      {result.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Pagina {result.page} de {result.totalPages}
          </p>

          <div className="flex gap-2">
            {result.page > 1 && (
              <Link
                href={`/dashboard/productos?page=${result.page - 1}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Anterior
              </Link>
            )}

            {result.page < result.totalPages && (
              <Link
                href={`/dashboard/productos?page=${result.page + 1}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Siguiente
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
