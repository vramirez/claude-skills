#!/bin/bash

# Shared helpers for the Advisor hooks. Source this file; do not run it.
#
# State lives in $CLAUDE_PROJECT_DIR/.claude/advisor/:
#   state.json          written by the advisor skill, kept current here
#   pending             marker: files were edited since the last consult
#   log.md              one entry per completed consult

ADVISOR_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude/advisor"
STATE_FILE="$ADVISOR_DIR/state.json"
PENDING_FILE="$ADVISOR_DIR/pending"
LOG_FILE="$ADVISOR_DIR/log.md"

# Exit quietly unless advisor mode is on and jq is available.
advisor_require_enabled() {
  command -v jq >/dev/null 2>&1 || exit 0
  [[ -f "$STATE_FILE" ]] || exit 0
  [[ "$(jq -r '.enabled // false' "$STATE_FILE" 2>/dev/null)" == "true" ]] || exit 0
}

# Atomically apply a jq filter to state.json.
# Usage: advisor_state_update '<filter>' [jq args...]
advisor_state_update() {
  local filter="$1"
  shift
  local tmp="${STATE_FILE}.tmp.$$"
  if jq "$@" "$filter" "$STATE_FILE" > "$tmp" 2>/dev/null; then
    mv "$tmp" "$STATE_FILE"
  else
    rm -f "$tmp"
  fi
}

# Bind the state to the first session that touches it and keep transcript_path
# current. Returns 1 when the hook input belongs to a different session, so
# callers can stay out of sessions that did not enable the advisor.
# A fresh bind also drops per-session markers so a re-bind cannot inherit
# the previous session's pending edits.
advisor_bind_session() {
  local input="$1"
  local session bound transcript current
  session=$(jq -r '.session_id // empty' <<< "$input")
  bound=$(jq -r '.session_id // empty' "$STATE_FILE")
  if [[ -n "$session" ]]; then
    if [[ -z "$bound" ]]; then
      advisor_state_update '.session_id = $session' --arg session "$session"
      rm -f "$PENDING_FILE"
    elif [[ "$bound" != "$session" ]]; then
      return 1
    fi
  fi
  transcript=$(jq -r '.transcript_path // empty' <<< "$input")
  current=$(jq -r '.transcript_path // empty' "$STATE_FILE")
  if [[ -n "$transcript" && "$transcript" != "$current" ]]; then
    advisor_state_update '.transcript_path = $path' --arg path "$transcript"
  fi
  return 0
}
