import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type AppUser = Database["public"]["Tables"]["users"]["Row"];

async function getServerUserInternal(): Promise<AppUser | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (error || !data) return null;

  return data;
}

export const getServerUser = cache(getServerUserInternal);