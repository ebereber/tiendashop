import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseSignedOAuthState } from "@/lib/tiendanube/oauth-state";
import { createTiendanubeClient } from "@/lib/tiendanube/client";
import { syncStoreProducts } from "@/lib/services/product-sync";

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
    const parsedState = parseSignedOAuthState(state);
    if (!parsedState.valid) {
      throw new Error(parsedState.error);
    }
    userId = parsedState.userId;
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
      })
      .eq("id", existingStore.id);

    if (updateError) {
      console.error("[Tiendanube OAuth] Token update failed:", updateError);
    }

    // Check if store needs initial sync (no products yet)
    const { count: productsCount, error: productsCountError } = await supabaseAdmin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", existingStore.id);

    if (productsCountError) {
      console.error("[Tiendanube OAuth] Product count check failed:", productsCountError);
    } else if ((productsCount ?? 0) === 0) {
      // Execute initial sync
      await syncStoreProducts({
        supabase: supabaseAdmin,
        storeId: existingStore.id,
        tiendanubeStoreId,
        accessToken: tokenData.access_token,
      });
    }

    // Re-register webhooks on reconnect (non-blocking)
    const webhookUrl = `${appUrl}/api/tiendanube/webhook`;
    const client = createTiendanubeClient(tiendanubeStoreId, tokenData.access_token);
    console.log("[Tiendanube OAuth] Registering webhooks", {
      tiendanubeStoreId,
      webhookUrl,
    });
    const webhookResult = await client.registerWebhooks(webhookUrl);
    if (!webhookResult.success) {
      console.error("[Tiendanube OAuth] Webhook re-registration failed:", webhookResult.errors);
    } else {
      console.log("[Tiendanube OAuth] Webhook re-registration completed");
    }

    const webhooksAfterResult = await client.listWebhooks();
    if (webhooksAfterResult.error) {
      console.error("[Tiendanube OAuth] Failed to list webhooks after re-registration:", {
        tiendanubeStoreId,
        error: webhooksAfterResult.error,
      });
    } else {
      console.log("[Tiendanube OAuth] Webhooks after re-registration", {
        tiendanubeStoreId,
        webhooks: (webhooksAfterResult.data ?? []).map((w) => ({
          id: w.id,
          event: w.event,
          url: w.url,
        })),
      });
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
  const { data: newStore, error: storeError } = await supabaseAdmin
    .from("stores")
    .insert({
      organization_id: organization.id,
      tiendanube_store_id: tiendanubeStoreId,
      access_token: tokenData.access_token,
      name: storeName,
      slug: storeSlug,
      domain,
      country: storeData.country || "AR",
      currency: storeData.main_currency || "ARS",
    })
    .select("id")
    .single();

  if (storeError || !newStore) {
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

  // Register webhooks (non-blocking)
  const webhookUrl = `${appUrl}/api/tiendanube/webhook`;
  const client = createTiendanubeClient(tiendanubeStoreId, tokenData.access_token);
  console.log("[Tiendanube OAuth] Registering webhooks", {
    tiendanubeStoreId,
    webhookUrl,
  });
  const webhookResult = await client.registerWebhooks(webhookUrl);
  if (!webhookResult.success) {
    console.error("[Tiendanube OAuth] Webhook registration failed:", webhookResult.errors);
    // Continue anyway - manual sync is fallback
  } else {
    console.log("[Tiendanube OAuth] Webhooks registered successfully");
  }

  const webhooksAfterResult = await client.listWebhooks();
  if (webhooksAfterResult.error) {
    console.error("[Tiendanube OAuth] Failed to list webhooks after registration:", {
      tiendanubeStoreId,
      error: webhooksAfterResult.error,
    });
  } else {
    console.log("[Tiendanube OAuth] Webhooks after registration", {
      tiendanubeStoreId,
      webhooks: (webhooksAfterResult.data ?? []).map((w) => ({
        id: w.id,
        event: w.event,
        url: w.url,
      })),
    });
  }

  // Execute initial product sync
  await syncStoreProducts({
    supabase: supabaseAdmin,
    storeId: newStore.id,
    tiendanubeStoreId,
    accessToken: tokenData.access_token,
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
