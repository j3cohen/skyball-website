#!/usr/bin/env python3
"""
One-time import: unified_payments CSV → Supabase orders table.
Matches the schema written by app/api/webhooks/stripe/route.ts.

Usage:
  python3 scripts/import_orders.py

Existing orders (matched on stripe_session_id) are left untouched so
fulfillment_status / tracking / notes set by the admin are preserved.
"""

import csv
import json
import sys
import urllib.request
import urllib.error
from pathlib import Path

# ── Config ─────────────────────────────────────────────────────────────────────

CSV_PATH   = Path("/Users/joshuacohen/Downloads/unified_payments_4_18.csv")
ENV_PATH   = Path(__file__).parent.parent / ".env.local"
BATCH_SIZE = 50

# ── Load .env.local ────────────────────────────────────────────────────────────

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

# ── Supabase upsert ────────────────────────────────────────────────────────────

def supabase_upsert(rows: list) -> None:
    """Insert rows; skip any that already exist (preserves admin edits)."""
    url = f"{SUPABASE_URL}/rest/v1/orders?on_conflict=stripe_session_id"
    data = json.dumps(rows).encode()
    req  = urllib.request.Request(
        url, data=data, method="POST",
        headers={
            "Content-Type":  "application/json",
            "apikey":         SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Prefer":        "resolution=ignore-duplicates,return=minimal",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            if resp.status not in (200, 201):
                body = resp.read().decode()
                raise RuntimeError(f"HTTP {resp.status}: {body}")
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode()}") from e

# ── Row parsing ────────────────────────────────────────────────────────────────

def try_json(raw: str, fallback):
    if not raw or not raw.strip():
        return fallback
    try:
        return json.loads(raw)
    except Exception:
        return fallback

def build_order_data(row: dict, currency: str) -> dict:
    raw_items   = try_json(row.get("order_data_json (metadata)", ""), [])
    items_meta  = try_json(row.get("order_items_json (metadata)", ""), [])

    items_out = []
    for i, raw in enumerate(raw_items if isinstance(raw_items, list) else []):
        if not isinstance(raw, dict):
            continue

        qty   = raw.get("qty") or 1
        cents = raw.get("cents") or 0

        customizations: dict = {}
        if raw.get("color"):
            customizations["ball_color"] = raw["color"]
        if raw.get("colors"):
            customizations["grip_colors"] = raw["colors"]
            if raw.get("unselected") is not None:
                customizations["unselected_grips"] = raw["unselected"]
        if raw.get("size"):
            customizations["crewneck_size"] = raw["size"]

        # Product name from items_meta (positional match)
        product_name = None
        if isinstance(items_meta, list) and i < len(items_meta):
            product_name = items_meta[i].get("name")
        product_name = product_name or raw.get("slug")

        items_out.append({
            "stripe_price_id":    raw.get("pid"),
            "product_name":       product_name,
            "slug":               raw.get("slug"),
            "quantity":           qty,
            "unit_amount_cents":  cents,
            "currency":           currency,
            "amount_total_cents": cents * qty,
            "customizations":     customizations,
        })

    # Heard-about-us and order notes from custom fields
    heard = None
    order_notes = None
    for n in ("1", "2", "3"):
        key = row.get(f"Checkout Custom Field {n} Key", "")
        val = row.get(f"Checkout Custom Field {n} Value", "") or None
        if key == "heard_about_us":
            heard = val
        elif key == "order_notes":
            order_notes = val

    return {
        "version": 1,
        "items": items_out,
        "customer_selections": {
            "heard_about_us": heard,
            "order_notes":    order_notes,
        },
    }

def row_to_record(row: dict) -> dict | None:
    if row.get("Status", "").strip().lower() != "paid":
        return None

    session_id = (row.get("Checkout Session ID") or "").strip()
    if not session_id:
        return None

    currency = (row.get("Currency") or "usd").lower()

    try:
        total_cents = round(float(row.get("Amount") or 0) * 100)
    except (ValueError, TypeError):
        total_cents = 0

    # Shipping address — use card billing address as fallback
    shipping = {
        "line1":       row.get("Shipping Address Line1") or None,
        "line2":       row.get("Shipping Address Line2") or None,
        "city":        row.get("Shipping Address City") or None,
        "state":       row.get("Shipping Address State") or None,
        "postal_code": row.get("Shipping Address Postal Code") or None,
        "country":     row.get("Shipping Address Country") or None,
    }
    if not any(shipping.values()):
        shipping = None

    # heard_about_us / order_notes from custom fields
    heard = None
    order_notes = None
    for n in ("1", "2", "3"):
        key = row.get(f"Checkout Custom Field {n} Key", "")
        val = row.get(f"Checkout Custom Field {n} Value", "") or None
        if key == "heard_about_us":
            heard = val
        elif key == "order_notes":
            order_notes = val

    # Timestamp: "2026-04-18 04:11:02" → "2026-04-18T04:11:02Z"
    created_raw = (row.get("Created date (UTC)") or "").strip()
    created_at  = created_raw.replace(" ", "T") + "Z" if created_raw else None

    order_data = build_order_data(row, currency)

    return {
        "stripe_session_id":        session_id,
        "stripe_payment_intent_id": row.get("PaymentIntent ID") or None,
        "customer_email":           row.get("Customer Email") or None,
        "customer_name":            row.get("Shipping Name") or None,
        "customer_phone":           row.get("Customer Phone") or None,
        "shipping_address":         shipping,
        "order_data":               order_data,
        "order_total_cents":        total_cents,
        "order_currency":           currency,
        "order_summary":            row.get("order_summary (metadata)") or None,
        "fulfillment_status":       "pending",
        "heard_about_us":           heard,
        "customer_order_notes":     order_notes,
        "created_at":               created_at,
        "raw_stripe_session":       None,
    }

# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    records = []
    skipped = 0

    with CSV_PATH.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rec = row_to_record(row)
            if rec is None:
                skipped += 1
            else:
                records.append(rec)

    print(f"📦  {len(records)} orders to import, {skipped} rows skipped (not paid / no session ID)")

    if not records:
        print("Nothing to import.")
        return

    imported = 0
    errors   = 0

    for i in range(0, len(records), BATCH_SIZE):
        batch     = records[i : i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        try:
            supabase_upsert(batch)
            imported += len(batch)
            print(f"  ✅  Batch {batch_num}: {len(batch)} rows")
        except RuntimeError as e:
            errors += 1
            print(f"  ❌  Batch {batch_num} failed: {e}")

    print(f"\n{'✅' if not errors else '⚠️ '}  Done — {imported} imported, {errors} batch error(s).")
    if errors:
        print("     Re-run the script to retry failed batches (duplicates are skipped safely).")

if __name__ == "__main__":
    main()
