#!/bin/bash

# Ralph Loop Stop hook.
# When Claude finishes a turn, this hook decides whether to feed the
# same prompt back for another iteration or let the session end.
#
# Claude Code Stop hook API:
#   Input:  { "session_id", "transcript_path", "last_assistant_message", "stop_hook_active", ...common }
#   Output: { "decision": "block", "reason": "<text>" } to continue, or exit 0 with no output to stop

set -euo pipefail

HOOK_INPUT=$(cat)

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
STATE_FILE="$PROJECT_DIR/.claude/ralph/scratchpad.md"

# No active loop. Let the session end.
if [[ ! -f "$STATE_FILE" ]]; then
  exit 0
fi

# Parse state file frontmatter
FRONTMATTER=$(sed -n '/^---$/,/^---$/{ /^---$/d; p; }' "$STATE_FILE")
ITERATION=$(echo "$FRONTMATTER" | grep '^iteration:' | sed 's/iteration: *//')
MAX_ITERATIONS=$(echo "$FRONTMATTER" | grep '^max_iterations:' | sed 's/max_iterations: *//')
COMPLETION_PROMISE=$(echo "$FRONTMATTER" | grep '^completion_promise:' | sed 's/completion_promise: *//' | sed 's/^"\(.*\)"$/\1/')
STATE_SESSION=$(echo "$FRONTMATTER" | grep '^session_id:' | sed 's/session_id: *//' || true)

# The state file is project-scoped but the Stop hook fires in every session in
# the project. Only the session that started the loop may drive it.
HOOK_SESSION=$(jq -r '.session_id // ""' <<< "$HOOK_INPUT")
if [[ -n "$STATE_SESSION" ]] && [[ "$STATE_SESSION" != "$HOOK_SESSION" ]]; then
  exit 0
fi

# Validate iteration is numeric
if [[ ! "$ITERATION" =~ ^[0-9]+$ ]]; then
  echo "Ralph loop: state file corrupted (iteration: '$ITERATION'). Stopping." >&2
  rm -f "$STATE_FILE"
  exit 0
fi

if [[ ! "$MAX_ITERATIONS" =~ ^[0-9]+$ ]]; then
  echo "Ralph loop: state file corrupted (max_iterations: '$MAX_ITERATIONS'). Stopping." >&2
  rm -f "$STATE_FILE"
  exit 0
fi

# Check for the completion promise in the last assistant message
if [[ "$COMPLETION_PROMISE" != "null" ]] && [[ -n "$COMPLETION_PROMISE" ]]; then
  RESPONSE_TEXT=$(jq -r '.last_assistant_message // empty' <<< "$HOOK_INPUT")
  PROMISE_TEXT=$(echo "$RESPONSE_TEXT" | perl -0777 -pe 's/.*?<promise>(.*?)<\/promise>.*/$1/s; s/^\s+|\s+$//g; s/\s+/ /g' 2>/dev/null || echo "")
  if [[ -n "$PROMISE_TEXT" ]] && [[ "$PROMISE_TEXT" = "$COMPLETION_PROMISE" ]]; then
    echo "Ralph loop: completion promise fulfilled at iteration $ITERATION." >&2
    rm -f "$STATE_FILE"
    exit 0
  fi
fi

# Check max iterations
if [[ $MAX_ITERATIONS -gt 0 ]] && [[ $ITERATION -ge $MAX_ITERATIONS ]]; then
  echo "Ralph loop: max iterations ($MAX_ITERATIONS) reached." >&2
  rm -f "$STATE_FILE"
  exit 0
fi

# Extract prompt text (everything after the closing --- in frontmatter)
PROMPT_TEXT=$(awk '/^---$/{i++; next} i>=2' "$STATE_FILE")

if [[ -z "$PROMPT_TEXT" ]]; then
  echo "Ralph loop: no prompt text found in state file. Stopping." >&2
  rm -f "$STATE_FILE"
  exit 0
fi

# Increment iteration
NEXT_ITERATION=$((ITERATION + 1))
TEMP_FILE="${STATE_FILE}.tmp.$$"
sed "s/^iteration: .*/iteration: $NEXT_ITERATION/" "$STATE_FILE" > "$TEMP_FILE"
mv "$TEMP_FILE" "$STATE_FILE"

# Build the followup message: iteration context + original prompt
if [[ "$COMPLETION_PROMISE" != "null" ]] && [[ -n "$COMPLETION_PROMISE" ]]; then
  HEADER="[Ralph loop iteration $NEXT_ITERATION. To complete: output <promise>$COMPLETION_PROMISE</promise> ONLY when genuinely true.]"
else
  HEADER="[Ralph loop iteration $NEXT_ITERATION.]"
fi

FOLLOWUP="$HEADER

$PROMPT_TEXT"

# Block the stop and feed the prompt back to continue the loop
jq -n --arg msg "$FOLLOWUP" --arg sys "Ralph loop iteration $NEXT_ITERATION" '{"decision": "block", "reason": $msg, "systemMessage": $sys}'

exit 0
