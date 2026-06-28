#!/usr/bin/env bash
#
# verify.sh — smoke-test the live deployment.
#
# Distills the manual post-deploy checks: the API health endpoint (direct),
# the frontend proxy health endpoint, and the API TLS certificate expiry.
#
# Override via environment variables:
#   FANWATCH_API_URL       Direct API base   (default: https://api.tuparea.com)
#   FANWATCH_SITE_URL      Frontend base     (default: https://tuparea.com)
#   FANWATCH_AUTH_TOKEN    Optional Supabase JWT; when set, also checks /cities
#
# Usage: scripts/verify.sh
set -euo pipefail

API_URL="${FANWATCH_API_URL:-https://api.tuparea.com}"
SITE_URL="${FANWATCH_SITE_URL:-https://tuparea.com}"
fail=0

check() {
  local label="$1" url="$2" expect="$3" got
  got="$(curl -fsS -m 15 "$url" 2>/dev/null || true)"
  if [[ "$got" == *"$expect"* ]]; then
    echo "  ok   $label -> $url"
  else
    echo "  FAIL $label -> $url (expected '$expect', got '${got:-<no response>}')"
    fail=1
  fi
}

echo "==> Health checks"
check "API health (direct)"   "$API_URL/health"     '"ok":true'
check "Frontend proxy health" "$SITE_URL/_api/health" '"ok":true'

if [[ -n "${FANWATCH_AUTH_TOKEN:-}" ]]; then
  echo "==> Authenticated check"
  code="$(curl -fsS -m 15 -o /dev/null -w '%{http_code}' \
    -H "X-Supabase-Auth: $FANWATCH_AUTH_TOKEN" "$API_URL/cities" 2>/dev/null || true)"
  if [[ "$code" == "200" ]]; then
    echo "  ok   /cities -> 200"
  else
    echo "  FAIL /cities -> $code"
    fail=1
  fi
fi

echo "==> TLS certificate expiry"
host="${API_URL#https://}"; host="${host%%/*}"
if expiry="$(echo | openssl s_client -servername "$host" -connect "$host:443" 2>/dev/null \
    | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)"; then
  echo "  $host expires: ${expiry:-unknown}"
else
  echo "  could not read TLS cert for $host"
fi

if [[ "$fail" -ne 0 ]]; then
  echo "==> FAILED"
  exit 1
fi
echo "==> All checks passed"
