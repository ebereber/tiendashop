"use client";

import { useState, useCallback, useEffect } from "react";
import { Settings2, FileSearch, RefreshCw, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
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
import {
  getProductDiscrepancies,
  type DiscrepancyReport,
  type DiscrepancyType,
} from "@/lib/actions/product-discrepancies";

const DISCREPANCY_LABELS: Record<DiscrepancyType, string> = {
  missing_local: "Falta en local",
  missing_remote: "Falta en Tiendanube",
  price_mismatch: "Precio diferente",
  stock_mismatch: "Stock diferente",
  title_mismatch: "Titulo diferente",
};

export function ProductToolsMenu() {
  const [discrepancyOpen, setDiscrepancyOpen] = useState(false);
  const [resyncOpen, setResyncOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  // Discrepancy report state
  const [discrepancyReport, setDiscrepancyReport] = useState<DiscrepancyReport | null>(null);
  const [isLoadingDiscrepancies, setIsLoadingDiscrepancies] = useState(false);
  const [isRepairingAll, setIsRepairingAll] = useState(false);
  const [hasStartedReport, setHasStartedReport] = useState(false);

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

  const fetchDiscrepancies = useCallback(async () => {
    setHasStartedReport(true);
    setIsLoadingDiscrepancies(true);
    setDiscrepancyReport(null);
    try {
      const report = await getProductDiscrepancies();
      setDiscrepancyReport(report);
    } finally {
      setIsLoadingDiscrepancies(false);
    }
  }, []);

  const handleRepairAll = async () => {
    setIsRepairingAll(true);
    try {
      await syncProducts();
      await fetchDiscrepancies();
    } finally {
      setIsRepairingAll(false);
    }
  };

  // Reset state when dialog closes
  useEffect(() => {
    if (!discrepancyOpen) {
      setHasStartedReport(false);
      setDiscrepancyReport(null);
    }
  }, [discrepancyOpen]);

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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reporte de discrepancias</DialogTitle>
            <DialogDescription>
              Diferencias entre tu catalogo local y Tiendanube.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {/* Initial state - before starting */}
            {!hasStartedReport && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Este reporte compara tu catalogo local contra Tiendanube para detectar
                  diferencias en precios, stock, titulos y productos faltantes.
                </p>
                <p className="text-sm text-muted-foreground">
                  El analisis puede tardar unos segundos dependiendo de la cantidad de productos.
                </p>
              </div>
            )}

            {/* Loading state */}
            {isLoadingDiscrepancies && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Analizando catalogo...</p>
              </div>
            )}

            {/* Error state */}
            {hasStartedReport && !isLoadingDiscrepancies && discrepancyReport?.error && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{discrepancyReport.error}</span>
              </div>
            )}

            {/* Empty state */}
            {hasStartedReport &&
              !isLoadingDiscrepancies &&
              discrepancyReport &&
              !discrepancyReport.error &&
              discrepancyReport.discrepancies.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                  <p className="text-sm font-medium">No se detectaron discrepancias</p>
                  <p className="text-xs text-muted-foreground">
                    {discrepancyReport.localCount} productos locales,{" "}
                    {discrepancyReport.remoteCount} en Tiendanube
                  </p>
                </div>
              )}

            {/* Discrepancy list */}
            {hasStartedReport &&
              !isLoadingDiscrepancies &&
              discrepancyReport &&
              !discrepancyReport.error &&
              discrepancyReport.discrepancies.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    {discrepancyReport.discrepancies.length} discrepancia
                    {discrepancyReport.discrepancies.length !== 1 ? "s" : ""} detectada
                    {discrepancyReport.discrepancies.length !== 1 ? "s" : ""}
                  </p>
                  <ul className="max-h-64 space-y-2 overflow-y-auto">
                    {discrepancyReport.discrepancies.map((d, i) => (
                      <li
                        key={`${d.tiendanubeProductId}-${d.type}-${i}`}
                        className="rounded-md border p-2 text-sm"
                      >
                        <p className="font-medium truncate">{d.productTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {DISCREPANCY_LABELS[d.type]}
                          {d.localValue && d.remoteValue && (
                            <span>
                              : {d.localValue} → {d.remoteValue}
                            </span>
                          )}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cerrar
            </DialogClose>
            {/* Start button - before analysis */}
            {!hasStartedReport && (
              <Button onClick={fetchDiscrepancies}>
                Iniciar reporte
              </Button>
            )}
            {/* Repair button - after analysis with discrepancies */}
            {hasStartedReport &&
              !isLoadingDiscrepancies &&
              discrepancyReport &&
              !discrepancyReport.error &&
              discrepancyReport.discrepancies.length > 0 && (
                <Button onClick={handleRepairAll} disabled={isRepairingAll}>
                  {isRepairingAll && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reparar todo
                </Button>
              )}
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
