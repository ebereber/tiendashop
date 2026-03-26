"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";
import { SidebarMobile } from "./sidebar-mobile";

interface HeaderProps {
  userName: string | null;
}

export function Header({ userName }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-2 lg:hidden">
        <SidebarMobile />
        <span className="font-semibold">TiendaShop</span>
      </div>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {userName ?? "Usuario"}
        </span>
        <form action={signOut}>
          <Button variant="outline" size="sm" type="submit">
            Cerrar sesion
          </Button>
        </form>
      </div>
    </header>
  );
}
