import "server-only";
import { supabaseAdmin } from "./supabaseAdmin";
import type { AnalyticsOrder } from "@/lib/analytics-utils";

const PAGE_SIZE = 1000;

/**
 * Fetch every non-cancelled order, paging past PostgREST's max-rows cap.
 *
 * A plain `.select()` with no `.range()` is silently truncated at the server's
 * max-rows limit (1000 by default). The order table is already in the high
 * hundreds, so an unpaged read is a correctness bug waiting to happen — totals
 * would just quietly stop growing.
 *
 * The other analytics routes still read unpaged; they can adopt this as-is.
 */
export async function fetchAllOrders(
  columns: string
): Promise<{ orders: AnalyticsOrder[]; error: string | null }> {
  const orders: AnalyticsOrder[] = [];

  for (let page = 0; ; page++) {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(columns)
      .neq("fulfillment_status", "cancelled")
      .order("created_at", { ascending: true })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (error) return { orders: [], error: error.message };

    const batch = (data ?? []) as unknown as AnalyticsOrder[];
    orders.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }

  return { orders, error: null };
}
