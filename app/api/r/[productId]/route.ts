import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const SESSION_COOKIE_NAME = "session_id";
const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const searchParams = request.nextUrl.searchParams;

  const query = searchParams.get("q") || null;
  const from = searchParams.get("from") || null;
  const pos = searchParams.get("pos");
  const position = pos ? parseInt(pos, 10) : null;

  const supabase = await createClient();

  // Get or create session_id
  const cookieStore = await cookies();
  let sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    sessionId = crypto.randomUUID();
  }

  // Get product and store info
  const { data: product } = await supabase
    .from("products")
    .select(
      `
      id,
      store_id,
      merchant_status,
      system_status,
      stores!inner (
        deleted_at,
        sync_status,
        domain,
        slug
      )
    `
    )
    .eq("id", productId)
    .eq("merchant_status", "active")
    .eq("system_status", "visible")
    .is("stores.deleted_at", null)
    .neq("stores.sync_status", "disabled")
    .maybeSingle();

  if (!product) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const store = product.stores as unknown as {
    domain: string | null;
    slug: string;
  };

  // Build target URL - use domain if available, otherwise fallback to Tiendanube URL
  const targetUrl = store.domain
    ? `https://${store.domain}`
    : `https://${store.slug}.mitiendanube.com`;

  // Get user_id if logged in (optional)
  let userId: string | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // Ignore auth errors - user might not be logged in
  }

  // Log redirect event (fire and forget - don't block redirect)
  const sourceType = mapSourceType(from);

  supabase
    .from("redirect_events")
    .insert({
      product_id: product.id,
      store_id: product.store_id,
      user_id: userId,
      session_id: sessionId,
      source_type: sourceType,
      query_origin: query,
      result_position: position,
    })
    .then(({ error }) => {
      if (error) {
        console.error("[Redirect] Failed to log event:", error);
      }
    });

  // Create response with redirect
  const response = NextResponse.redirect(targetUrl, 302);

  // Set session cookie if it was newly created
  if (!cookieStore.get(SESSION_COOKIE_NAME)?.value) {
    response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });
  }

  return response;
}

function mapSourceType(
  from: string | null
): "home" | "search" | "category" | "brand" | "store" | "saved" | null {
  switch (from) {
    case "home":
      return "home";
    case "search":
      return "search";
    case "category":
      return "category";
    case "brand":
      return "brand";
    case "store":
      return "store";
    case "saved":
      return "saved";
    default:
      return null;
  }
}
