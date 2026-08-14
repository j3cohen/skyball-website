#!/usr/bin/env bash
# scripts/local-db/setup.sh
# Build the LOCAL Supabase clone of the website prod DB and prove the
# cert migration is additive. Idempotent — safe to re-run.
#
#   1. supabase start (ports 5434x — see supabase/config.toml)
#   2. baseline prod schema (baseline-fresh.sql if present, else the
#      committed Jul-23 dump baseline-website-schema.sql)
#   3. repo migrations (IF NOT EXISTS-guarded)
#   4. SCHEMA-DIFF GUARD around 20260805_certifications.sql:
#      asserts the cert migration adds ONLY cert_* objects
#   4b. site intake tables (20260814_site_intake.sql), applied once
#   5. seed catalog + synthetic orders + fixture cert program
#   6. local admin auth user (admin@local.test / localadmin)
#
# To refresh the baseline from prod (owner-run, read-only):
#   supabase db dump --db-url "<prod connection string>" --schema public \
#     -f scripts/local-db/baseline-fresh.sql

set -euo pipefail
cd "$(dirname "$0")/../.."

DB_CONTAINER="supabase_db_skyball-website"
PSQL=(docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -q)
API_URL="http://127.0.0.1:54341"

echo "── 1/6 starting local supabase ──"
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  supabase start
fi

SERVICE_KEY=$(supabase status -o json 2>/dev/null | python3 -c "import json,sys;print(json.load(sys.stdin)['SERVICE_ROLE_KEY'])")

echo "── 2/6 baseline prod schema ──"
BASELINE="scripts/local-db/baseline-website-schema.sql"
[ -f scripts/local-db/baseline-fresh.sql ] && BASELINE="scripts/local-db/baseline-fresh.sql"
echo "   using $BASELINE (errors for already-existing objects are expected on re-runs)"
"${PSQL[@]}" < "$BASELINE" 2>&1 | grep -Ev "already exists|ERROR:  role|NOTICE" | head -20 || true

echo "── 3/6 repo migrations (pre-cert) ──"
for f in supabase/migrations/20260319_orders.sql \
         supabase/migrations/20260405_shipping_label_cost.sql \
         supabase/migrations/20260603_refund_fields.sql \
         supabase/migrations/20260604_stripe_fee.sql \
         supabase/migrations/20260605_fix_mojibake.sql \
         supabase/migrations/20260806_orders_status_constraint.sql; do
  echo "   applying $f"
  "${PSQL[@]}" -v ON_ERROR_STOP=1 < "$f" > /dev/null
done

echo "── 4/6 cert migration + schema-diff guard ──"
# Apply to the main local DB (no-op when the CLI already auto-applied
# repo migrations on `supabase start`).
"${PSQL[@]}" -v ON_ERROR_STOP=1 < supabase/migrations/20260805_certifications.sql > /dev/null

# Guard runs in a SCRATCH database so it stays meaningful even though
# the supabase CLI auto-applies supabase/migrations on start: build
# baseline + pre-cert migrations there, dump, apply cert migration,
# dump again, and require every changed line to be cert-scoped.
GUARD_DB="certguard"
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -q \
  -c "DROP DATABASE IF EXISTS $GUARD_DB;" -c "CREATE DATABASE $GUARD_DB;"
GPSQL=(docker exec -i "$DB_CONTAINER" psql -U postgres -d "$GUARD_DB" -q)
"${GPSQL[@]}" < "$BASELINE" > /dev/null 2>&1 || true
for f in supabase/migrations/20260319_orders.sql \
         supabase/migrations/20260405_shipping_label_cost.sql \
         supabase/migrations/20260603_refund_fields.sql \
         supabase/migrations/20260604_stripe_fee.sql \
         supabase/migrations/20260806_orders_status_constraint.sql; do
  "${GPSQL[@]}" < "$f" > /dev/null 2>&1 || true
