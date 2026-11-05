---
name: setup-pstack
description: Configure which Claude models pstack uses per role and at what effort budget. Detects your available models and writes an always-applied rule that overrides the skill defaults. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
---

# Setup pstack

Write `~/.claude/rules/pstack-models.md`, an always-applied rule that sets pstack's model and effort per role. Claude Code loads every `.md` file in `~/.claude/rules/` into each new session. Never put the role lines in `CLAUDE.md` or `AGENTS.md`.

## Steps

### 1. Detect available models

The detected models are the `model` values the `Agent` tool schema lists in this session (`opus`, `sonnet`, `haiku`, `fable`, or a subset), and the detected efforts are its `effort` values (`low`, `medium`, `high`, `xhigh`, `max`, or a subset). That schema is the dependable source. A real value is `<model> <effort>`, such as `opus xhigh`, or a bare `<model>`. The effort is the last token. Never write a model or effort the schema does not list. The alias `inherit-parent` is always valid even though it is not a detected model. It runs the role on the parent chat model, so the Agent call omits `model` and passes only the effort.

### 2. Load current state

The default role-to-model mapping is the rule shape shown in step 5 below. If `~/.claude/rules/pstack-models.md` already exists, read it and treat its `# budget` line and its role values as the current choices. Otherwise start from those defaults. Ignore any frontmatter an older version wrote. A line whose role is not in step 5, such as `how critics`, is from a retired role. Drop it.

A file from an older version may have no `# budget` line and model-only values such as `opus`. It is still valid. A value with no effort and no budget line starts at `xhigh`. Treat it as the current choices with no recorded budget.

### 3. Budget, map, and confirm

**(a) Ask for a budget.** Prefer AskUserQuestion over free text. Offer these four options with these exact labels, and name the current budget when the rule records one. With no rule, or a rule with no `# budget` line, say that `large` matches the skill defaults.

- `unlimited — max effort`
- `large — xhigh effort`
- `medium — high effort`
- `small — medium effort`

**(b) Apply it.** Build the working table from the skill defaults, and on a re-run keep any role you changed by model, list, or alias (`inherit-parent`). `unlimited`, `large`, `medium`, and `small` set the effort of every real value, panel entries included, to `max`, `xhigh`, `high`, or `medium`. A bare `<model>` gets the effort added. The ladder is `max` > `xhigh` > `high` > `medium` > `low`. If the target effort is not detected, use the highest detected effort below it, else mark the role as needing a choice. `inherit-parent` does not change, and its effort comes from the budget line. So `unlimited` turns `opus xhigh` into `opus max`, `large` keeps the defaults, and `small` turns `opus xhigh` and `sonnet xhigh` into `opus medium` and `sonnet medium`.

**(c) Show the roles and confirm.** Show every role with its value, marking any model or effort not in the detected set as needing a choice. Also list each line step 2 dropped. Ask whether to accept as-is or change specific roles. For each role to change, ask for the model, from the detected models plus `inherit-parent` (this role runs on the parent chat model), then for the effort, from the detected efforts. Prefer AskUserQuestion over free text. It shows at most four options per question and always adds a free-text answer, so list the likeliest four and take the rest as text. For panel roles (arena runners, architect runners, interrogate reviewers) the value is a list, and one subagent runs per entry, alias entries included, so the list length sets the count. `arena cross-judge pool` is also a list, but Arena runs one judge. It tries only values on a model other than the parent's, in list order, so order it by preference. An `inherit-parent` value never judges. `swarm workers` is the default model for every worker unless a race or comparison assigns another model per arm.

### 4. Validate

Every model and effort written must be in the detected set. `inherit-parent` always passes. If a chosen value is not available, stop and ask again.

### 5. Write the rule

Write `~/.claude/rules/pstack-models.md` with no frontmatter: the comment lines, a `# budget` line with the chosen label and its target effort, and one line per role, using the same labels poteto-mode uses. Overwrite the whole file so re-runs stay idempotent. Shape, with the `large` budget:

```
# pstack model configuration. One line per role. Delete a line to fall back to the skill default.
# A value is `<model> <effort>`, `<model>`, or `inherit-parent`. A value with no effort starts at the budget's effort.
# `inherit-parent` as a value: the role runs on the parent chat model (omit Agent `model`). Alias entries in a panel list still count toward its fan-out.
# budget: large (xhigh)
feature, refactoring: sonnet xhigh
bug-fix: sonnet xhigh
perf-issue: sonnet xhigh
hillclimb: sonnet xhigh
judgment and prose: opus xhigh
hardest tasks: opus xhigh
how explorer: sonnet xhigh
how explainer: opus xhigh
why investigators: sonnet xhigh
why synthesizer: opus xhigh
reflect tooling: sonnet xhigh
reflect judgment, divergent, synthesizer: opus xhigh
arena runners: fable xhigh, opus xhigh, sonnet xhigh
arena cross-judge pool: fable xhigh, opus xhigh, sonnet xhigh
swarm workers: sonnet xhigh
architect runners: fable xhigh, opus xhigh, sonnet xhigh
interrogate reviewers: fable xhigh, opus xhigh, sonnet xhigh
```

### 6. Confirm

Tell the user the rule was written and that it applies to new sessions. Re-running this skill updates it.

### 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /pstack:create-verification-skill." On yes, read the **create-verification-skill** skill's `SKILL.md` from the pstack plugin and follow it. On no, move on without pushing.

### 8. Offer a formal verification skill (optional)

Check whether the project already has a formal verification skill (a project skill that runs a model checker, a proof, or another verifier against the code). If not, offer once: "want a formal verification skill, so agents can prove a key property of your code holds in every case in scope, not only the cases tests reach? I can generate one with /pstack:create-formal-verification-skill." On yes, read the **create-formal-verification-skill** skill's `SKILL.md` from the pstack plugin and follow it. On no, move on without pushing.
