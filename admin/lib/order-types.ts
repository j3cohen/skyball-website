// Shared types for order data across admin components.

export type ShippingAddress = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

export type OrderDataItem = {
  stripe_price_id?: string | null;
  product_name?: string | null;
  slug?: string | null;
  quantity?: number | null;
  unit_amount_cents?: number | null;
  currency?: string | null;
  amount_total_cents?: number | null;
  customizations?: Record<string, unknown>;
};

export type OrderData = {
  version?: number;
  items?: OrderDataItem[];
  customer_selections?: {
    heard_about_us?: string | null;
    order_notes?: string | null;
  };
};

// Shape passed from server → client for the fulfillment table + export flow.
// shipping_address and order_data stay as Record<string, unknown> to match
// the Supabase-generated types; they are cast to the narrower types above
// inside the utility functions that consume them.
export type ExportableOrder = {
  id: string;
  stripe_session_id: string;
  customer_name: string | null;
  customer_email: string | null;
  shipping_address: Record<string, unknown> | null;
  order_data: Record<string, unknown> | null;
  order_summary: string | null;
  order_total_cents: number | null;
  order_currency: string;
  fulfillment_status: string;
  created_at: string;
};
