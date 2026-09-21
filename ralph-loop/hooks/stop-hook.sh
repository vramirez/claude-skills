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

# Set a frontmatter field, inserting it when an older state file lacks it.
# Confined to the frontmatter so a prompt body line cannot be rewritten.
set_field() {
  local key="$1" value="$2" tmp="${STATE_FILE}.tmp.$$"
  awk -v key="$key" -v value="$value" '
    /^---$/ {
      fm++
      if (fm == 2 && !done) { print key ": " value; done = 1 }
      print; next
    }
    fm == 1 && $0 ~ ("^" key ":") {
      if (!done) { print key ": " value; done = 1 }
      next
    }
    { print }
  ' "$STATE_FILE" > "$tmp"
  mv "$tmp" "$STATE_FILE"
}

# Every assistant text block in the transcript, oldest first. Thinking blocks
# are excluded: reasoning about the promise is not the same as emitting it.
transcript_assistant_text() {
  jq -r 'select(.type == "assistant")
         | .message.content
         | if type == "array" then (map(select(.type == "text") | .text // "") | join("\n"))
           elif type == "string" then .
           else "" end' "$1" 2>/dev/null || true
}

# True when any <promise> tag in the text equals the completion promise.
promise_matched() {
  local text="$1"
  [[ -n "$text" ]] || return 1
  printf '%s' "$text" \
    | perl -0777 -ne 'while (/<promise>(.*?)<\/promise>/gs) { my $p = $1; $p =~ s/^\s+|\s+$//g; $p =~ s/\s+/ /g; print "$p\n" }' \
    | grep -Fxq -- "$COMPLETION_PROMISE"
}

# Parse state file frontmatter
FRONTMATTER=$(sed -n '/^---$/,/^---$/{ /^---$/d; p; }' "$STATE_FILE")
ITERATION=$(echo "$FRONTMATTER" | grep '^iteration:' | sed 's/iteration: *//')
MAX_ITERATIONS=$(echo "$FRONTMATTER" | grep '^max_iterations:' | sed 's/max_iterations: *//')
COMPLETION_PROMISE=$(echo "$FRONTMATTER" | grep '^completion_promise:' | sed 's/completion_promise: *//' | sed 's/^"\(.*\)"$/\1/')
STATE_SESSION=$(echo "$FRONTMATTER" | grep '^session_id:' | sed 's/session_id: *//' || true)
BLOCKS=$(echo "$FRONTMATTER" | grep '^blocks:' | sed 's/blocks: *//' || true)

# The state file is project-scoped but the Stop hook fires in every session in
# the project. Bind the loop to the first session that reaches this hook (the
# one that ran the skill, since its turn ends first) and let only that session
# drive it. The skill cannot write the id itself: it has no way to read it.
HOOK_SESSION=$(jq -r '.session_id // ""' <<< "$HOOK_INPUT")
if [[ -z "$STATE_SESSION" ]]; then
  if [[ -n "$HOOK_SESSION" ]]; then
    set_field session_id "$HOOK_SESSION"
  fi
elif [[ "$STATE_SESSION" != "$HOOK_SESSION" ]]; then
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

# Check for the completion promise anywhere in the turn, not only in the final
# message: a promise followed by a summary or sign-off still ends the loop.
if [[ "$COMPLETION_PROMISE" != "null" ]] && [[ -n "$COMPLETION_PROMISE" ]]; then
  TRANSCRIPT=$(jq -r '.transcript_path // empty' <<< "$HOOK_INPUT")
  RESPONSE_TEXT=""
  if [[ -n "$TRANSCRIPT" ]] && [[ -f "$TRANSCRIPT" ]]; then
    RESPONSE_TEXT=$(transcript_assistant_text "$TRANSCRIPT")
  fi
  if [[ -z "$RESPONSE_TEXT" ]]; then
    RESPONSE_TEXT=$(jq -r '.last_assistant_message // empty' <<< "$HOOK_INPUT")
  fi
  if promise_matched "$RESPONSE_TEXT"; then
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

# Claude Code force-ends the turn after CLAUDE_CODE_STOP_HOOK_BLOCK_CAP
# consecutive stop-hook blocks (default 8, 0 disables the cap). Track the chain
# and pause on our own terms rather than being overridden mid-loop with no
# explanation. A turn the user started resets the chain.
[[ "$BLOCKS" =~ ^[0-9]+$ ]] || BLOCKS=0
if [[ "$(jq -r 'if .stop_hook_active == true then "true" else "false" end' <<< "$HOOK_INPUT")" != "true" ]]; then
  BLOCKS=0
fi

BLOCK_CAP="${CLAUDE_CODE_STOP_HOOK_BLOCK_CAP:-8}"
[[ "$BLOCK_CAP" =~ ^-?[0-9]+$ ]] || BLOCK_CAP=8
if (( BLOCK_CAP > 0 )) && (( BLOCKS >= BLOCK_CAP )); then
  PAUSE_MSG="Ralph loop paused at iteration $ITERATION: hit Claude Code's cap of $BLOCK_CAP consecutive stop-hook continuations. The loop state is kept, so any message resumes it. To run unbounded, set CLAUDE_CODE_STOP_HOOK_BLOCK_CAP=0 in the env block of your settings.json."
  echo "$PAUSE_MSG" >&2
  set_field blocks 0
  jq -n --arg msg "$PAUSE_MSG" '{"systemMessage": $msg}'
  exit 0
fi

# Extract prompt text (everything after the closing --- in frontmatter)
PROMPT_TEXT=$(awk '/^---$/{i++; next} i>=2' "$STATE_FILE")

if [[ -z "$PROMPT_TEXT" ]]; then
  echo "Ralph loop: no prompt text found in state file. Stopping." >&2
  rm -f "$STATE_FILE"
  exit 0
fi

# Increment iteration and the consecutive-block chain
NEXT_ITERATION=$((ITERATION + 1))
set_field iteration "$NEXT_ITERATION"
set_field blocks "$((BLOCKS + 1))"

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
