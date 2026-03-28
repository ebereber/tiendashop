"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface CategoryRowProps {
  categories: { slug: string; name: string }[];
  activeCategory?: string;
}

export function CategoryRow({ categories, activeCategory }: CategoryRowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleCategoryClick(slug: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (activeCategory === slug) {
      // Toggle off - remove category
      params.delete("category");
    } else {
      params.set("category", slug);
    }

    // Reset page when changing category
    params.delete("page");

    const query = params.toString();
    router.push(query ? `?${query}` : window.location.pathname);
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      {categories.map((category) => (
        <button
          key={category.slug}
          type="button"
          onClick={() => handleCategoryClick(category.slug)}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            activeCategory === category.slug
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-foreground hover:bg-muted"
          )}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
