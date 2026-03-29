"use client"

import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Package,
} from "lucide-react"
import Image from "next/image"
import { useState, useTransition } from "react"

import { CategorySelector } from "@/components/dashboard/category-selector"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { toggleProductMerchantStatus } from "@/lib/actions/products"
import { isAllowedImageHost } from "@/lib/images/allowed-hosts"
import type { CategoryWithParent } from "@/lib/services/categories"
import type { ProductListItem } from "@/lib/services/products"
import { hasAvailableStock, isInfiniteStock } from "@/lib/stock"
import { cn } from "@/lib/utils"

interface ProductListProps {
  products: ProductListItem[]
  categories: CategoryWithParent[]
  clickCounts?: Map<string, number>
}

function formatPrice(min: number | null, max: number | null): string {
  if (min === null && max === null) return "—"
  if (min === null) return `$${max!.toLocaleString("es-AR")}`
  if (max === null) return `$${min.toLocaleString("es-AR")}`
  if (min === max) return `$${min.toLocaleString("es-AR")}`
  return `$${min.toLocaleString("es-AR")} - $${max.toLocaleString("es-AR")}`
}

function stockLabel(stock: number): { text: string; className: string } {
  if (isInfiniteStock(stock)) {
    return { text: "Stock disponible", className: "text-emerald-700/90" }
  }

  if (stock > 0) {
    return { text: `${stock} en stock`, className: "text-emerald-700/90" }
  }
  return { text: "Sin stock", className: "text-rose-600/85" }
}

function ProductImageThumb({ url, alt }: { url: string | null; alt: string }) {
  if (url && isAllowedImageHost(url)) {
    return (
      <Image
        src={url}
        alt={alt}
        width={40}
        height={40}
        className="h-10 w-10 rounded-md object-cover ring-1 ring-border/50"
      />
    )
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted/60 ring-1 ring-border/50">
      <Package className="h-4 w-4 text-muted-foreground" />
    </div>
  )
}

