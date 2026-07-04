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

export type TrackingEntry = {
  number: string;
  tracking_status: string;
  added_at: string;
};

export type CandidateOrder = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  created_at: string;
  tracking_number: string | null;
  tracking_numbers: TrackingEntry[] | null;
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
  /** True when this row maps to an already-imported tracking number and only updates its status. */
  isStatusUpdate?: boolean;
  /**
   * Order IDs that already carry this tracking number — receive status updates only.
   */
  additionalOrderIds?: string[];
  /**
   * Extra order IDs manually added by the user — receive the full tracking_entry (new label).
   * Used when one box covers multiple orders placed before shipping.
   */
  extraOrderIds?: string[];
};

// ─── Column name normalizer ───────────────────────────────────────────────────

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

    // Label status (e.g. "Refunded", "Label Created") takes priority for "Refunded"
    const labelStatus = String(
      findColumn(row, "Status", "label status", "labelstatus", "shipment status", "shipmentstatus") ?? ""
    ).trim();

    // Carrier tracking status (e.g. "Delivered", "In Transit")
    const trackingStatus = String(
      findColumn(row, "Tracking Status", "trackingstatus") ?? ""
    ).trim();

    // Use "Refunded" from the label Status column; otherwise use the carrier Tracking Status
    const status = labelStatus.toLowerCase() === "refunded" ? "Refunded" : trackingStatus;

    results.push({ createdDate, recipient, email, trackingNumber, cost, status });
  }

  return results;
}

function isEventOrder(order: CandidateOrder): boolean {
  const s = (order.order_summary ?? "").toLowerCase();
  return /entry fee|open.?play/i.test(s);
}

/** Returns the stored tracking_status for a given tracking number on an order, or null if not found. */
function getStoredStatus(order: CandidateOrder, trackingNumber: string): string | null {
  const tn = trackingNumber.trim();
  for (const entry of order.tracking_numbers ?? []) {
    if (entry.number.trim() === tn) return entry.tracking_status;
  }
  return null;
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

  // Build map: tracking number → ALL order IDs that carry it (multiple allowed intentionally)
  const trackingToOrderIds = new Map<string, string[]>();
  for (const order of allOrders) {
    const addTN = (tn: string) => {
      const key = tn.trim();
      if (!key) return;
      const ids = trackingToOrderIds.get(key) ?? [];
      if (!ids.includes(order.id)) ids.push(order.id);
      trackingToOrderIds.set(key, ids);
    };
    if (order.tracking_number) addTN(order.tracking_number);
    for (const t of order.tracking_numbers ?? []) addTN(t.number);
  }

  const results: RowMatch[] = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    // All order IDs that already carry this tracking number
    const existingOrderIds = trackingToOrderIds.get(row.trackingNumber.trim()) ?? [];

    // End of label created date (end of day UTC)
    const labelDateEndOfDay = new Date(row.createdDate);
    labelDateEndOfDay.setUTCHours(23, 59, 59, 999);

    const rowEmail = row.email.toLowerCase().trim();

    // Email match — exclude cancelled and event orders (tournament/open play don't ship)
    const emailCandidates: CandidateOrder[] = (byEmail.get(rowEmail) ?? []).filter((order) => {
      const orderCreatedAt = new Date(order.created_at);
      return (
        orderCreatedAt <= labelDateEndOfDay &&
        order.fulfillment_status !== "cancelled" &&
        !isEventOrder(order)
      );
    });

    const additionalFor = (primaryId: string) =>
      existingOrderIds.filter((id) => id !== primaryId);

    // ── Priority 1: label already recorded on one of the email candidates ───
    // Check this BEFORE looking at emailCandidates.length so that re-uploading
    // a previously-matched label never sends it back to "needs review".
    const existingInEmailCandidates = emailCandidates.find((c) =>
      existingOrderIds.includes(c.id)
    );
    if (existingInEmailCandidates) {
      const storedStatus = getStoredStatus(existingInEmailCandidates, row.trackingNumber);
      const noChange = storedStatus !== null && storedStatus === row.status;
      results.push({
        row, rowIndex,
        confidence:         "already-imported",
        candidates:         emailCandidates,
        selectedOrderId:    existingInEmailCandidates.id,
        skipped:            noChange,
        isStatusUpdate:     true,
        additionalOrderIds: additionalFor(existingInEmailCandidates.id),
      });
      continue;
    }

    // ── Priority 2: label already recorded but no email match found ─────────
    // (e.g. order has no email, or email in DB differs — still update status)
    if (existingOrderIds.length > 0 && emailCandidates.length === 0) {
      const primaryOrder = allOrders.find(o => o.id === existingOrderIds[0]);
      const storedStatus = primaryOrder ? getStoredStatus(primaryOrder, row.trackingNumber) : null;
      const noChange = storedStatus !== null && storedStatus === row.status;
      results.push({
        row, rowIndex,
        confidence:         "already-imported",
        candidates:         [],
        selectedOrderId:    existingOrderIds[0],
        skipped:            noChange,
        isStatusUpdate:     true,
        additionalOrderIds: existingOrderIds.slice(1),
      });
      continue;
    }

    // ── Priority 3: fresh label — match by email candidate count ────────────
    if (emailCandidates.length === 1) {
      results.push({
        row, rowIndex,
        confidence:         "auto",
        candidates:         emailCandidates,
        selectedOrderId:    emailCandidates[0].id,
        skipped:            false,
        isStatusUpdate:     false,
        additionalOrderIds: [],
      });
      continue;
    }

    if (emailCandidates.length > 1) {
      results.push({
        row, rowIndex,
        confidence:         "review",
        candidates:         emailCandidates,
        selectedOrderId:    null,
        skipped:            false,
        additionalOrderIds: [],
      });
      continue;
    }

    // ── Priority 4: no email match — name fallback ───────────────────────────
    const rowRecipient = row.recipient.toLowerCase().trim();
    const nameCandidates: CandidateOrder[] = allOrders.filter((order) => {
      if (order.fulfillment_status === "cancelled") return false;
      if (isEventOrder(order)) return false;
      const name = (order.customer_name ?? "").toLowerCase().trim();
      return name === rowRecipient && name.length > 0;
    });

    if (nameCandidates.length === 1) {
      results.push({
        row, rowIndex,
        confidence:         "review",  // name match always needs human confirmation
        candidates:         nameCandidates,
        selectedOrderId:    nameCandidates[0].id,
        skipped:            false,
        isStatusUpdate:     false,
        additionalOrderIds: [],
      });
      continue;
    }

    if (nameCandidates.length > 1) {
      results.push({
        row, rowIndex,
        confidence:         "review",
        candidates:         nameCandidates,
        selectedOrderId:    null,
        skipped:            false,
        additionalOrderIds: [],
      });
      continue;
    }

    // ── Truly unmatched ──────────────────────────────────────────────────────
    results.push({
      row, rowIndex,
      confidence:      "unmatched",
      candidates:      [],
      selectedOrderId: null,
      skipped:         true,
    });
  }

  return results;
}
