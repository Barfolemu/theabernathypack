#!/usr/bin/env bash
# Post a comment to a Jira issue.
#
# Usage: jira-comment.sh ISSUE-123 "comment body"
#
# Jira Cloud's v3 API requires comments in Atlassian Document Format (ADF)
# rather than plain text. This wraps the given text as ADF, splitting on
# blank lines into separate paragraph nodes so a multi-section comment
# (Verdict / Why this happens / etc.) still renders as readable paragraphs
# instead of one run-on block.
#
# Requires JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN in the environment.

set -euo pipefail

if [ $# -ne 2 ]; then
  echo "Usage: $0 ISSUE-KEY \"comment body\"" >&2
  exit 1
fi

ISSUE_KEY="$1"
BODY_TEXT="$2"

for var in JIRA_BASE_URL JIRA_EMAIL JIRA_API_TOKEN; do
  if [ -z "${!var:-}" ]; then
    echo "Missing required environment variable: $var" >&2
    exit 1
  fi
done

ADF_BODY=$(jq -n --arg text "$BODY_TEXT" '
  ($text | split("\n\n")) as $paras |
  {
    type: "doc",
    version: 1,
    content: [ $paras[] | select(length > 0) | { type: "paragraph", content: [ { type: "text", text: . } ] } ]
  }
')

HTTP_STATUS=$(curl -s -o /tmp/jira-comment-response.json -w "%{http_code}" -X POST \
  -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
  -H "Content-Type: application/json" \
  "${JIRA_BASE_URL}/rest/api/3/issue/${ISSUE_KEY}/comment" \
  -d "{\"body\": ${ADF_BODY}}")

if [ "$HTTP_STATUS" -ge 300 ]; then
  echo "Jira comment failed (HTTP $HTTP_STATUS):" >&2
  cat /tmp/jira-comment-response.json >&2
  exit 1
fi

echo "Commented on ${ISSUE_KEY}"
