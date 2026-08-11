#!/usr/bin/env bash
# Transition a Jira issue to an available target status by name.
# Usage: jira-transition.sh KAN-123 "Target Status"

set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 ISSUE-KEY \"Target Status Name\"" >&2
  exit 1
fi

ISSUE_KEY="$1"
TARGET_STATUS="$2"

for var in JIRA_BASE_URL JIRA_EMAIL JIRA_API_TOKEN; do
  if [ -z "${!var:-}" ]; then
    echo "Missing required environment variable: $var" >&2
    exit 1
  fi
done

HTTP_STATUS=$(curl -s -o /tmp/jira-transitions-response.json -w "%{http_code}" \
  -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
  -H "Accept: application/json" \
  "${JIRA_BASE_URL}/rest/api/3/issue/${ISSUE_KEY}/transitions")

if [ "$HTTP_STATUS" -ge 300 ]; then
  echo "Fetching Jira transitions failed (HTTP $HTTP_STATUS):" >&2
  cat /tmp/jira-transitions-response.json >&2
  exit 1
fi

TRANSITION_ID=$(jq -r --arg name "$TARGET_STATUS" \
  '.transitions[] | select(.to.name | ascii_downcase == ($name | ascii_downcase)) | .id' \
  /tmp/jira-transitions-response.json | head -n1)

if [ -z "$TRANSITION_ID" ]; then
  echo "No transition to '${TARGET_STATUS}' is available from ${ISSUE_KEY}'s current status." >&2
  echo "Available transitions from here:" >&2
  jq -r '.transitions[] | "  - " + .to.name' /tmp/jira-transitions-response.json >&2
  exit 1
fi

BODY=$(jq -n --arg id "$TRANSITION_ID" '{transition: {id: $id}}')

HTTP_STATUS=$(curl -s -o /tmp/jira-transition-response.json -w "%{http_code}" -X POST \
  -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  "${JIRA_BASE_URL}/rest/api/3/issue/${ISSUE_KEY}/transitions" \
  -d "$BODY")

if [ "$HTTP_STATUS" -ge 300 ]; then
  echo "Jira transition failed (HTTP $HTTP_STATUS):" >&2
  cat /tmp/jira-transition-response.json >&2
  exit 1
fi

echo "Transitioned ${ISSUE_KEY} to '${TARGET_STATUS}'"
