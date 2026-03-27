import { getServerUser } from "@/lib/auth/get-server-user";
import { getCurrentMembership } from "@/lib/auth/get-current-membership";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const user = await getServerUser();
  const membership = await getCurrentMembership();
  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, domain, last_synced_at")
    .eq("organization_id", membership!.organization_id)
    .is("deleted_at", null)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Bienvenido{user?.full_name ? `, ${user.full_name}` : ""}
        </h1>
        <p className="text-muted-foreground">Este es tu panel de control.</p>
      </div>

      {store && (
        <Card>
          <CardHeader>
            <CardTitle>Tu tienda</CardTitle>
            <CardDescription>
              Informacion de tu tienda conectada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
