import { isAllowedImageHost } from "@/lib/images/allowed-hosts"
import type { ProductWithStore } from "@/lib/services/search"
import Image from "next/image"
import Link from "next/link"

interface ProductCardProps {
  product: ProductWithStore
}

export function ProductCard({ product }: ProductCardProps) {
  const { id, title, priceMin, storeName, imageUrl } = product

  const formattedPrice =
    priceMin != null && priceMin > 0
      ? `$${priceMin.toLocaleString("es-AR")}`
      : null

  return (
    <Link
      href={`/producto/${id}`}
      className="group block transition-colors hover:border-foreground/20"
    >
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
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
      <div className="space-y-1 p-3">
        <p className="mt-1 text-xs text-muted-foreground">{storeName}</p>
        <h3 className="line-clamp-2 text-sm leading-tight font-medium group-hover:underline">
          {title}
        </h3>
        {formattedPrice && (
          <p className="mt-1 text-base font-semibold">{formattedPrice}</p>
        )}
      </div>
    </Link>
  )
}
