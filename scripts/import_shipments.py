#!/usr/bin/env python3
"""
One-time import: Shipments_4_18.xlsx → Supabase orders.tracking_numbers.
Matches each shipment to an order by customer email, then appends the
tracking number to the order's tracking_numbers jsonb array.

Requires: pip install openpyxl   (or: pip3 install openpyxl)

Usage:
  python3 scripts/import_shipments.py
"""

import json
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

try:
    import openpyxl
except ImportError:
    sys.exit("❌  openpyxl not installed. Run: pip3 install openpyxl")

# ── Config ─────────────────────────────────────────────────────────────────────

XLSX_PATH  = Path("/Users/joshuacohen/Downloads/Shipments_4_18.xlsx")
ENV_PATH   = Path(__file__).parent.parent / ".env.local"

# ── Load env ───────────────────────────────────────────────────────────────────

def load_env(path: Path) -> dict:
    env = {}
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env

env = load_env(ENV_PATH)
SUPABASE_URL = env.get("NEXT_PUBLIC_SUPABASE_URL", "")
SERVICE_KEY  = env.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SERVICE_KEY:
    sys.exit("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")

# ── Supabase helpers ───────────────────────────────────────────────────────────

def supabase_get(path: str, params: str = "") -> list:
    url = f"{SUPABASE_URL}/rest/v1/{path}{'?' + params if params else ''}"
    req = urllib.request.Request(url, headers={
        "apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}",
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def supabase_patch(order_id: str, body: dict) -> None:
    url = f"{SUPABASE_URL}/rest/v1/orders?id=eq.{order_id}"
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method="PATCH", headers={
        "Content-Type": "application/json",
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Prefer": "return=minimal",
    })
    try:
        with urllib.request.urlopen(req) as resp:
            if resp.status not in (200, 204):
                raise RuntimeError(f"HTTP {resp.status}")
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode()}") from e

# ── Parse xlsx ─────────────────────────────────────────────────────────────────

def parse_xlsx(path: Path) -> list[dict]:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    headers = [str(h).strip() if h else "" for h in rows[0]]
    result = []
    for row in rows[1:]:
        d = {headers[i]: (row[i] if i < len(row) else None) for i in range(len(headers))}
        result.append(d)
    wb.close()
    return result

def tracking_status(raw) -> str:
    s = str(raw or "").strip()
    return s if s else "Unknown"

# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    print("📦  Loading shipments xlsx…")
    rows = parse_xlsx(XLSX_PATH)
    print(f"    {len(rows)} rows found")

    # Filter to rows with a tracking number
    shipments = [r for r in rows if r.get("Tracking Number")]
    print(f"    {len(shipments)} rows have a tracking number")

    # Fetch all orders from Supabase (email, tracking_numbers, tracking_number)
    print("\n🔍  Fetching orders from Supabase…")
    # Fetch in pages if needed; limit 1000 for now
    orders = supabase_get(
        "orders",
        "select=id,customer_email,tracking_number,tracking_numbers,fulfillment_status&limit=2000"
    )
    print(f"    {len(orders)} orders loaded")

    # Build email → list of orders map
    by_email: dict[str, list[dict]] = {}
    for o in orders:
        email = (o.get("customer_email") or "").strip().lower()
        if email:
            by_email.setdefault(email, []).append(o)

    # Build set of all existing tracking numbers to skip already-imported
    existing = set()
    for o in orders:
        if o.get("tracking_number"):
            existing.add(o["tracking_number"].strip())
        for t in (o.get("tracking_numbers") or []):
            if isinstance(t, dict) and t.get("number"):
                existing.add(t["number"].strip())

    # Current tracking_numbers state per order (to correctly append)
    order_tracking: dict[str, list] = {
        o["id"]: list(o.get("tracking_numbers") or []) for o in orders
    }
    # Include legacy tracking_number in the array if not already present
    for o in orders:
        oid = o["id"]
        legacy = o.get("tracking_number")
        if legacy and not any(t.get("number") == legacy for t in order_tracking[oid]):
            order_tracking[oid].insert(0, {
                "number": legacy, "tracking_status": "Unknown", "added_at": ""
            })

    # Process shipments
    already_imported = 0
    no_match = []
    multi_match = []
    applied = 0
    errors = []

    for row in shipments:
        tracking_num = str(row["Tracking Number"]).strip()
        email        = str(row.get("Email") or "").strip().lower()
        ts           = tracking_status(row.get("Tracking Status"))
        created_raw  = row.get("Created Date")

        # Skip already imported
        if tracking_num in existing:
            already_imported += 1
            continue

        candidates = by_email.get(email, [])
        candidates = [c for c in candidates if c.get("fulfillment_status") != "cancelled"]

        if len(candidates) == 0:
            no_match.append({"tracking": tracking_num, "email": email, "recipient": str(row.get("Recipient") or "")})
            continue

        if len(candidates) > 1:
            multi_match.append({"tracking": tracking_num, "email": email, "count": len(candidates)})
            continue

        # Single match — apply
        order_id = candidates[0]["id"]
        entry = {
            "number": tracking_num,
            "tracking_status": ts,
            "added_at": datetime.now(timezone.utc).isoformat(),
        }
        updated_arr = order_tracking[order_id] + [entry]
        order_tracking[order_id] = updated_arr  # update in-memory so multi-tracking per order works

        # Also determine fulfillment_status update
        new_status = "fulfilled" if ts == "Delivered" else "processing"
        cur_status = candidates[0].get("fulfillment_status", "pending")
        # Don't downgrade fulfilled → processing
        if cur_status == "fulfilled":
            new_status = "fulfilled"

        try:
            supabase_patch(order_id, {
                "tracking_numbers": updated_arr,
                "fulfillment_status": new_status,
            })
            existing.add(tracking_num)  # mark as imported
            applied += 1
        except RuntimeError as e:
            errors.append({"tracking": tracking_num, "error": str(e)})

    # Report
    print(f"\n✅  Done:")
    print(f"    {applied} tracking numbers imported")
    print(f"    {already_imported} already in database (skipped)")
    print(f"    {len(no_match)} could not be matched (no order with that email)")
    print(f"    {len(multi_match)} ambiguous (multiple orders for email — needs manual review)")
    print(f"    {len(errors)} errors")

    if no_match:
        print("\n⚠️  Unmatched shipments (no order found for email):")
        for m in no_match:
            print(f"    {m['tracking']}  {m['email']}  {m['recipient']}")

    if multi_match:
        print("\n⚠️  Ambiguous shipments (multiple orders — use the admin UI to match manually):")
        for m in multi_match:
            print(f"    {m['tracking']}  {m['email']}  ({m['count']} orders)")

    if errors:
        print("\n❌  Errors:")
        for e in errors:
            print(f"    {e['tracking']}: {e['error']}")

if __name__ == "__main__":
    main()