done
# Object inventory: every named object + per-table column signatures.
# New/changed entries must be cert-scoped (or the shared updated_at fn).
dump_guard() {
  docker exec "$DB_CONTAINER" psql -U postgres -d "$GUARD_DB" -At -c "
    select 'table:'||table_name||':'||column_name||':'||data_type
      from information_schema.columns where table_schema='public'
    union all
    select 'index:'||indexname from pg_indexes where schemaname='public'
    union all
    select 'trigger:'||event_object_table||':'||trigger_name
      from information_schema.triggers where trigger_schema='public'
    union all
    select 'constraint:'||conrelid::regclass::text||':'||conname||':'||pg_get_constraintdef(oid)
      from pg_constraint where connamespace='public'::regnamespace
    union all
    select 'function:'||proname from pg_proc where pronamespace='public'::regnamespace
    union all
    select 'policy:'||tablename||':'||policyname from pg_policies where schemaname='public'
    union all
    select 'rls:'||relname||':'||relrowsecurity
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='r'
  " | sort
}
dump_guard > /tmp/schema-before.txt
"${GPSQL[@]}" -v ON_ERROR_STOP=1 < supabase/migrations/20260805_certifications.sql > /dev/null
dump_guard > /tmp/schema-after.txt
BAD=$(diff /tmp/schema-before.txt /tmp/schema-after.txt | grep -E "^[<>]" \
      | grep -Ev "cert_|update_updated_at_column" || true)
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -q -c "DROP DATABASE IF EXISTS $GUARD_DB;"
if [ -n "$BAD" ]; then
  echo "❌ SCHEMA-DIFF GUARD FAILED — cert migration touched non-cert objects:"
  echo "$BAD"
  exit 1
fi
echo "   ✅ guard passed: migration adds only cert_* objects"

# Site intake tables (notification_signups / site_inquiries / upsert RPC).
# Kept out of the guard lists above on purpose — that guard exists to prove
# the *cert* migration is additive and must keep its current inputs.
# The migration is deliberately verbatim-from-prod (no IF NOT EXISTS), so
# guard the apply here instead of editing the tracked SQL.
echo "── 4b/6 site intake migration ──"
if [ -z "$("${PSQL[@]}" -At -c "select to_regclass('public.notification_signups')")" ]; then
  "${PSQL[@]}" -v ON_ERROR_STOP=1 < supabase/migrations/20260814_site_intake.sql > /dev/null
  echo "   applied 20260814_site_intake.sql"
else
  echo "   already present — skipping"
fi

echo "── 5/6 seeding ──"
"${PSQL[@]}" -v ON_ERROR_STOP=1 < scripts/local-db/seed-catalog.sql > /dev/null
"${PSQL[@]}" -v ON_ERROR_STOP=1 < scripts/local-db/seed.sql > /dev/null

echo "── 6/6 local admin user ──"
ADMIN_ID=$(curl -s -X POST "$API_URL/auth/v1/admin/users" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@local.test","password":"localadmin","email_confirm":true}' \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('id',''))")
if [ -z "$ADMIN_ID" ]; then
  # already exists — look it up
  ADMIN_ID=$(curl -s "$API_URL/auth/v1/admin/users?page=1&per_page=50" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
    | python3 -c "import json,sys;users=json.load(sys.stdin).get('users',[]);print(next((u['id'] for u in users if u['email']=='admin@local.test'),''))")
fi
if [ -n "$ADMIN_ID" ]; then
  echo "INSERT INTO admin_users (id, added_by) VALUES ('$ADMIN_ID', 'local-setup') ON CONFLICT (id) DO NOTHING;" | "${PSQL[@]}"
  echo "   admin@local.test / localadmin ready (id $ADMIN_ID)"
else
  echo "   ⚠️ could not create/find local admin user — create manually in Studio ($API_URL)"
fi

echo ""
echo "✅ Local stack ready:"
echo "   API:    http://127.0.0.1:54341   DB: postgresql://postgres:postgres@127.0.0.1:54342/postgres"
echo "   Studio: http://127.0.0.1:54343"
echo "   Point apps at it via .env.local.example-localdb, then: npm run dev / npm run admin"
