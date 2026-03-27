import { getCurrentMembership } from "@/lib/auth/get-current-membership";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ConfiguracionPage() {
  const membership = await getCurrentMembership();
  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, domain, last_synced_at, deleted_at")
    .eq("organization_id", membership!.organization_id)
    .maybeSingle();

  const isActive = store && !store.deleted_at;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuracion</h1>
        <p className="text-muted-foreground">
          Ajustes de tu cuenta y tienda conectada.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tienda conectada</CardTitle>
              <CardDescription>
                Informacion de tu tienda de Tiendanube
              </CardDescription>
            </div>
            {store && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isActive
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                }`}
              >
                {isActive ? "Activa" : "Desconectada"}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!store ? (
            <p className="text-sm text-muted-foreground">
              No hay tienda conectada.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-1">
                <p className="text-sm font-medium">Nombre</p>
                <p className="text-sm text-muted-foreground">{store.name}</p>
              </div>
              {store.domain && (
                <div className="grid gap-1">
                  <p className="text-sm font-medium">Dominio</p>
                  <p className="text-sm text-muted-foreground">{store.domain}</p>
                </div>
              )}
              {store.last_synced_at && (
                <div className="grid gap-1">
                  <p className="text-sm font-medium">Ultima sincronizacion</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(store.last_synced_at).toLocaleString("es-AR")}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
