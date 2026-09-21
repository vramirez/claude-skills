#!/bin/bash

# Stop hook for Advisor.
# If files changed since the last advisor consult and the turn ended without one,
# ask the agent (once per batch of edits) to run the pre-completion consult.
#
# Input:  { "session_id", "transcript_path", "last_assistant_message", "stop_hook_active", ...common }
# Output: { "decision": "block", "reason": "<text>" } to continue, or exit 0 with no output

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

# Bound on consecutive nudges, as the Cursor `stop` hook's loop_limit did.
# Without it the chain runs to Claude Code's own cap
# (CLAUDE_CODE_STOP_HOOK_BLOCK_CAP, default 8) and the turn is force-ended by
# the harness rather than by this plugin's logic.
NUDGE_CHAIN_LIMIT=3

HOOK_INPUT=$(cat)

advisor_require_enabled
advisor_bind_session "$HOOK_INPUT" || exit 0

NUDGE=$(jq -r 'if .nudge == false then "false" else "true" end' "$STATE_FILE")
if [[ "$NUDGE" != "true" ]]; then
  exit 0
fi

# A turn that ended on its own starts a fresh chain. One that ended inside a
# hook-driven continuation extends the chain this hook already started.
NUDGE_CHAIN=$(jq -r '.nudge_chain // 0' "$STATE_FILE")
if [[ "$(jq -r 'if .stop_hook_active == true then "true" else "false" end' <<< "$HOOK_INPUT")" != "true" ]]; then
  if [[ "$NUDGE_CHAIN" != "0" ]]; then
    advisor_state_update '.nudge_chain = 0'
  fi
  NUDGE_CHAIN=0
fi

if [[ ! -f "$PENDING_FILE" ]]; then
  exit 0
fi

if (( NUDGE_CHAIN >= NUDGE_CHAIN_LIMIT )); then
  echo "Advisor: $NUDGE_CHAIN consecutive nudges without a consult. Letting the turn end." >&2
  exit 0
fi

# The agent stopped to ask the user something. Stay quiet and leave the marker
# armed so the reminder fires after the user answers and the work resumes.
LAST_CHAR=$(jq -r '.last_assistant_message // empty' <<< "$HOOK_INPUT" | tr -d '[:space:]' | tail -c 1)
if [[ "$LAST_CHAR" == "?" ]]; then
  exit 0
fi

rm -f "$PENDING_FILE"
advisor_state_update '.nudge_chain = $n' --argjson n "$((NUDGE_CHAIN + 1))"

MODEL=$(jq -r '.model // "the configured advisor model"' "$STATE_FILE")
MESSAGE="[Advisor] Files changed since the last advisor consult and the turn ended without one. If this work is done, or you were about to declare it done, run the pre-completion consult now per the advisor skill: build the briefing, spawn the \`advisor-subagent\` subagent (model: $MODEL), act on the verdict, and report it in one line. If the change was trivial, or you are waiting on the user, say so in one line and stop."

jq -n --arg msg "$MESSAGE" '{"decision": "block", "reason": $msg}'
exit 0
