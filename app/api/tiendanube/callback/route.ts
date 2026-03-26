import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Tiendanube API response types
interface TiendanubeTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  user_id: number;
}

interface TiendanubeTokenError {
  error: string;
  error_description?: string;
}

interface TiendanubeStoreResponse {
  id: number;
  name: Record<string, string>;
  original_domain: string;
  domains: string[];
  main_currency: string;
  currencies: string[];
  country: string;
  languages: Record<string, string>;
  main_language: string;
  url_with_protocol: string;
  email: string;
  logo: { src: string } | null;
  contact_email: string;
  business_id: string | null;
  business_name: string | null;
  business_address: string | null;
  plan_name: string;
  type: string;
}

interface TiendanubeApiError {
  code: number;
  message: string;
  description: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  // Handle OAuth denial
  if (errorParam) {
    console.error("[Tiendanube OAuth] User denied access:", errorParam);
    return NextResponse.redirect(`${appUrl}/conectar?error=access_denied`);
  }

  if (!code || !state) {
    console.error("[Tiendanube OAuth] Missing code or state");
    return NextResponse.redirect(`${appUrl}/conectar?error=missing_params`);
  }

  // Decode and validate state
  let userId: string;
  try {
    const decoded = JSON.parse(
      Buffer.from(state, "base64url").toString("utf-8")
    );
    userId = decoded.userId;
    if (!userId) throw new Error("Missing userId in state");
  } catch (err) {
    console.error("[Tiendanube OAuth] Invalid state:", err);
    return NextResponse.redirect(`${appUrl}/conectar?error=invalid_state`);
  }

