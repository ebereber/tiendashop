"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { syncProducts } from "@/lib/actions/tiendanube-sync";
import { getSyncStatus, type SyncStatus } from "@/lib/actions/sync-status";

interface SyncProgressProps {
  initialStatus: SyncStatus | null;
}

export function SyncProgress({ initialStatus }: SyncProgressProps) {
  const [status, setStatus] = useState<SyncStatus | null>(initialStatus);
  const [isStarting, setIsStarting] = useState(false);

  const isSyncing = status?.status === "syncing";
  const progress =
    status && status.totalProducts > 0
      ? Math.round((status.processedProducts / status.totalProducts) * 100)
      : 0;
  const hasSyncResult =
    !!status &&
    status.status !== "syncing" &&
    (status.totalProducts > 0 ||
      status.processedProducts > 0 ||
      status.createdProducts > 0 ||
      status.updatedProducts > 0 ||
      status.failedProducts > 0 ||
      !!status.errorMessage ||
      !!status.lastSyncedAt);

  const pollStatus = useCallback(async () => {
    const newStatus = await getSyncStatus();
    setStatus(newStatus);
    return newStatus;
  }, []);

  // Polling while syncing
  useEffect(() => {
    if (!isSyncing) return;

    const interval = setInterval(async () => {
      const newStatus = await pollStatus();
      if (newStatus?.status !== "syncing") {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isSyncing, pollStatus]);

  const handleSync = async () => {
    setIsStarting(true);
    try {
      // Start sync in background - it will update DB as it progresses
      syncProducts().finally(() => {
        // Final poll to get completed status
        pollStatus();
      });
      // Wait a moment then start polling
      await new Promise((r) => setTimeout(r, 500));
      await pollStatus();
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sync in progress */}
      {isSyncing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Sincronizando...</span>
            <span className="font-medium">
              {status.processedProducts} de {status.totalProducts} productos
            </span>
          </div>
          <Progress value={progress} />
        </div>
      )}

      {/* Results after sync */}
      {hasSyncResult && status && (
        <div
          className={`rounded-md p-3 text-sm ${
            status.status === "ok"
              ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
              : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
          }`}
        >
          <p className="font-medium">
            {status.status === "ok"
              ? "Sincronizacion completada"
              : "Sincronizacion con errores"}
          </p>
          <ul className="mt-1 space-y-0.5">
            <li>Nuevos: {status.createdProducts}</li>
            <li>Actualizados: {status.updatedProducts}</li>
            {status.failedProducts > 0 && (
              <li>Fallidos: {status.failedProducts}</li>
            )}
          </ul>
          {status.errorMessage && (
            <p className="mt-2 text-xs opacity-80">{status.errorMessage}</p>
          )}
        </div>
      )}

      {/* Sync button - only show when not syncing */}
      {!isSyncing && (
        <Button onClick={handleSync} disabled={isStarting}>
          {isStarting ? "Iniciando..." : "Sincronizar productos"}
        </Button>
      )}
    </div>
  );
}
