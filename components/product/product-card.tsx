import Link from "next/link";
import Image from "next/image";
import { isAllowedImageHost } from "@/lib/images/allowed-hosts";
import type { ProductWithStore } from "@/lib/services/search";

interface ProductCardProps {
  product: ProductWithStore;
}

export function ProductCard({ product }: ProductCardProps) {
  const { id, title, priceMin, storeName, imageUrl } = product;

  const formattedPrice =
    priceMin != null && priceMin > 0
      ? `$${priceMin.toLocaleString("es-AR")}`
      : null;

  return (
    <Link
      href={`/producto/${id}`}
      className="group block overflow-hidden rounded-lg border bg-card transition-colors hover:border-foreground/20"
    >
      <div className="relative aspect-square bg-muted">
        {imageUrl ? (
          isAllowedImageHost(imageUrl) ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover"
            />
          )
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Sin imagen
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-tight group-hover:underline">
          {title}
        </h3>
        {formattedPrice && (
          <p className="mt-1 text-base font-semibold">{formattedPrice}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{storeName}</p>
      </div>
    </Link>
  );
}
