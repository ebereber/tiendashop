"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

interface CategoryNavItem {
  slug: string;
  name: string;
  path: string;
}

interface CategoryNavProps {
  categories: CategoryNavItem[];
  activeSlug?: string;
  basePath?: string;
}

export function CategoryNav({
  categories,
  activeSlug,
  basePath = "/categoria",
}: CategoryNavProps) {
  const normalizedBasePath = basePath.endsWith("/")
    ? basePath.slice(0, -1) || "/"
    : basePath;

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      {categories.map((category) => {
        const pathSegment = category.path.replace(/^\/+/, "");
        const isActive =
          activeSlug === category.path || activeSlug === category.slug;

        const href = isActive
          ? normalizedBasePath
          : `${normalizedBasePath}/${pathSegment}`;

        return (
          <Link
            key={category.path}
            href={href}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-muted"
            )}
          >
            {category.name}
          </Link>
        );
      })}
    </div>
  );
}
