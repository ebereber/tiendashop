import { ProductCard } from "./product-card";
import type { ProductWithStore } from "@/lib/services/search";

interface ProductGridProps {
  products: ProductWithStore[];
}

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
