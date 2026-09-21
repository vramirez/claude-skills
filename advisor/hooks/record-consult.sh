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

# SubagentStop carries no status field, so a non-empty final message is the
# only available signal that the consult actually produced a verdict. An
# interrupted or errored subagent must not count as a consult and must not
# clear the pending marker: leaving the marker armed lets the Stop hook nudge
# again for a real consult, instead of shipping the edits unreviewed while
# `/advisor status` reports a consult that never happened.
SUMMARY=$(jq -r '.last_assistant_message // empty' <<< "$HOOK_INPUT" | head -c 6000)
if [[ -z "${SUMMARY//[[:space:]]/}" ]]; then
  echo "Advisor: subagent stopped without a verdict. Not recording a consult." >&2
  exit 0
fi

NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
advisor_state_update '.consults = ((.consults // 0) + 1) | .last_consult_at = $now' --arg now "$NOW"
rm -f "$PENDING_FILE"

{
  printf '## %s\n\n' "$NOW"
  printf '%s\n\n' "$SUMMARY"
} >> "$LOG_FILE"

exit 0
