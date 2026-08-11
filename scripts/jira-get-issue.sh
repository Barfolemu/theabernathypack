#!/usr/bin/env bash
# Fetch a Jira issue's summary, description, comments, and labels as raw JSON.
#
# Usage: jira-get-issue.sh ISSUE-123
#
# Prints raw JSON to stdout - the caller (Claude) reads it directly rather
# than this script trying to convert Atlassian Document Format to plain
# text, which would be a lot of brittle bash for something a model can
# just parse itself.
#
# Requires JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN in the environment.

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 ISSUE-KEY" >&2
  exit 1
fi

ISSUE_KEY="$1"

for var in JIRA_BASE_URL JIRA_EMAIL JIRA_API_TOKEN; do
  if [ -z "${!var:-}" ]; then
    echo "Missing required environment variable: $var" >&2
    exit 1
  fi
done

HTTP_STATUS=$(curl -s -o /tmp/jira-issue-response.json -w "%{http_code}" \
  -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
  -H "Content-Type: application/json" \
  "${JIRA_BASE_URL}/rest/api/3/issue/${ISSUE_KEY}?fields=summary,description,comment,labels")

if [ "$HTTP_STATUS" -ge 300 ]; then
  echo "Jira issue fetch failed (HTTP $HTTP_STATUS):" >&2
  cat /tmp/jira-issue-response.json >&2
  exit 1
fi

cat /tmp/jira-issue-response.json
