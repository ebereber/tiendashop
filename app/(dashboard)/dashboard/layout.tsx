import { requireUser } from "@/lib/auth/require-user";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header userName={user.full_name} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}