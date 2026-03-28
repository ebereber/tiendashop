"use client"

import {
  ArrowLeft,
  Check,
  ChevronRight,
  ChevronsUpDown,
  Pencil,
  RotateCcw,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { updateProductCategory } from "@/lib/actions/products"
import type { CategoryWithParent } from "@/lib/services/categories"
import { cn } from "@/lib/utils"

interface CategorySelectorProps {
  productId: string
  currentCategoryId: string | null
  autoCategoryId: string | null
  isManual: boolean
  categories: CategoryWithParent[]
}

interface BreadcrumbItem {
  id: string
  name: string
}

export function CategorySelector({
  productId,
  currentCategoryId,
  autoCategoryId,
  isManual,
  categories,
}: CategorySelectorProps) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(currentCategoryId)
  const [isManualState, setIsManualState] = useState(isManual)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([])
  const [currentParentId, setCurrentParentId] = useState<string | null>(null)

  useEffect(() => {
    setSelectedId(currentCategoryId)
    setIsManualState(isManual)
  }, [currentCategoryId, isManual])

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  )

  const categoriesWithChildren = useMemo(() => {
    const set = new Set<string>()
    categories.forEach((c) => {
      if (c.parentId) set.add(c.parentId)
    })
    return set
  }, [categories])

  const visibleCategories = useMemo(() => {
    if (searchQuery.trim()) {
      return categories.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    return categories.filter((c) =>
      currentParentId ? c.parentId === currentParentId : !c.parentId
    )
  }, [categories, currentParentId, searchQuery])

  const currentLabel = useMemo(() => {
    if (!selectedId) return "Sin categoría"
    const cat = categoryById.get(selectedId)
    if (!cat) return "Sin categoría"
    if (cat.parentId) {
      const parent = categoryById.get(cat.parentId)
      return parent ? `${parent.name} / ${cat.name}` : cat.name
    }
    return cat.name
  }, [selectedId, categoryById])

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen)
    if (!newOpen) {
      setSearchQuery("")
      setBreadcrumb([])
      setCurrentParentId(null)
    }
  }

  function navigateInto(category: CategoryWithParent) {
    if (categoriesWithChildren.has(category.id)) {
      setBreadcrumb((prev) => [
        ...prev,
        { id: category.id, name: category.name },
      ])
      setCurrentParentId(category.id)
      setSearchQuery("")
    } else {
      handleSelect(category.id)
    }
  }

  function navigateBack() {
    const newBreadcrumb = breadcrumb.slice(0, -1)
    setBreadcrumb(newBreadcrumb)
    setCurrentParentId(newBreadcrumb.at(-1)?.id ?? null)
    setSearchQuery("")
  }

  async function handleSelect(categoryId: string) {
    if (categoryId === selectedId) {
      setOpen(false)
      return
    }

    setOpen(false)
    setSearchQuery("")
    setBreadcrumb([])
    setCurrentParentId(null)

    const previousId = selectedId
    const previousManual = isManualState

    setSelectedId(categoryId)
    setIsManualState(true)
    setError(null)
    setIsPending(true)

    const result = await updateProductCategory(productId, categoryId)
    setIsPending(false)

    if (result.error) {
      setSelectedId(previousId)
      setIsManualState(previousManual)
      setError(result.error)
    }
  }

  async function handleRestore() {
    const previousId = selectedId
    const previousManual = isManualState

    setSelectedId(autoCategoryId)
    setIsManualState(false)
    setError(null)
    setIsPending(true)

    const result = await updateProductCategory(productId, null)
    setIsPending(false)

    if (result.error) {
      setSelectedId(previousId)
      setIsManualState(previousManual)
      setError(result.error)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              disabled={isPending}
              className={cn(
                "h-auto px-2 py-1 text-xs font-normal",
                isManualState && "font-medium"
              )}
            >
              <span className="max-w-[8rem] truncate">{currentLabel}</span>
              {isManualState ? (
                <Pencil className="h-3 w-3 shrink-0 text-blue-500" />
              ) : (
                <ChevronsUpDown className="h-3 w-3 shrink-0 text-muted-foreground" />
              )}
            </Button>
          }
        />

        <PopoverContent className="w-56 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar categoría..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {/* Navegación drill-down — solo cuando no hay búsqueda */}
              {breadcrumb.length > 0 && !searchQuery && (
                <>
                  <CommandGroup>
                    <CommandItem onSelect={navigateBack}>
                      <ArrowLeft className="mr-2 h-3.5 w-3.5" />
                      Volver
                    </CommandItem>
                  </CommandGroup>
                  {/* Categoría padre — seleccionable */}
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => handleSelect(currentParentId!)}
                      className="font-medium"
                    >
                      {breadcrumb.at(-1)?.name}
                      <Check
                        className={cn(
                          "mr-2 h-3.5 w-3.5 shrink-0",
                          selectedId === currentParentId
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              <CommandEmpty>No se encontraron categorías.</CommandEmpty>

              {visibleCategories.length > 0 && (
                <CommandGroup
                  heading={
                    breadcrumb.length > 0
                      ? "Subcategorías"
                      : searchQuery
                        ? "Resultados"
                        : undefined
                  }
                >
                  {visibleCategories.map((category) => (
                    <CommandItem
                      key={category.id}
                      value={category.id}
                      onSelect={() => navigateInto(category)}
                    >
                      {/* <Check
                      className={cn(
                        "mr-2 h-3.5 w-3.5 shrink-0",
                        selectedId === category.id ? "opacity-100" : "opacity-0"
                      )}
                    /> */}
                      <span className="flex-1">{category.name}</span>

                      {selectedId === category.id && (
                        <Check className="ml-1 h-3.5 w-3.5 shrink-0 text-primary" />
                      )}
                      {categoriesWithChildren.has(category.id) && (
                        <ChevronRight className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {isManualState && (
        <button
          type="button"
          onClick={handleRestore}
          disabled={isPending}
          title="Restaurar categoría sugerida"
          className={cn(
            "inline-flex items-center rounded p-1 text-muted-foreground",
            "hover:bg-muted/80 hover:text-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      )}

      {error && <span className="text-[10px] text-destructive">{error}</span>}
    </div>
  )
}
