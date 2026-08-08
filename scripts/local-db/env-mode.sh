#!/usr/bin/env bash
# scripts/local-db/env-mode.sh — point the apps at the LOCAL Supabase
# stack or back at production.
#
#   ./scripts/local-db/env-mode.sh status
#   ./scripts/local-db/env-mode.sh local
#   ./scripts/local-db/env-mode.sh prod
#
# How it works: production lines are commented out with a `#__LOCALDB#`
# marker and local values are appended inside a marked block. Switching
# back removes the block and uncomments the originals — your real keys
# are never deleted, just commented.
#
# Only website-project vars are touched. NEXT_PUBLIC_MOBILE_* (auth) and
# Stripe keys are left alone.

set -euo pipefail
cd "$(dirname "$0")/../.."

MODE="${1:-status}"
MARK="#__LOCALDB#"
BEGIN="# >>> local-db overrides (env-mode.sh) >>>"
END="# <<< local-db overrides (env-mode.sh) <<<"

# Use 127.0.0.1, NOT localhost. supabase-js derives the auth cookie name
# from the first hostname label (`sb-<label>-auth-token`), so a localhost
# URL collides with every OTHER local project on this machine that talks
# to a local Supabase (skyball-web / skyball-app use @supabase/ssr, whose
# `base64-` cookie format this app's older auth-helpers cannot parse).
# Cookies ignore ports, so the collision silently breaks admin login.
LOCAL_URL="http://127.0.0.1:54341"
LOCAL_ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
LOCAL_SERVICE="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

is_local() { grep -q "^$BEGIN" "$1" 2>/dev/null; }

comment_keys() { # file, keys...
  local file="$1"; shift
  for key in "$@"; do
    sed -i '' "s|^${key}=|${MARK}${key}=|" "$file"
  done
}

uncomment_keys() { # file
  sed -i '' "s|^${MARK}||" "$1"
}

strip_block() { # file
  sed -i '' "/^${BEGIN}$/,/^${END}$/d" "$1"
}

case "$MODE" in
  status)
    for f in .env.local admin/.env.local; do
      if is_local "$f"; then echo "  $f → LOCAL ($LOCAL_URL)"; else echo "  $f → PRODUCTION"; fi
    done
    ;;

  local)
    # ── main app: website-DB client overrides ──────────────────────
    if is_local .env.local; then
      echo "  .env.local already local — skipping"
    else
      cp .env.local .env.local.bak-$(date +%Y%m%d%H%M%S)
      comment_keys .env.local SUPABASE_SERVICE_ROLE_KEY
      cat >> .env.local <<EOF

$BEGIN
# Website-DB clients point at the local Supabase stack.
# NEXT_PUBLIC_MOBILE_* untouched: learner auth still uses the real
# mobile project, so you sign in with your normal SkyBall account.
NEXT_PUBLIC_WEBSITE_SUPABASE_URL=$LOCAL_URL
NEXT_PUBLIC_WEBSITE_SUPABASE_ANON_KEY=$LOCAL_ANON
SUPABASE_SERVICE_ROLE_KEY=$LOCAL_SERVICE
$END
EOF
      echo "  .env.local → LOCAL"
    fi

    # ── admin app: fully env-driven ────────────────────────────────
    if is_local admin/.env.local; then
      echo "  admin/.env.local already local — skipping"
    else
      cp admin/.env.local admin/.env.local.bak-$(date +%Y%m%d%H%M%S)
      comment_keys admin/.env.local NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY
      cat >> admin/.env.local <<EOF

$BEGIN
# Admin auth + data both come from the local stack.
# Log in as admin@local.test / localadmin
NEXT_PUBLIC_SUPABASE_URL=$LOCAL_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$LOCAL_ANON
SUPABASE_SERVICE_ROLE_KEY=$LOCAL_SERVICE
$END
EOF
      echo "  admin/.env.local → LOCAL"
    fi

    echo ""
    echo "⚠️  RESTART both dev servers — Next.js only reads .env at boot."
    echo "   Admin login: admin@local.test / localadmin"
    echo "   Sign out of admin first if you still hold a production session."
    ;;

  prod)
    for f in .env.local admin/.env.local; do
      if is_local "$f"; then
        strip_block "$f"
        uncomment_keys "$f"
        echo "  $f → PRODUCTION"
      else
        echo "  $f already production — skipping"
      fi
    done
    echo ""
    echo "⚠️  RESTART both dev servers."
    ;;

  *)
    echo "usage: $0 [status|local|prod]"; exit 1 ;;
esac
