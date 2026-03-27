"use client";

import { useState, useCallback, useEffect } from "react";
import { Settings2, FileSearch, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { syncProducts } from "@/lib/actions/tiendanube-sync";
import { getSyncStatus, type SyncStatus } from "@/lib/actions/sync-status";

export function ProductToolsMenu() {
  const [discrepancyOpen, setDiscrepancyOpen] = useState(false);
  const [resyncOpen, setResyncOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  const progress =
    syncStatus && syncStatus.totalProducts > 0
      ? Math.round(
          (syncStatus.processedProducts / syncStatus.totalProducts) * 100
        )
      : 0;

  const pollStatus = useCallback(async () => {
    const status = await getSyncStatus();
    setSyncStatus(status);
    return status;
  }, []);

  // Polling while syncing
  useEffect(() => {
    if (!isSyncing) return;

    const interval = setInterval(async () => {
      const status = await pollStatus();
      if (status?.status !== "syncing") {
        setIsSyncing(false);
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isSyncing, pollStatus]);

  const handleResync = async () => {
    setIsSyncing(true);
    setSyncStatus(null);

    syncProducts().finally(() => {
      pollStatus();
    });

    await new Promise((r) => setTimeout(r, 500));
    await pollStatus();
  };

  const syncComplete = syncStatus && syncStatus.status !== "syncing";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="sm" />}
        >
          <Settings2 className="mr-1.5 h-4 w-4" />
          Herramientas
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={"w-fit"}>
          <DropdownMenuItem onClick={() => setDiscrepancyOpen(true)}>
            <FileSearch className="mr-2 h-4 w-4" />
            Reporte de discrepancias
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setResyncOpen(true)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Forzar re-sincronizacion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Discrepancy Report Dialog */}
      <Dialog open={discrepancyOpen} onOpenChange={setDiscrepancyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reporte de discrepancias</DialogTitle>
            <DialogDescription>
              Aca vas a poder detectar diferencias entre tu catalogo local y
              Tiendanube.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Proximamente vas a poder revisar y corregir discrepancias por
              producto o en lote.
            </p>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cerrar
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resync Confirmation Dialog */}
      <Dialog open={resyncOpen} onOpenChange={setResyncOpen}>
        <DialogContent showCloseButton={!isSyncing}>
          <DialogHeader>
            <DialogTitle>Forzar re-sincronizacion</DialogTitle>
            <DialogDescription>
              Esta accion es de mantenimiento y no es necesaria para el uso
              normal.
            </DialogDescription>
          </DialogHeader>

          {!isSyncing && !syncComplete && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Esta accion vuelve a consultar Tiendanube e intenta reparar
                diferencias del catalogo.
              </p>
              <p className="text-sm text-muted-foreground">
                Usala solo si detectas que algo no coincide.
              </p>
            </div>
          )}

          {isSyncing && syncStatus && (
            <div className="space-y-3 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sincronizando...</span>
                <span className="font-medium">
                  {syncStatus.processedProducts} de {syncStatus.totalProducts}
                </span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {syncComplete && syncStatus && (
            <div
              className={`rounded-md p-3 text-sm ${
                syncStatus.status === "ok"
                  ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
                  : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
              }`}
            >
              <p className="font-medium">
                {syncStatus.status === "ok"
                  ? "Sincronizacion completada"
                  : "Sincronizacion con errores"}
              </p>
              <ul className="mt-1 space-y-0.5">
                <li>Nuevos: {syncStatus.createdProducts}</li>
                <li>Actualizados: {syncStatus.updatedProducts}</li>
                {syncStatus.failedProducts > 0 && (
                  <li>Fallidos: {syncStatus.failedProducts}</li>
                )}
              </ul>
            </div>
          )}

          <DialogFooter>
            {!isSyncing && !syncComplete && (
              <>
                <DialogClose render={<Button variant="outline" />}>
                  Cancelar
                </DialogClose>
                <Button onClick={handleResync}>Re-sincronizar ahora</Button>
              </>
            )}
            {syncComplete && (
              <DialogClose render={<Button variant="outline" />}>
                Cerrar
              </DialogClose>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
