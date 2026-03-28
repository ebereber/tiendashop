"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { hasAvailableStock } from "@/lib/stock";

interface Variant {
  id: string;
  title: string;
  price: number;
  stock: number;
}

interface VariantSelectorProps {
  variants: Variant[];
  onVariantChange: (price: number) => void;
}

export function VariantSelector({ variants, onVariantChange }: VariantSelectorProps) {
  const [userSelectedVariantId, setUserSelectedVariantId] = useState<string | null>(null);

  const defaultVariant = useMemo(
    () => variants.find((variant) => hasAvailableStock(variant.stock)) ?? variants[0] ?? null,
    [variants]
  );

  const selectedVariant = useMemo(() => {
    if (!variants.length) return null;
    if (!userSelectedVariantId) return defaultVariant;
    return variants.find((variant) => variant.id === userSelectedVariantId) ?? defaultVariant;
  }, [variants, userSelectedVariantId, defaultVariant]);

  useEffect(() => {
    if (!selectedVariant) return;
    onVariantChange(selectedVariant.price);
  }, [selectedVariant, onVariantChange]);

  if (variants.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Variantes</p>
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => {
          const isSelected = selectedVariant?.id === variant.id;
          const isOutOfStock = !hasAvailableStock(variant.stock);

          return (
            <button
              key={variant.id}
              type="button"
              disabled={isOutOfStock}
              onClick={() => {
                if (isOutOfStock) return;
                setUserSelectedVariantId(variant.id);
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                isSelected
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background hover:border-foreground/50",
                isOutOfStock && "cursor-not-allowed line-through opacity-50"
              )}
            >
              {variant.title} - ${variant.price.toLocaleString("es-AR")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
