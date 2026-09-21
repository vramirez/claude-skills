---
name: ralph-loop
description: Start a Ralph Loop for iterative self-referential development. Use when the user asks to run a ralph loop, start an iterative loop, or wants repeated autonomous iteration on a task until completion.
---

# Ralph Loop

## Trigger

The user wants to start a Ralph loop. An iterative development loop where the same prompt is fed back after every turn, and the agent sees its own previous work each iteration.

## Workflow

1. Gather the user's task prompt and optional parameters:
   - `max_iterations` (number, default 0 for unlimited)
   - `completion_promise` (text, or "null" if not set)

2. Create the directory `.claude/ralph/` if it doesn't exist, then write the state file at `.claude/ralph/scratchpad.md` with this exact format:

   ```markdown
   ---
   iteration: 1
   max_iterations: <N or 0>
   completion_promise: "<TEXT>" or null
   session_id:
   blocks: 0
   ---

   <the user's task prompt goes here>
   ```

   Leave `session_id` empty and `blocks` at 0. The stop hook fills both: it
   binds the loop to the first session that reaches it, so a second session in
   the same project cannot drive this loop, and it tracks how many consecutive
   turns it has continued.

   Example:
   ```markdown
   ---
   iteration: 1
   max_iterations: 20
   completion_promise: "COMPLETE"
   session_id:
   blocks: 0
   ---

   Build a REST API for todos with CRUD operations, input validation, and tests.
   ```

3. Confirm to the user that the Ralph loop is active, then begin working on the task.

4. The stop hook automatically intercepts each turn end and feeds the same prompt back as the next turn. You will see it prefixed with `[Ralph loop iteration N.]`.

5. Tell the user how far the loop runs unattended. Claude Code force-ends a turn after `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` consecutive stop-hook continuations (default 8), so the loop pauses there and says so. Any message resumes it with the iteration count intact. Setting `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` to 0 in the `env` block of `settings.json` removes the pause. Do not promise more unattended iterations than the cap allows.

## Guardrails

- If a completion promise is set, you may ONLY output `<promise>TEXT</promise>` when the statement is completely and genuinely true.
- Do not output false promises to escape the loop.
- Always recommend setting `max_iterations` as a safety net.
- A `max_iterations` above the block cap does not run unattended to the end. Say where it will pause.
- Quote the `completion_promise` value in the YAML frontmatter if it contains special characters.

## Output

Confirm the loop is active (prompt, iteration limit, promise if set), then start working on the task immediately.
