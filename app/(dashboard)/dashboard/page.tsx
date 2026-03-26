import { getServerUser } from "@/lib/auth/get-server-user";

export default async function DashboardPage() {
  const user = await getServerUser();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">
        Bienvenido{user?.full_name ? `, ${user.full_name}` : ""}
      </h1>
      <p className="text-muted-foreground">
        Este es tu panel de control. Proximamente podras ver el resumen de tu tienda aqui.
      </p>
    </div>
  );
}
