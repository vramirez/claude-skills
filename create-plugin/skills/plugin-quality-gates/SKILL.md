---
name: plugin-quality-gates
description: Keep Claude Code plugin manifests, paths, and component metadata valid during plugin authoring. Applies whenever creating or editing files inside a plugin directory.
paths: ["**/.claude-plugin/*.json", "**/skills/**/SKILL.md", "**/agents/*.md", "**/commands/*.md", "**/hooks/hooks.json", "**/.mcp.json"]
---

# Plugin quality gates

When creating or editing Claude Code plugins:

1. Ensure `.claude-plugin/plugin.json` exists and includes a valid kebab-case `name`.
2. Keep paths relative and within the plugin directory (no absolute paths, no `..` traversal). Reference plugin files from hooks and MCP configs with `${CLAUDE_PLUGIN_ROOT}`.
3. Rely on the default component directories (`skills/`, `agents/`, `commands/`, `hooks/hooks.json`, `.mcp.json`). Only declare `skills`, `agents`, `hooks`, or `mcpServers` in `plugin.json` when a component lives somewhere else.
4. Include YAML frontmatter for skills, agents, and commands with the required metadata: `name` and `description` for skills and agents, `description` for commands.
5. Put marketplace-only metadata (`category`, `tags`) in the marketplace entry, not in `plugin.json`.
6. Keep plugin scope focused and document installation and usage in `README.md`.
7. Run `claude plugin validate <plugin-dir> --strict` before declaring the plugin done.
