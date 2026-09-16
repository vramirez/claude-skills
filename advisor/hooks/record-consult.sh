#!/bin/bash

# SubagentStop hook for Advisor (matcher: the `advisor-subagent` agent).
# Counts the consult, clears the pending-edits marker, and appends the advice
# to .claude/advisor/log.md so the user can review it later.
#
# Input:  { "agent_type": "advisor-subagent", "agent_id": "...",
#           "last_assistant_message": "...", ...common }
# Output: none

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

HOOK_INPUT=$(cat)

advisor_require_enabled
advisor_bind_session "$HOOK_INPUT" || exit 0

AGENT_TYPE=$(jq -r '.agent_type // empty' <<< "$HOOK_INPUT")
case "$AGENT_TYPE" in
  advisor-subagent|*:advisor-subagent) ;;
  *) exit 0 ;;
esac

NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
advisor_state_update '.consults = ((.consults // 0) + 1) | .last_consult_at = $now' --arg now "$NOW"
rm -f "$PENDING_FILE"

SUMMARY=$(jq -r '.last_assistant_message // empty' <<< "$HOOK_INPUT" | head -c 6000)
{
  printf '## %s\n\n' "$NOW"
  if [[ -n "$SUMMARY" ]]; then
    printf '%s\n\n' "$SUMMARY"
  else
    printf '_No summary captured._\n\n'
  fi
} >> "$LOG_FILE"

exit 0
