// lib/pirateship-import.ts
// Pure TypeScript utilities for parsing and matching PirateShip xlsx exports.
// No "use client" — safe to import from server or client.

export type PirateShipRow = {
  createdDate: Date;
  recipient: string;
  email: string;
  trackingNumber: string;
  cost: number;
  status: string;
};

export type CandidateOrder = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  created_at: string;
  tracking_number: string | null;
  fulfillment_status: string;
  order_summary: string | null;
  order_total_cents: number | null;
  order_currency: string;
};

export type MatchConfidence = "auto" | "review" | "unmatched" | "already-imported";

export type RowMatch = {
  row: PirateShipRow;
  rowIndex: number;
  confidence: MatchConfidence;
  candidates: CandidateOrder[];
  selectedOrderId: string | null;
  skipped: boolean;
};

// ─── Column name normalizer ───────────────────────────────────────────────────
// PirateShip columns may vary in casing/spacing. We normalize by lower-casing
// and stripping non-alphanumeric characters, then map known patterns.

function normalizeKey(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findColumn(row: Record<string, unknown>, ...candidates: string[]): unknown {
  const normalized = Object.keys(row).reduce<Record<string, unknown>>((acc, k) => {
    acc[normalizeKey(k)] = row[k];
    return acc;
  }, {});

  for (const candidate of candidates) {
    const nk = normalizeKey(candidate);
    if (nk in normalized) return normalized[nk];
  }
  return undefined;
}

function parseCost(raw: unknown): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const cleaned = raw.replace(/[$,\s]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function parseDate(raw: unknown): Date {
  if (raw instanceof Date) return raw;
  if (typeof raw === "string" || typeof raw === "number") {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(0);
}

// ─── parsePirateShipRows ──────────────────────────────────────────────────────

export function parsePirateShipRows(rawRows: Record<string, unknown>[]): PirateShipRow[] {
  const results: PirateShipRow[] = [];

  for (const row of rawRows) {
    const trackingNumber = String(
      findColumn(row, "Tracking Number", "tracking number", "trackingnumber", "tracking") ?? ""
    ).trim();

    if (!trackingNumber) continue; // skip rows with no tracking number

    const createdDate = parseDate(
      findColumn(row, "Created Date", "created date", "createddate", "date", "Ship Date", "shipdate")
    );

    const recipient = String(
      findColumn(row, "Recipient", "recipient name", "recipientname", "name", "To Name", "toname") ?? ""
    ).trim();

    const email = String(
      findColumn(row, "Email", "recipient email", "recipientemail", "email address", "emailaddress") ?? ""
    ).trim();

    const cost = parseCost(
      findColumn(row, "Cost", "label cost", "labelcost", "postage", "amount", "total")
    );

    const status = String(
      findColumn(row, "Status", "label status", "labelstatus", "shipment status", "shipmentstatus") ?? ""
    ).trim();

    results.push({ createdDate, recipient, email, trackingNumber, cost, status });
  }

  return results;
}

// ─── matchRows ────────────────────────────────────────────────────────────────

export function matchRows(rows: PirateShipRow[], allOrders: CandidateOrder[]): RowMatch[] {
  // Build email lookup map: normalized email → orders
  const byEmail = new Map<string, CandidateOrder[]>();
  for (const order of allOrders) {
    if (!order.customer_email) continue;
    const key = order.customer_email.toLowerCase().trim();
    if (!byEmail.has(key)) byEmail.set(key, []);
    byEmail.get(key)!.push(order);
  }

  // Build set of already-imported tracking numbers
  const existingTracking = new Set<string>();
  for (const order of allOrders) {
    if (order.tracking_number) {
      existingTracking.add(order.tracking_number.trim());
    }
  }

  const results: RowMatch[] = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    // Check if tracking number already exists in DB
    if (existingTracking.has(row.trackingNumber.trim())) {
      results.push({
        row,
        rowIndex,
        confidence: "already-imported",
        candidates: [],
        selectedOrderId: null,
        skipped: true,
      });
      continue;
    }

    // End of label created date (end of day UTC)
    const labelDateEndOfDay = new Date(row.createdDate);
    labelDateEndOfDay.setUTCHours(23, 59, 59, 999);

    const rowEmail = row.email.toLowerCase().trim();

    // Try email match
    const emailCandidates: CandidateOrder[] = (byEmail.get(rowEmail) ?? []).filter((order) => {
      const orderCreatedAt = new Date(order.created_at);
      return (
        orderCreatedAt <= labelDateEndOfDay &&
        order.tracking_number === null &&
        (order.fulfillment_status === "pending" || order.fulfillment_status === "processing")
      );
    });

    if (emailCandidates.length === 1) {
      results.push({
        row,
        rowIndex,
        confidence: "auto",
        candidates: emailCandidates,
        selectedOrderId: emailCandidates[0].id,
        skipped: false,
      });
      continue;
    }

    if (emailCandidates.length > 1) {
      results.push({
        row,
        rowIndex,
        confidence: "review",
        candidates: emailCandidates,
        selectedOrderId: null,
        skipped: false,
      });
      continue;
    }

    // Fallback: name match on non-cancelled orders without tracking
    const rowRecipient = row.recipient.toLowerCase().trim();
    const nameCandidates: CandidateOrder[] = allOrders.filter((order) => {
      if (order.fulfillment_status === "cancelled") return false;
      if (order.tracking_number !== null) return false;
      const name = (order.customer_name ?? "").toLowerCase().trim();
      return name === rowRecipient && name.length > 0;
    });

    if (nameCandidates.length === 0) {
      results.push({
        row,
        rowIndex,
        confidence: "unmatched",
        candidates: [],
        selectedOrderId: null,
        skipped: true,
      });
    } else if (nameCandidates.length === 1) {
      results.push({
        row,
        rowIndex,
        confidence: "review",
        candidates: nameCandidates,
        selectedOrderId: nameCandidates[0].id,
        skipped: false,
      });
    } else {
      results.push({
        row,
        rowIndex,
        confidence: "review",
        candidates: nameCandidates,
        selectedOrderId: null,
        skipped: false,
      });
    }
  }

  return results;
}
