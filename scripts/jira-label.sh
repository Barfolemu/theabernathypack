#!/usr/bin/env bash
# Add a label to a Jira issue.
#
# Usage: jira-label.sh ISSUE-123 claude-triaged
#
# Requires JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN in the environment.

set -euo pipefail

if [ $# -ne 2 ]; then
  echo "Usage: $0 ISSUE-KEY label-name" >&2
  exit 1
fi

ISSUE_KEY="$1"
LABEL="$2"

for var in JIRA_BASE_URL JIRA_EMAIL JIRA_API_TOKEN; do
  if [ -z "${!var:-}" ]; then
    echo "Missing required environment variable: $var" >&2
    exit 1
  fi
done

BODY=$(jq -n --arg label "$LABEL" '{ update: { labels: [ { add: $label } ] } }')

HTTP_STATUS=$(curl -s -o /tmp/jira-label-response.json -w "%{http_code}" -X PUT \
  -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
  -H "Content-Type: application/json" \
  "${JIRA_BASE_URL}/rest/api/3/issue/${ISSUE_KEY}" \
  -d "$BODY")

if [ "$HTTP_STATUS" -ge 300 ]; then
  echo "Jira label update failed (HTTP $HTTP_STATUS):" >&2
  cat /tmp/jira-label-response.json >&2
  exit 1
fi

echo "Added label '${LABEL}' to ${ISSUE_KEY}"
