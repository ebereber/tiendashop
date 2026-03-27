"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchInputProps {
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchInput({
  defaultValue = "",
  placeholder = "Buscar productos...",
  autoFocus = false,
}: SearchInputProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/buscar?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/buscar");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xl gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="h-10 pl-9"
        />
      </div>
      <Button type="submit" size="default">
        Buscar
      </Button>
    </form>
  );
}
