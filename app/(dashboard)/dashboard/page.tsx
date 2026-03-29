import { Suspense } from "react";

import { getServerUser } from "@/lib/auth/get-server-user";
import { getCurrentStoreId, getDashboardMetrics } from "@/lib/services/metrics";
import { MetricsCards, MetricsSkeleton } from "@/components/dashboard/metrics-cards";
import { TopProducts, TopProductsSkeleton } from "@/components/dashboard/top-products";

export default async function DashboardPage() {
  const [user, storeId] = await Promise.all([
    getServerUser(),
    getCurrentStoreId(),
  ]);
  const now = new Date();
  const since7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const since30days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const metrics = storeId
    ? await getDashboardMetrics(storeId, { since7days, since30days })
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Bienvenido{user?.full_name ? `, ${user.full_name}` : ""}
        </h1>
        <p className="text-muted-foreground">Este es tu panel de control.</p>
      </div>

      {storeId && metrics ? (
        <>
          <Suspense fallback={<MetricsSkeleton />}>
            <MetricsCards metrics={metrics} />
          </Suspense>

          <Suspense fallback={<TopProductsSkeleton />}>
            <TopProducts topProducts={metrics.topProducts} />
          </Suspense>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Conecta tu tienda para ver las metricas.
        </p>
      )}
    </div>
  );
}
