import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const TIENDANUBE_API_BASE = "https://api.tiendanube.com/v1";
const USER_AGENT = "TiendaShop (support@tiendashop.com)";

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function tiendanubeRequest({
  storeId,
  accessToken,
  endpoint,
  method = "GET",
  body,
}) {
  const url = `${TIENDANUBE_API_BASE}/${storeId}/${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authentication: `bearer ${accessToken}`,
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const responseText = await response.text();
  let parsedBody = null;
  if (responseText) {
    try {
      parsedBody = JSON.parse(responseText);
    } catch {
      parsedBody = responseText;
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    body: parsedBody,
  };
}

async function main() {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const appUrl = getRequiredEnv("NEXT_PUBLIC_APP_URL").replace(/\/+$/, "");
  const webhookUrl = `${appUrl}/api/tiendanube/webhook`;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: stores, error } = await supabase
    .from("stores")
    .select("id, tiendanube_store_id, access_token")
    .is("deleted_at", null)
    .not("access_token", "is", null);

  if (error) {
    throw new Error(`Failed to load stores: ${error.message}`);
  }

  const stats = {
    total: stores.length,
    created: 0,
    alreadyPresent: 0,
    failed: 0,
  };

  console.log("[Backfill] Starting app/uninstalled webhook backfill", {
    totalStores: stats.total,
    webhookUrl,
  });

  for (const store of stores) {
    const tiendanubeStoreId = store.tiendanube_store_id;
    const accessToken = store.access_token;
    if (!tiendanubeStoreId || !accessToken) {
      stats.failed++;
      console.error("[Backfill][ERROR] Missing tiendanube_store_id or access_token", {
        localStoreId: store.id,
      });
      continue;
    }

    const listResult = await tiendanubeRequest({
      storeId: tiendanubeStoreId,
      accessToken,
      endpoint: "webhooks",
    });

    if (!listResult.ok || !Array.isArray(listResult.body)) {
      stats.failed++;
      console.error("[Backfill][ERROR] Failed to list webhooks", {
        localStoreId: store.id,
        tiendanubeStoreId,
        status: listResult.status,
      });
      continue;
    }

    const hasUninstalledWebhook = listResult.body.some(
      (webhook) =>
        webhook?.event === "app/uninstalled" && webhook?.url === webhookUrl
    );

    if (hasUninstalledWebhook) {
      stats.alreadyPresent++;
      continue;
    }

    const createResult = await tiendanubeRequest({
      storeId: tiendanubeStoreId,
      accessToken,
      endpoint: "webhooks",
      method: "POST",
      body: {
        event: "app/uninstalled",
        url: webhookUrl,
      },
    });

    if (!createResult.ok) {
      stats.failed++;
      console.error("[Backfill][ERROR] Failed to create app/uninstalled webhook", {
        localStoreId: store.id,
        tiendanubeStoreId,
        status: createResult.status,
      });
      continue;
    }

    stats.created++;
    console.log("[Backfill] app/uninstalled webhook created", {
      localStoreId: store.id,
      tiendanubeStoreId,
    });
  }

  console.log("[Backfill] Completed", stats);

  if (stats.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[Backfill][FATAL]", err instanceof Error ? err.message : err);
  process.exit(1);
});
