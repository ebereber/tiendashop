import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "./get-server-user";

export const getCurrentMembership = cache(async () => {
  const user = await getServerUser();
  if (!user) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_members")
    .select("id, role, organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return null;

  return data;
});