import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const state = Buffer.from(JSON.stringify({ userId: user.id })).toString(
    "base64url"
  );

  const authUrl = new URL(
    `https://www.tiendanube.com/apps/${clientId}/authorize`
  );
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