function PublishToggle({
  productId,
  isActive,
  systemStatus,
  onStatusChange,
}: {
  productId: string
  isActive: boolean
  systemStatus: "visible" | "hidden" | "error"
  onStatusChange: (productId: string, newStatus: boolean) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [optimisticActive, setOptimisticActive] = useState(isActive)
  const [error, setError] = useState<string | null>(null)
  const canPublish = systemStatus === "visible"
  const isDisabled = isPending || (!optimisticActive && !canPublish)

  const handleToggle = () => {
    const previousState = optimisticActive
    const newState = !optimisticActive

    // Optimistic update
    setOptimisticActive(newState)
    setError(null)

    startTransition(async () => {
      const result = await toggleProductMerchantStatus(productId)

      if (result.error) {
        // Rollback on error
        setOptimisticActive(previousState)
        setError(result.error)
        return
      }

      // Confirm the new status
      const confirmed = result.newStatus === "active"
      setOptimisticActive(confirmed)
      onStatusChange(productId, confirmed)
    })
  }

  return (
    <div className="flex flex-col items-start gap-0.5">
      <div className="flex items-center gap-2">
        <Switch
          checked={optimisticActive}
          onCheckedChange={handleToggle}
          disabled={isDisabled}
          className={cn(isPending && "opacity-60")}
        />
        <span className="text-xs text-muted-foreground">
          {optimisticActive ? "Publicado" : "Oculto"}
        </span>
      </div>
      {!optimisticActive && !canPublish && !error && (
        <span className="text-[10px] text-destructive">
          Tiene problemas — revisa discrepancias
        </span>
      )}
      {error && (
        <span
          className="max-w-[10rem] truncate text-[10px] text-rose-600"
          title={error}
        >
          {error}
        </span>
      )}
    </div>
  )
}

function ProductRow({
  product,
  expanded,
  onToggle,
  categories,
  clicks,
  onStatusChange,
}: {
  product: ProductListItem
  expanded: boolean
  onToggle: () => void
  categories: CategoryWithParent[]
  clicks: number
  onStatusChange: (productId: string, newStatus: boolean) => void
}) {
  const canExpand = product.variantsCount > 1
  const priceLabel = formatPrice(product.priceMin, product.priceMax)
  const singleVariant = product.variantsCount === 1 ? product.variants[0] : null
  const variantStock = singleVariant ? stockLabel(singleVariant.stock) : null

  return (
    <div className="border-b border-border/60 last:border-b-0">
      {/*
        Grid columns:
        - Mobile (5 cols): expand, image, info, price, actions
        - SM (6 cols): + stock
        - MD (7 cols): + state badge
        - LG (9 cols): + category, clicks
      */}
      <div
        className={cn(
          "grid items-center gap-x-2 px-3 py-2",
          "grid-cols-[1.5rem_2.5rem_1fr_5.5rem_auto]",
          "sm:grid-cols-[1.5rem_2.5rem_1fr_5.5rem_5rem_auto]",
          "md:grid-cols-[1.5rem_2.5rem_1fr_5.5rem_5rem_4.5rem_auto]",
          "lg:grid-cols-[1.5rem_2.5rem_1fr_5.5rem_5rem_4.5rem_10rem_4rem_auto]"
        )}
      >
        {/* Col 1: Expand */}
        <div className="flex justify-center">
          {canExpand ? (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onToggle}
              aria-expanded={expanded}
              aria-controls={`variants-${product.id}`}
              className="h-6 w-6 text-muted-foreground"
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </Button>
          ) : (
            <span className="h-6 w-6" />
          )}
        </div>

        {/* Col 2: Image */}
        <ProductImageThumb url={product.imageUrl} alt={product.title} />

        {/* Col 3: Info */}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{product.title}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {canExpand
              ? `${product.variantsCount} variantes`
              : product.sku
                ? `SKU ${product.sku}`
                : "Sin SKU"}
          </p>
        </div>

        {/* Col 4: Price */}
        <div className="text-right">
          <p className="text-sm font-medium tabular-nums">{priceLabel}</p>
        </div>

        {/* Col 5: Stock (hidden mobile) */}
        <div className="hidden text-right text-xs sm:block">
          {variantStock ? (
            <span className={cn("tabular-nums", variantStock.className)}>
              {variantStock.text}
            </span>
          ) : (
            <span
              className={cn(
                "tabular-nums",
                product.hasStock ? "text-emerald-700/90" : "text-rose-600/85"
              )}
            >
              {product.hasStock ? "Con stock" : "Sin stock"}
            </span>
          )}
        </div>

        {/* Col 6: Publish toggle (hidden mobile/sm) */}
        <div className="hidden md:block">
          <PublishToggle
            productId={product.id}
            isActive={product.isActive}
            systemStatus={product.systemStatus}
            onStatusChange={onStatusChange}
          />
        </div>

        {/* Col 7: Category (hidden below lg) */}
        <div className="hidden lg:block">
          <CategorySelector
            key={`${product.id}:${product.effectiveCategoryId ?? "none"}:${product.manualCategoryId ?? "auto"}`}
            productId={product.id}
            currentCategoryId={product.effectiveCategoryId}
            autoCategoryId={product.autoCategoryId}
            isManual={product.manualCategoryId !== null}
            categories={categories}
          />
        </div>

        {/* Col 8: Clicks (hidden below lg) */}
        <div className="hidden text-right text-xs lg:block">
          <span className="text-muted-foreground tabular-nums">
            {clicks > 0 ? clicks.toLocaleString("es-AR") : "—"}
          </span>
        </div>

        {/* Col 9: Actions */}
        <div className="flex items-center justify-end gap-1">
          {/*  <Button size="xs" variant={product.isActive ? "outline" : "default"} disabled>
            {ctaLabel}
          </Button> */}
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="Mas acciones"
            disabled
          >
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {canExpand && expanded ? (
        <div
          id={`variants-${product.id}`}
          className="border-t border-border/50 bg-muted/20 pr-3 pb-2 pl-12"
        >
          <ul className="divide-y divide-border/40">
            {product.variants.map((variant) => {
              const vStock = stockLabel(variant.stock)
              return (
                <li
                  key={variant.id}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,8rem)_5.5rem_5.5rem] items-center gap-x-3 py-1.5 text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate text-xs font-medium">
                      {variant.title}
                    </p>
                  </div>
                  <div className="min-w-0 text-muted-foreground">
                    <p className="truncate">
                      {variant.sku ? `SKU ${variant.sku}` : "Sin SKU"}
                    </p>
                  </div>
                  <div className="text-right font-medium tabular-nums">
                    ${variant.price.toLocaleString("es-AR")}
                  </div>
                  <div
                    className={cn("text-right tabular-nums", vStock.className)}
                  >
                    {isInfiniteStock(variant.stock)
                      ? "En stock"
                      : hasAvailableStock(variant.stock)
                        ? variant.stock
                        : "0"}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export function ProductList({
  products,
  categories,
  clickCounts,
}: ProductListProps) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [statusOverrides, setStatusOverrides] = useState<Record<string, boolean>>({})

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleStatusChange = (productId: string, newStatus: boolean) => {
    setStatusOverrides((prev) => ({ ...prev, [productId]: newStatus }))
  }

  return (
    <div className="overflow-hidden rounded-md border border-border/70 bg-background">
      <div>
        {products.map((product) => {
          // Baseline always comes from props; overrides only apply after local toggles.
          // This keeps UI synced when products props change from server.
          const isActive = statusOverrides[product.id] ?? product.isActive

          return (
            <ProductRow
              key={`${product.id}:${isActive}`}
              product={{
                ...product,
                isActive,
              }}
              expanded={!!expandedRows[product.id]}
              onToggle={() => toggleRow(product.id)}
              categories={categories}
              clicks={clickCounts?.get(product.id) ?? 0}
              onStatusChange={handleStatusChange}
            />
          )
        })}
      </div>
    </div>
  )
}
