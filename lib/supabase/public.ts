import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Anonymous Supabase client for public queries.
 * Uses anon key without session - RLS policies for public reads apply correctly.
 * Use this for all public-facing services (search, categories, stores, etc.)
 */
export function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
