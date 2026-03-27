import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerUser } from "@/lib/auth/get-server-user";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ConectarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getServerUser();
  const params = await searchParams;

  if (!user) {
    redirect(`/login?next=${params.next ?? "/conectar"}`);
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Conecta tu tienda</CardTitle>
          <CardDescription>
            Vincula tu tienda de Tiendanube para empezar a publicar tus
            productos en TiendaShop.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Al conectar tu tienda, podremos sincronizar tus productos
            automaticamente y mostrarlos a miles de compradores.
          </p>
          <Link
            href="/api/tiendanube/connect"
            className="w-full"
          >
            Conectar con Tiendanube
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
