// Tiendanube API response types

export interface TiendanubeProduct {
  id: number;
  name: Record<string, string>;
  description: Record<string, string>;
  handle: Record<string, string>;
  brand: string | null;
  published: boolean;
  free_shipping: boolean;
  requires_shipping: boolean;
  canonical_url: string;
  video_url: string | null;
  seo_title: Record<string, string>;
  seo_description: Record<string, string>;
  attributes: TiendanubeAttribute[];
  tags: string;
  created_at: string;
  updated_at: string;
  variants: TiendanubeVariant[];
  images: TiendanubeImage[];
  categories: TiendanubeCategory[];
}

export interface TiendanubeVariant {
  id: number;
  image_id: number | null;
  product_id: number;
  position: number;
  price: string;
  compare_at_price: string | null;
  promotional_price: string | null;
  stock_management: boolean;
  stock: number | null;
  sku: string | null;
  barcode: string | null;
  weight: string | null;
  width: string | null;
  height: string | null;
  depth: string | null;
  values: TiendanubeVariantValue[];
  created_at: string;
  updated_at: string;
}

export interface TiendanubeVariantValue {
  en?: string;
  es?: string;
  pt?: string;
  [key: string]: string | undefined;
}

export interface TiendanubeImage {
  id: number;
  product_id: number;
  src: string;
  position: number;
  alt: string[];
  created_at: string;
  updated_at: string;
}

export interface TiendanubeAttribute {
  en?: string;
  es?: string;
  pt?: string;
  [key: string]: string | undefined;
}

export interface TiendanubeCategory {
  id: number;
  name: Record<string, string>;
  description: Record<string, string>;
  handle: Record<string, string>;
  parent: number | null;
  subcategories: number[];
  created_at: string;
  updated_at: string;
}

export interface TiendanubePaginatedResponse<T> {
  data: T[];
  headers: {
    link?: string;
    "x-total-count"?: string;
  };
}

// Webhook types
export type TiendanubeWebhookEvent =
  | "product/created"
  | "product/updated"
  | "product/deleted"
  | "app/uninstalled";

export interface TiendanubeWebhook {
  id: number;
  event: TiendanubeWebhookEvent;
  url: string;
  created_at: string;
  updated_at: string;
}

export interface TiendanubeWebhookPayload {
  store_id: number;
  event: TiendanubeWebhookEvent;
  id?: number; // product_id for product events, undefined for app events
}