  // Verify user exists
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    console.error("[Tiendanube OAuth] User not found:", userId);
    return NextResponse.redirect(`${appUrl}/conectar?error=user_not_found`);
  }

  // Exchange code for access token
  let tokenData: TiendanubeTokenResponse;
  try {
    const tokenResponse = await fetch(
      "https://www.tiendanube.com/apps/authorize/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          client_id: process.env.TIENDANUBE_CLIENT_ID!,
          client_secret: process.env.TIENDANUBE_CLIENT_SECRET!,
          grant_type: "authorization_code",
          code,
        }),
      }
    );

    const responseText = await tokenResponse.text();

    if (!tokenResponse.ok) {
      let errorInfo: TiendanubeTokenError | null = null;
      try {
        errorInfo = JSON.parse(responseText);
      } catch {
        // Response is not JSON
      }
      console.error("[Tiendanube OAuth] Token exchange failed:", {
        status: tokenResponse.status,
        error: errorInfo?.error || responseText,
        description: errorInfo?.error_description,
      });
      return NextResponse.redirect(`${appUrl}/conectar?error=token_exchange`);
    }

    tokenData = JSON.parse(responseText);
  } catch (err) {
    console.error("[Tiendanube OAuth] Token request error:", err);
    return NextResponse.redirect(`${appUrl}/conectar?error=token_exchange`);
  }

  const tiendanubeStoreId = String(tokenData.user_id);

  // Fetch store info from Tiendanube API
  let storeData: TiendanubeStoreResponse;
  try {
    const storeResponse = await fetch(
      `https://api.tiendanube.com/v1/${tiendanubeStoreId}/store`,
      {
        headers: {
          Authentication: `bearer ${tokenData.access_token}`,
          "User-Agent": "TiendaShop (support@tiendashop.com)",
          Accept: "application/json",
        },
      }
    );

    const responseText = await storeResponse.text();

    if (!storeResponse.ok) {
      let errorInfo: TiendanubeApiError | null = null;
      try {
        errorInfo = JSON.parse(responseText);
      } catch {
        // Response is not JSON
      }
      console.error("[Tiendanube OAuth] Store fetch failed:", {
        status: storeResponse.status,
        storeId: tiendanubeStoreId,
        error: errorInfo?.message || responseText,
      });
      return NextResponse.redirect(`${appUrl}/conectar?error=store_fetch`);
    }

    storeData = JSON.parse(responseText);
  } catch (err) {
    console.error("[Tiendanube OAuth] Store request error:", err);
    return NextResponse.redirect(`${appUrl}/conectar?error=store_fetch`);
  }

  // Check if store already exists
  const { data: existingStore } = await supabaseAdmin
    .from("stores")
    .select("id, organization_id")
    .eq("tiendanube_store_id", tiendanubeStoreId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingStore) {
    // Check if user is already a member
    const { data: existingMember } = await supabaseAdmin
      .from("organization_members")
      .select("id")
      .eq("organization_id", existingStore.organization_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingMember) {
      console.error("[Tiendanube OAuth] Store already taken:", {
        storeId: tiendanubeStoreId,
        userId,
      });
      return NextResponse.redirect(`${appUrl}/conectar?error=store_taken`);
    }

    // Update access token for existing store
    const { error: updateError } = await supabaseAdmin
      .from("stores")
      .update({
        access_token: tokenData.access_token,
        sync_status: "ok",
        sync_error_message: null,
      })
      .eq("id", existingStore.id);

    if (updateError) {
      console.error("[Tiendanube OAuth] Token update failed:", updateError);
    }

    return NextResponse.redirect(`${appUrl}/dashboard`);
  }

  // Extract store name (prefer Spanish, fallback to main language or first available)
  const storeName =
    storeData.name?.es ||
    storeData.name?.[storeData.main_language] ||
    Object.values(storeData.name || {})[0] ||
    `Tienda ${tiendanubeStoreId}`;

  // Extract domain safely
  let domain: string | null = null;
  if (storeData.original_domain) {
    domain = storeData.original_domain;
  } else if (storeData.url_with_protocol) {
    try {
      domain = new URL(storeData.url_with_protocol).hostname;
    } catch {
      // Invalid URL, leave domain as null
    }
  }

  // Create organization
  const orgSlug = generateSlug(storeName);
  const { data: organization, error: orgError } = await supabaseAdmin
    .from("organizations")
    .insert({
      name: storeName,
      slug: orgSlug,
    })
    .select("id")
    .single();

  if (orgError || !organization) {
    console.error("[Tiendanube OAuth] Org creation failed:", orgError);
    return NextResponse.redirect(`${appUrl}/conectar?error=org_creation`);
  }

  // Create membership
  const { error: memberError } = await supabaseAdmin
    .from("organization_members")
    .insert({
      organization_id: organization.id,
      user_id: userId,
      role: "owner",
      accepted_at: new Date().toISOString(),
    });

  if (memberError) {
    console.error("[Tiendanube OAuth] Member creation failed:", memberError);
    // Cleanup: delete organization
    await supabaseAdmin.from("organizations").delete().eq("id", organization.id);
    return NextResponse.redirect(`${appUrl}/conectar?error=member_creation`);
  }

  // Create store
  const storeSlug = generateSlug(storeName);
  const { error: storeError } = await supabaseAdmin.from("stores").insert({
    organization_id: organization.id,
    tiendanube_store_id: tiendanubeStoreId,
    access_token: tokenData.access_token,
    name: storeName,
    slug: storeSlug,
    domain,
    country: storeData.country || "AR",
    currency: storeData.main_currency || "ARS",
  });

  if (storeError) {
    console.error("[Tiendanube OAuth] Store creation failed:", storeError);
    // Cleanup: delete membership and organization
    await supabaseAdmin
      .from("organization_members")
      .delete()
      .eq("organization_id", organization.id);
    await supabaseAdmin.from("organizations").delete().eq("id", organization.id);
    return NextResponse.redirect(`${appUrl}/conectar?error=store_creation`);
  }

  // Update user role to owner
  const { error: roleError } = await supabaseAdmin
    .from("users")
    .update({ role: "owner" })
    .eq("id", userId);

  if (roleError) {
    console.error("[Tiendanube OAuth] Role update failed:", roleError);
    // Non-critical, continue anyway
  }

  console.log("[Tiendanube OAuth] Success:", {
    userId,
    storeId: tiendanubeStoreId,
    storeName,
    organizationId: organization.id,
  });

  return NextResponse.redirect(`${appUrl}/dashboard`);
}

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}
