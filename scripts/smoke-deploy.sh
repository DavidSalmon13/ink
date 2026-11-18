#!/usr/bin/env bash
# Smoke test for a deploy (deploy-pipeline AC10):
#   scripts/smoke-deploy.sh <api-url> <web-url>
#   scripts/smoke-deploy.sh https://ink-api.up.railway.app https://ink-web.up.railway.app
#   scripts/smoke-deploy.sh http://localhost:8080 http://localhost:8081   # docker-compose.prod.yml
# Checks: API health + db, CORS (allowed origin passes with Authorization, unknown origin is rejected),
# web root and deep routes return HTML, and the web bundle points at this API.
# Exits non-zero if any check fails. Needs bash and curl only.
set -uo pipefail

if [ $# -ne 2 ]; then
  echo "usage: $0 <api-url> <web-url>" >&2
  exit 2
fi
API="${1%/}"
WEB="${2%/}"
ORIGIN="$(printf '%s' "$WEB" | sed -E 's#^(https?://[^/]+).*#\1#')"
EVIL_ORIGIN="https://not-allowed.example.com"
CURL=(curl -sS --max-time 20)
failures=0

if [ -t 1 ]; then GREEN=$'\033[32m' RED=$'\033[31m' RESET=$'\033[0m'; else GREEN='' RED='' RESET=''; fi
pass() { printf '  %s✓%s %s\n' "$GREEN" "$RESET" "$1"; }
fail() { printf '  %s✗%s %s\n' "$RED" "$RESET" "$1"; failures=$((failures + 1)); }
# check <label> <detail-on-failure> <command...>: runs the command; passes if it succeeds.
check() { local label="$1" detail="$2"; shift 2; if "$@"; then pass "$label"; else fail "$label — $detail"; fi; }

# header <file> <name>: value of a response header (case-insensitive), trimmed.
header() { grep -i "^$2:" "$1" | tail -1 | cut -d: -f2- | tr -d '\r' | sed -E 's/^ +//'; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "API $API"
status="$("${CURL[@]}" -o "$tmp/health" -w '%{http_code}' "$API/health")"
body="$(cat "$tmp/health" 2>/dev/null || true)"
check "GET /health → 200" "got $status" [ "$status" = 200 ]
check "/health reports db UP" "$body" grep -Eq '"db":\{"status":"UP"' "$tmp/health"

"${CURL[@]}" -o /dev/null -D "$tmp/h1" -H "Origin: $ORIGIN" "$API/health"
acao="$(header "$tmp/h1" Access-Control-Allow-Origin)"
check "/health allows origin $ORIGIN" "Access-Control-Allow-Origin: ${acao:-none}" [ "$acao" = "$ORIGIN" ]

status="$("${CURL[@]}" -o /dev/null -D "$tmp/h2" -w '%{http_code}' -X OPTIONS "$API/settings" \
  -H "Origin: $ORIGIN" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: authorization")"
preflight_ok() {
  [ "$status" = 200 ] && [ "$(header "$tmp/h2" Access-Control-Allow-Origin)" = "$ORIGIN" ] \
    && header "$tmp/h2" Access-Control-Allow-Headers | grep -qi authorization
}
check "CORS preflight /settings with Authorization from $ORIGIN → 200 + ACAO" "got $status" preflight_ok

status="$("${CURL[@]}" -o /dev/null -D "$tmp/h3" -w '%{http_code}' -X OPTIONS "$API/settings" \
  -H "Origin: $EVIL_ORIGIN" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: authorization")"
rejected() { [ "$status" = 403 ] && [ -z "$(header "$tmp/h3" Access-Control-Allow-Origin)" ]; }
check "CORS preflight from an unknown origin → 403" "got $status" rejected

echo "Web $WEB"
is_html() { [ "$status" = 200 ] && [[ "$ctype" == text/html* ]]; }
for path in / /settings /clients; do
  read -r status ctype < <("${CURL[@]}" -o "$tmp/page" -w '%{http_code} %{content_type}\n' "$WEB$path")
  check "GET $path → 200 HTML" "got $status $ctype" is_html
done
# An unknown deep route (e.g. a refresh on a dynamic URL) falls back to the app shell.
read -r status ctype < <("${CURL[@]}" -o /dev/null -w '%{http_code} %{content_type}\n' "$WEB/clients/smoke-deep-link")
check "GET /clients/smoke-deep-link → 200 HTML (fallback)" "got $status $ctype" is_html

baked=1
if "${CURL[@]}" -o "$tmp/index" "$WEB/" 2>/dev/null; then
  while read -r bundle; do
    # Download first: piping into grep -q would SIGPIPE curl and, with pipefail, read as a miss.
    if "${CURL[@]}" -o "$tmp/bundle.js" "$WEB$bundle" && grep -qF "$API" "$tmp/bundle.js"; then
      baked=0
      break
    fi
  done < <(grep -oE '/_expo/static/js/web/[^"]+\.js' "$tmp/index" | sort -u)
fi
check "web bundle is built against $API" "EXPO_PUBLIC_API_URL not baked into any entry bundle" [ "$baked" = 0 ]

echo
if [ "$failures" -eq 0 ]; then
  echo "Smoke test passed."
else
  echo "Smoke test FAILED ($failures check(s))."
  exit 1
fi
