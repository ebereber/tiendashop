export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          depth: number
          id: string
          name: string
          parent_id: string | null
          path: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          depth?: number
          id?: string
          name: string
          parent_id?: string | null
          path: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          depth?: number
          id?: string
          name?: string
          parent_id?: string | null
          path?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["org_member_role"]
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["org_member_role"]
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["org_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          plan: string
          product_limit: number
          slug: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          plan?: string
          product_limit?: number
          slug: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          plan?: string
          product_limit?: number
          slug?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          category_id: string
          is_primary: boolean
          product_id: string
        }
        Insert: {
          category_id: string
          is_primary?: boolean
          product_id: string
        }
        Update: {
          category_id?: string
          is_primary?: boolean
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          height: number | null
          id: string
          is_external: boolean
          position: number
          product_id: string
          updated_at: string
          url: string
          width: number | null
        }
        Insert: {
          created_at?: string
          height?: number | null
          id?: string
          is_external?: boolean
          position?: number
          product_id: string
          updated_at?: string
          url: string
          width?: number | null
        }
        Update: {
          created_at?: string
          height?: number | null
          id?: string
          is_external?: boolean
          position?: number
          product_id?: string
          updated_at?: string
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_quality_flags: {
        Row: {
          created_at: string
          flag_type: Database["public"]["Enums"]["quality_flag_type"]
          id: string
          product_id: string
          resolved: boolean
          severity: Database["public"]["Enums"]["flag_severity"]
        }
        Insert: {
          created_at?: string
          flag_type: Database["public"]["Enums"]["quality_flag_type"]
          id?: string
          product_id: string
          resolved?: boolean
          severity?: Database["public"]["Enums"]["flag_severity"]
        }
        Update: {
          created_at?: string
          flag_type?: Database["public"]["Enums"]["quality_flag_type"]
          id?: string
          product_id?: string
          resolved?: boolean
          severity?: Database["public"]["Enums"]["flag_severity"]
        }
        Relationships: [
          {
            foreignKeyName: "product_quality_flags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          attributes: Json | null
          compare_price: number | null
          created_at: string
          id: string
          price: number
          product_id: string
          sku: string | null
          stock: number
          tiendanube_variant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          attributes?: Json | null
          compare_price?: number | null
          created_at?: string
          id?: string
          price: number
          product_id: string
          sku?: string | null
          stock?: number
          tiendanube_variant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          attributes?: Json | null
          compare_price?: number | null
          created_at?: string
          id?: string
          price?: number
          product_id?: string
          sku?: string | null
          stock?: number
          tiendanube_variant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          auto_category_id: string | null
          brand: string | null
          created_at: string
          description: string | null
          handle: string | null
          has_stock: boolean
          id: string
          manual_category_id: string | null
          merchant_status: Database["public"]["Enums"]["merchant_status"]
          price_max: number | null
          price_min: number | null
          quality_score: number
          search_vector: unknown
          store_id: string
          synced_at: string | null
          system_status: Database["public"]["Enums"]["system_status"]
          system_status_detail: string | null
          system_status_reason:
            | Database["public"]["Enums"]["system_status_reason"]
            | null
          tiendanube_product_id: string
          title: string
          title_normalized: string | null
          tn_category_raw: string | null
          updated_at: string
        }
        Insert: {
          auto_category_id?: string | null
          brand?: string | null
          created_at?: string
          description?: string | null
          handle?: string | null
          has_stock?: boolean
          id?: string
          manual_category_id?: string | null
          merchant_status?: Database["public"]["Enums"]["merchant_status"]
          price_max?: number | null
          price_min?: number | null
          quality_score?: number
          search_vector?: unknown
          store_id: string
          synced_at?: string | null
          system_status?: Database["public"]["Enums"]["system_status"]
          system_status_detail?: string | null
          system_status_reason?:
            | Database["public"]["Enums"]["system_status_reason"]
            | null
          tiendanube_product_id: string
          title: string
          title_normalized?: string | null
          tn_category_raw?: string | null
          updated_at?: string
        }
        Update: {
          auto_category_id?: string | null
          brand?: string | null
          created_at?: string
          description?: string | null
          handle?: string | null
          has_stock?: boolean
          id?: string
          manual_category_id?: string | null
          merchant_status?: Database["public"]["Enums"]["merchant_status"]
          price_max?: number | null
          price_min?: number | null
          quality_score?: number
          search_vector?: unknown
          store_id?: string
          synced_at?: string | null
          system_status?: Database["public"]["Enums"]["system_status"]
          system_status_detail?: string | null
          system_status_reason?:
            | Database["public"]["Enums"]["system_status_reason"]
            | null
          tiendanube_product_id?: string
          title?: string
          title_normalized?: string | null
          tn_category_raw?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_auto_category_id_fkey"
            columns: ["auto_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_manual_category_id_fkey"
            columns: ["manual_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "active_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      redirect_events: {
        Row: {
          created_at: string
          filters_json: Json | null
          id: string
          is_anonymous: boolean | null
          product_id: string | null
          query_origin: string | null
          result_position: number | null
          session_id: string
          sort_key: string | null
          source_type:
            | Database["public"]["Enums"]["redirect_source_type"]
            | null
          store_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          filters_json?: Json | null
          id?: string
          is_anonymous?: boolean | null
          product_id?: string | null
          query_origin?: string | null
          result_position?: number | null
          session_id: string
          sort_key?: string | null
          source_type?:
            | Database["public"]["Enums"]["redirect_source_type"]
            | null
          store_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          filters_json?: Json | null
          id?: string
          is_anonymous?: boolean | null
          product_id?: string | null
          query_origin?: string | null
          result_position?: number | null
          session_id?: string
          sort_key?: string | null
          source_type?:
            | Database["public"]["Enums"]["redirect_source_type"]
            | null
          store_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "redirect_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redirect_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "active_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redirect_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redirect_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_products: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_stores: {
        Row: {
          created_at: string
          id: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "active_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_stores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      search_queries: {
        Row: {
          created_at: string
          id: string
          query: string
          result_count: number
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          result_count?: number
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          result_count?: number
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_queries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          access_token: string
          country: string
          created_at: string
          currency: string
          deleted_at: string | null
          domain: string | null
          id: string
          last_synced_at: string | null
          name: string
          organization_id: string
          publish_all: boolean
          refresh_token: string | null
          slug: string
          sync_created_products: number | null
          sync_error_message: string | null
          sync_failed_products: number | null
          sync_processed_products: number | null
          sync_status: Database["public"]["Enums"]["sync_status"]
          sync_total_products: number | null
          sync_updated_products: number | null
          tiendanube_store_id: string
          updated_at: string
        }
        Insert: {
          access_token: string
          country?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          domain?: string | null
          id?: string
          last_synced_at?: string | null
          name: string
          organization_id: string
          publish_all?: boolean
          refresh_token?: string | null
          slug: string
          sync_created_products?: number | null
          sync_error_message?: string | null
          sync_failed_products?: number | null
          sync_processed_products?: number | null
          sync_status?: Database["public"]["Enums"]["sync_status"]
          sync_total_products?: number | null
          sync_updated_products?: number | null
          tiendanube_store_id: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          country?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          domain?: string | null
          id?: string
          last_synced_at?: string | null
          name?: string
          organization_id?: string
          publish_all?: boolean
          refresh_token?: string | null
          slug?: string
          sync_created_products?: number | null
          sync_error_message?: string | null
          sync_failed_products?: number | null
          sync_processed_products?: number | null
          sync_status?: Database["public"]["Enums"]["sync_status"]
          sync_total_products?: number | null
          sync_updated_products?: number | null
          tiendanube_store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_stores: {
        Row: {
          access_token: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          domain: string | null
          id: string | null
          last_synced_at: string | null
          name: string | null
          organization_id: string | null
          publish_all: boolean | null
          refresh_token: string | null
          slug: string | null
          sync_error_message: string | null
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          tiendanube_store_id: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          domain?: string | null
          id?: string | null
          last_synced_at?: string | null
          name?: string | null
          organization_id?: string | null
          publish_all?: boolean | null
          refresh_token?: string | null
          slug?: string | null
          sync_error_message?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          tiendanube_store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          domain?: string | null
          id?: string | null
          last_synced_at?: string | null
          name?: string | null
          organization_id?: string | null
          publish_all?: boolean | null
          refresh_token?: string | null
          slug?: string | null
          sync_error_message?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          tiendanube_store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auth_user_id: { Args: never; Returns: string }
      is_org_admin: { Args: { p_org_id: string }; Returns: boolean }
      is_org_member: { Args: { p_org_id: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      soft_delete_store: { Args: { p_store_id: string }; Returns: undefined }
      update_product_manual_category: {
        Args: { p_manual_category_id: string | null; p_product_id: string }
        Returns: undefined
      }
    }
    Enums: {
      flag_severity: "warning" | "error"
      merchant_status: "active" | "paused"
      org_member_role: "owner" | "admin" | "member"
      quality_flag_type:
        | "no_image"
        | "no_stock"
        | "title_too_short"
        | "no_description"
        | "no_price"
        | "external_image"
        | "description_too_short"
      redirect_source_type:
        | "search"
        | "category"
        | "brand"
        | "store"
        | "saved"
        | "home"
        | "product"
      sync_status: "ok" | "error" | "stale" | "disabled" | "syncing"
      system_status: "visible" | "hidden" | "error"
      system_status_reason:
        | "no_image"
        | "no_stock"
        | "sync_error"
        | "store_disconnected"
        | "store_deleted"
        | "manual_review"
        | "spam_detected"
      user_role: "buyer" | "owner"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      flag_severity: ["warning", "error"],
      merchant_status: ["active", "paused"],
      org_member_role: ["owner", "admin", "member"],
      quality_flag_type: [
        "no_image",
        "no_stock",
        "title_too_short",
        "no_description",
        "no_price",
        "external_image",
        "description_too_short",
      ],
      redirect_source_type: [
        "search",
        "category",
        "brand",
        "store",
        "saved",
        "home",
        "product",
      ],
      sync_status: ["ok", "error", "stale", "disabled", "syncing"],
      system_status: ["visible", "hidden", "error"],
      system_status_reason: [
        "no_image",
        "no_stock",
        "sync_error",
        "store_disconnected",
        "store_deleted",
        "manual_review",
        "spam_detected",
      ],
      user_role: ["buyer", "owner"],
    },
  },
} as const
