import type {
  TiendanubeProduct,
  TiendanubeWebhook,
  TiendanubeWebhookEvent,
} from "./types";
import { sleep } from "./helpers";

const TIENDANUBE_API_BASE = "https://api.tiendanube.com/v1";
const USER_AGENT = "TiendaShop (support@tiendashop.com)";
const PAGE_SIZE = 200;

// Retry config for rate limiting
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

interface TiendanubeClientConfig {
  storeId: string;
  accessToken: string;
}

interface TiendanubeRequestOptions {
  endpoint: string;
  method?: "GET" | "POST" | "DELETE";
  params?: Record<string, string>;
  body?: unknown;
}

interface TiendanubeResponse<T> {
  data: T | null;
  error: string | null;
}

export class TiendanubeClient {
  private storeId: string;
  private accessToken: string;

  constructor(config: TiendanubeClientConfig) {
    this.storeId = config.storeId;
    this.accessToken = config.accessToken;
  }

  private buildUrl(endpoint: string, params?: Record<string, string>): URL {
    const url = new URL(`${TIENDANUBE_API_BASE}/${this.storeId}/${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    return url;
  }

  private buildHeaders(hasBody: boolean = false): Record<string, string> {
    const headers: Record<string, string> = {
      Authentication: `bearer ${this.accessToken}`,
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    };

    if (hasBody) {
      headers["Content-Type"] = "application/json";
    }

    return headers;
  }

  private async request<T>(
    options: TiendanubeRequestOptions,
    attempt: number = 0
  ): Promise<TiendanubeResponse<T>> {
    const url = this.buildUrl(options.endpoint, options.params);
    const headers = this.buildHeaders(Boolean(options.body));

    try {
      const response = await fetch(url.toString(), {
        method: options.method ?? "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      // Handle rate limiting with retry
      if (response.status === 429 && attempt < MAX_RETRIES) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `[Tiendanube] Rate limited, retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`
        );
        await sleep(delay);
        return this.request<T>(options, attempt + 1);
      }

      const responseText = await response.text();

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.description || errorMessage;
        } catch {
          errorMessage = responseText || errorMessage;
        }
        return { data: null, error: errorMessage };
      }

      const data = JSON.parse(responseText) as T;
      return { data, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error de conexion";
      return { data: null, error: message };
    }
  }

  async getAllProducts(): Promise<TiendanubeResponse<TiendanubeProduct[]>> {
    const allProducts: TiendanubeProduct[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await this.request<TiendanubeProduct[]>({
        endpoint: "products",
        params: {
          per_page: String(PAGE_SIZE),
          page: String(page),
        },
      });

      if (result.error) {
        return { data: null, error: result.error };
      }

      if (!result.data || result.data.length === 0) {
        hasMore = false;
      } else {
        allProducts.push(...result.data);
        if (result.data.length < PAGE_SIZE) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }

    return { data: allProducts, error: null };
  }

  async getProduct(
    productId: number | string
  ): Promise<TiendanubeResponse<TiendanubeProduct>> {
    return this.request<TiendanubeProduct>({
      endpoint: `products/${productId}`,
    });
  }

  async listWebhooks(): Promise<TiendanubeResponse<TiendanubeWebhook[]>> {
    return this.request<TiendanubeWebhook[]>({
      endpoint: "webhooks",
    });
  }

  async registerWebhooks(
    webhookUrl: string
  ): Promise<{ success: boolean; errors: string[] }> {
    const events: TiendanubeWebhookEvent[] = [
      "product/created",
      "product/updated",
      "product/deleted",
    ];

    // Get existing webhooks to avoid duplicates
    const existingResult = await this.listWebhooks();

    const existingWebhooks = existingResult.data ?? [];
    const existingEvents = new Set(
      existingWebhooks
        .filter((w) => w.url === webhookUrl)
        .map((w) => w.event)
    );

    const errors: string[] = [];

    for (const event of events) {
      // Skip if already registered for this URL
      if (existingEvents.has(event)) {
        continue;
      }

      const endpoint = this.buildUrl("webhooks").toString();
      const body = { event, url: webhookUrl };

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: this.buildHeaders(true),
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          console.error("[Tiendanube Webhooks][ERROR] create failed", {
            storeId: this.storeId,
            event,
            webhookUrl,
            status: response.status,
          });
          errors.push(`${event}: HTTP ${response.status}`);
          continue;
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error de conexion webhook";
        console.error("[Tiendanube Webhooks][ERROR] create request error", {
          storeId: this.storeId,
          event,
          webhookUrl,
          error: message,
        });
        errors.push(`${event}: ${message}`);
      }
    }

    return { success: errors.length === 0, errors };
  }
}

export function createTiendanubeClient(
  storeId: string,
  accessToken: string
): TiendanubeClient {
  return new TiendanubeClient({ storeId, accessToken });
}
