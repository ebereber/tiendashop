import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TopProduct } from "@/lib/services/metrics";

interface TopProductsProps {
  topProducts: TopProduct[];
}

export function TopProducts({ topProducts }: TopProductsProps) {
  if (topProducts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Productos mas clickeados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aun no hay clicks registrados.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4" />
          Productos mas clickeados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {topProducts.map((product, index) => (
            <li
              key={product.productId}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {index + 1}
                </span>
                <span className="truncate text-sm">{product.title}</span>
              </div>
              <span className="shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
                {product.clicks.toLocaleString("es-AR")} clicks
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function TopProductsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4" />
          Productos mas clickeados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <li key={i} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 animate-pulse rounded-full bg-muted" />
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
