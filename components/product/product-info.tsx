"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VariantSelector } from "./variant-selector";
import type { ProductVariant } from "@/lib/services/products";

interface ProductInfoProps {
  productId: string;
  title: string;
  brand: string | null;
  priceMin: number | null;
  storeName: string;
  storeSlug: string;
  variants: ProductVariant[];
  cleanDescription: string | null;
}

export function ProductInfo({
  productId,
  title,
  brand,
  priceMin,
  storeName,
  storeSlug,
  variants,
  cleanDescription,
}: ProductInfoProps) {
  const [currentPrice, setCurrentPrice] = useState<number | null>(priceMin);

  const formattedPrice =
    currentPrice != null && currentPrice > 0
      ? `$${currentPrice.toLocaleString("es-AR")}`
      : null;

  const buyUrl = `/api/r/${productId}?from=product&pos=0`;

  return (
    <div className="space-y-6">
      <div>
        {brand && (
          <p className="text-sm text-muted-foreground">{brand}</p>
        )}
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{title}</h1>
      </div>

      {formattedPrice && (
        <p className="text-3xl font-bold">{formattedPrice}</p>
      )}

      <p className="text-sm text-muted-foreground">En stock</p>

      {variants.length > 0 && (
        <VariantSelector
          variants={variants}
          onVariantChange={setCurrentPrice}
        />
      )}

      <Button
        size="lg"
        className="w-full sm:w-auto"
        nativeButton={false}
        render={<a href={buyUrl} />}
      >
        Comprar en {storeName}
      </Button>

      <div className="border-t pt-4">
        <p className="text-sm text-muted-foreground">
          Vendido por{" "}
          <Link
            href={`/tienda/${storeSlug}`}
            className="font-medium text-foreground hover:underline"
          >
            {storeName}
          </Link>
        </p>
      </div>

      {cleanDescription && (
        <div className="border-t pt-4">
          <h2 className="mb-2 font-semibold">Descripcion</h2>
          <div
            className="prose prose-sm max-w-none text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: cleanDescription }}
          />
        </div>
      )}
    </div>
  );
}
