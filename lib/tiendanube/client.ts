import type { TiendanubeProduct } from "./types";

const TIENDANUBE_API_BASE = "https://api.tiendanube.com/v1";
const USER_AGENT = "TiendaShop (support@tiendashop.com)";
const PAGE_SIZE = 200;

interface TiendanubeClientConfig {
  storeId: string;
  accessToken: string;
}

interface TiendanubeRequestOptions {
  endpoint: string;
  params?: Record<string, string>;
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

  private async request<T>(
    options: TiendanubeRequestOptions
  ): Promise<TiendanubeResponse<T>> {
    const url = new URL(
      `${TIENDANUBE_API_BASE}/${this.storeId}/${options.endpoint}`
    );

    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Authentication: `bearer ${this.accessToken}`,
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
      });

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
}

export function createTiendanubeClient(
  storeId: string,
  accessToken: string
): TiendanubeClient {
  return new TiendanubeClient({ storeId, accessToken });
}
