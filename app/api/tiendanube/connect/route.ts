import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSignedOAuthState } from "@/lib/tiendanube/oauth-state";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/login?next=/conectar", process.env.NEXT_PUBLIC_APP_URL!)
    );
  }

  const clientId = process.env.TIENDANUBE_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/tiendanube/callback`;

  let state: string;
  try {
    state = createSignedOAuthState(user.id);
  } catch (err) {
    console.error("[Tiendanube OAuth] Failed to create signed state:", err);
    return NextResponse.redirect(
      new URL("/conectar?error=oauth_state", process.env.NEXT_PUBLIC_APP_URL!)
    );
  }

  const authUrl = new URL(
    `https://www.tiendanube.com/apps/${clientId}/authorize`
  );
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
