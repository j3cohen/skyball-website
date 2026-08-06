#!/usr/bin/env bash
# scripts/local-db/grant-test-seat.sh
# Mint a fake certification purchase + seats in the LOCAL database and
# print the claim links — so the claim → course → quiz → certificate
# flow can be tested end-to-end without Stripe.
#
#   ./scripts/local-db/grant-test-seat.sh [seats]     (default 1)
#
# Uses the seeded fixture program/offer from seed.sql.

set -euo pipefail
cd "$(dirname "$0")/../.."

SEATS="${1:-1}"
DB_CONTAINER="supabase_db_skyball-website"
PROGRAM_ID="10000000-0000-4000-8000-000000000001"
OFFER_ID="10000000-0000-4000-8000-000000000011"
SESSION_ID="cs_local_test_$(date +%s)_$RANDOM"

if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  echo "❌ local stack not running — run ./scripts/local-db/setup.sh first"
  exit 1
fi

TOKENS=$(docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -At <<SQL
WITH p AS (
  INSERT INTO cert_purchases
    (program_id, offer_id, stripe_session_id, purchaser_email, purchaser_name,
     seat_count, amount_total_cents, currency)
  VALUES ('$PROGRAM_ID', '$OFFER_ID', '$SESSION_ID', 'localtest@example.test',
          'Local Tester', $SEATS, 9900, 'usd')
  RETURNING id
), s AS (
  INSERT INTO cert_seats (purchase_id, program_id, claim_token)
  SELECT p.id, '$PROGRAM_ID', encode(gen_random_bytes(24), 'base64')
  FROM p, generate_series(1, $SEATS)
  RETURNING claim_token
)
SELECT replace(replace(replace(claim_token, '+', '-'), '/', '_'), '=', '') FROM s;
SQL
)

echo ""
echo "✅ Created $SEATS seat(s) for the fixture program (session $SESSION_ID)"
echo ""
echo "Claim links — open one in the browser (you'll be asked to sign in):"
while IFS= read -r t; do
  [ -n "$t" ] && echo "   http://localhost:3000/coaching/claim/$t"
done <<< "$TOKENS"
echo ""
echo "Then: http://localhost:3000/coaching/course"
