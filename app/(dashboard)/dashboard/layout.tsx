import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getCurrentMembership } from "@/lib/auth/get-current-membership";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/");
  }

  // Check for active store
  const supabase = await createClient();
  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("organization_id", membership.organization_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!store) {
    redirect("/");
  }

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