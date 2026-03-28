"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type SortOption = "relevance" | "newest" | "price_asc" | "price_desc";

interface FilterSheetProps {
  hasQuery?: boolean;
}

const SORT_OPTIONS: { value: SortOption; label: string; requiresQuery?: boolean }[] = [
  { value: "newest", label: "Mas recientes" },
  { value: "price_asc", label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
  { value: "relevance", label: "Mas relevantes", requiresQuery: true },
];

export function FilterSheet({ hasQuery = false }: FilterSheetProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize from URL params
  const initialSort = (searchParams.get("sort") as SortOption) || "newest";
  const initialMinPrice = searchParams.get("minPrice") || "";
  const initialMaxPrice = searchParams.get("maxPrice") || "";

  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<SortOption>(initialSort);
  const [minPrice, setMinPrice] = useState(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);

  // Reset local state when opening
  function handleOpenChange(newOpen: boolean) {
    if (newOpen) {
      setSort((searchParams.get("sort") as SortOption) || "newest");
      setMinPrice(searchParams.get("minPrice") || "");
      setMaxPrice(searchParams.get("maxPrice") || "");
    }
    setOpen(newOpen);
  }

  function handleApply() {
    const params = new URLSearchParams(searchParams.toString());

    // Sort
    if (sort && sort !== "newest") {
      // Don't set relevance if no query
      if (sort === "relevance" && !hasQuery) {
        params.delete("sort");
      } else {
        params.set("sort", sort);
      }
    } else {
      params.delete("sort");
    }

    // Price
    if (minPrice && !isNaN(Number(minPrice))) {
      params.set("minPrice", minPrice);
    } else {
      params.delete("minPrice");
    }

    if (maxPrice && !isNaN(Number(maxPrice))) {
      params.set("maxPrice", maxPrice);
    } else {
      params.delete("maxPrice");
    }

    // Reset page
    params.delete("page");

    const query = params.toString();
    router.push(query ? `?${query}` : window.location.pathname);
    setOpen(false);
  }

  function handleClear() {
    const params = new URLSearchParams(searchParams.toString());

    // Only clear filter params, preserve q and category
    params.delete("minPrice");
    params.delete("maxPrice");
    params.delete("sort");
    params.delete("page");

    const query = params.toString();
    router.push(query ? `?${query}` : window.location.pathname);
    setOpen(false);
  }

  const hasActiveFilters =
    searchParams.has("minPrice") ||
    searchParams.has("maxPrice") ||
    (searchParams.has("sort") && searchParams.get("sort") !== "newest");

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm">
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                !
              </span>
            )}
          </Button>
        }
      />

      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
          {/* Sort */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Ordenar por</h3>
            <div className="flex flex-col gap-2">
              {SORT_OPTIONS.map((option) => {
                // Hide relevance if no query
                if (option.requiresQuery && !hasQuery) {
                  return null;
                }

                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                      sort === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <input
                      type="radio"
                      name="sort"
                      value={option.value}
                      checked={sort === option.value}
                      onChange={(e) => setSort(e.target.value as SortOption)}
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-full border",
                        sort === option.value
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/50"
                      )}
                    >
                      {sort === option.value && (
                        <span className="h-2 w-2 rounded-full bg-primary-foreground" />
                      )}
                    </span>
                    {option.label}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Price range */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Rango de precio</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="sr-only" htmlFor="minPrice">
                  Precio minimo
                </label>
                <Input
                  id="minPrice"
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  min={0}
                />
              </div>
              <span className="text-muted-foreground">-</span>
              <div className="flex-1">
                <label className="sr-only" htmlFor="maxPrice">
                  Precio maximo
                </label>
                <Input
                  id="maxPrice"
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  min={0}
                />
              </div>
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={handleClear}>
            Limpiar filtros
          </Button>
          <SheetClose render={<Button onClick={handleApply}>Aplicar</Button>} />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
