import { Card, CardContent } from "@/components/ui/card"
import { MousePointerClick } from "lucide-react"
import type { DashboardMetrics } from "@/lib/services/metrics"

interface MetricsCardsProps {
  metrics: DashboardMetrics
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  if (metrics.error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            No se pudieron cargar las metricas.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <MetricCard
        label="Total histórico"
        value={metrics.totalClicks}
        description="Desde siempre"
      />
      <MetricCard
        label="Ultimos 7 dias"
        value={metrics.clicks7days}
        description="Clicks a tus productos"
      />
      <MetricCard
        label="Ultimos 30 dias"
        value={metrics.clicks30days}
        description="Clicks a tus productos"
      />
    </div>
  )
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string
  value: number
  description: string
}) {
  return (
    <Card>
      <CardContent className="">
        <div className="flex items-center gap-2">
          <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
        </div>
        <p className="mt-2 text-3xl font-bold tabular-nums">
          {value.toLocaleString("es-AR")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

export function MetricsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-2 h-9 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-1 h-3 w-16 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
