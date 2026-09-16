---
name: create-plugin-scaffold
description: Create a new Claude Code plugin scaffold with a valid manifest, component directories, and marketplace wiring. Use when starting a new plugin or adding a plugin to a multi-plugin repository.
---

# Create plugin scaffold

## Trigger

You need to create a new Claude Code plugin from scratch and make it ready for local use or marketplace submission.

## Required Inputs

- Plugin name (lowercase kebab-case)
- Plugin purpose and target users
- Component set to include (`skills`, `agents`, `commands`, `hooks`, `mcpServers`)
- Repository style (`single-plugin` or `multi-plugin marketplace`)

## Output Location

By default, create the plugin inside a local marketplace directory the user can add with `/plugin marketplace add <path>`:

```
~/.claude/plugins/local/<plugin-name>/
```

If the user explicitly asks to create the plugin elsewhere (for example inside an existing repo or a specific directory), respect that choice instead. For quick iteration, the plugin can also be loaded directly with `claude --plugin-dir <path>`.

## Workflow

1. Validate plugin name format: lowercase kebab-case, starts and ends with an alphanumeric character.
2. Determine the target directory:
   - Default: `~/.claude/plugins/local/<plugin-name>/`
   - Override: use the path the user specifies, if any.
   - Create the directory (and parents) if it does not exist.
3. Create base files inside the target directory:
   - `.claude-plugin/plugin.json`
   - `README.md`
   - `LICENSE`
   - optional `CHANGELOG.md`
4. Populate `plugin.json`:
   - Required: `name`
   - Recommended: `version`, `description`, `author`, `license`, `keywords`, `homepage`, `repository`
   - Optional: `userConfig` for secrets or settings the plugin needs (each entry has `type`, `title`, `description`, and optional `sensitive`, `required`, `default`)
   - Add explicit component paths only when non-default discovery is needed.
5. Create component files with valid frontmatter:
   - Skills: `skills/<skill-name>/SKILL.md` with `name`, `description`; optional `disable-model-invocation`, `allowed-tools`, `paths`, `argument-hint`
   - Agents: `agents/*.md` with `name`, `description`; optional `model`, `tools`, `disallowedTools`, `background`, `effort`
   - Commands: `commands/*.md` with `description`; optional `argument-hint`, `allowed-tools`
   - Hooks: `hooks/hooks.json` with `hooks.<Event>[]` entries; reference scripts with `${CLAUDE_PLUGIN_ROOT}`
   - MCP servers: `.mcp.json` at the plugin root
6. If the repository uses `.claude-plugin/marketplace.json`, add a plugin entry:
   - `name`
   - `source` (relative path such as `./<plugin-name>`)
   - optional metadata (`description`, `category`, `tags`)
7. Ensure all manifest paths are relative, valid, and do not use absolute paths or parent traversal.
8. Run `claude plugin validate <plugin-dir> --strict` and fix every error and warning.

## Guardrails

- Keep the plugin focused on one use case.
- Prefer concise, actionable skill text over long prose.
- Do not reference files that do not exist.
- Use folder discovery defaults unless custom paths are required.
- Always save to `~/.claude/plugins/local/<plugin-name>/` unless the user provides a different path.

## Output

- Created file tree for the plugin (with full path to the output directory)
- Final `plugin.json`
- Marketplace entry (if applicable)
- Output of `claude plugin validate --strict`
- Confirmation of where the plugin is saved and how to load it (`/plugin marketplace add` or `claude --plugin-dir`)
