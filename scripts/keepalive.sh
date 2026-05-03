#!/usr/bin/env bash
# =============================================================================
# Render Free Tier Keepalive — Pings the server health endpoint every 5 minutes
# to prevent Render from spinning down due to inactivity.
#
# Usage:
#   chmod +x scripts/keepalive.sh
#   ./scripts/keepalive.sh https://hospital-management-l5lc.onrender.com
#
# Or set up a cron job:
#   */5 * * * * /path/to/scripts/keepalive.sh https://hospital-management-l5lc.onrender.com >> /tmp/keepalive.log 2>&1
# =============================================================================

set -euo pipefail

BASE_URL="${1:-https://hospital-management-l5lc.onrender.com}"
HEALTH_URL="${BASE_URL}/api/health"

response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HEALTH_URL" 2>/dev/null || echo "000")

if [ "$response" = "200" ]; then
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Health check OK (${response})"
else
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Health check FAILED (${response})"
fi
