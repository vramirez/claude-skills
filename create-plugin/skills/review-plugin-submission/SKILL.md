---
name: review-plugin-submission
description: Audit a Claude Code plugin for marketplace readiness. Use when validating manifests, component metadata, discovery paths, and submission quality before publishing.
---

# Review plugin submission

## Trigger

A plugin is implemented and needs a final quality check before submission or release.

## Workflow

1. Verify manifest validity:
   - `.claude-plugin/plugin.json` exists
   - `name` is valid lowercase kebab-case
   - metadata fields are coherent (`description`, `version`, `author`, `license`)
   - no marketplace-only fields (`category`, `tags`) in `plugin.json`
2. Verify component discoverability:
   - Skills in `skills/*/SKILL.md`
   - Agents in `agents/` markdown files
   - Commands in `commands/` markdown files
   - Hooks in `hooks/hooks.json`
   - MCP config in `.mcp.json` (or `mcpServers` override)
3. Verify component metadata:
   - Skills include `name` and `description` frontmatter
   - Agents include `name` (lowercase kebab-case) and `description`
   - Commands include `description`
   - Hooks use Claude Code event names (`PreToolUse`, `PostToolUse`, `Stop`, `SubagentStop`, `SessionStart`, `UserPromptSubmit`, and so on) and `${CLAUDE_PLUGIN_ROOT}` for script paths
4. Verify repository integration:
   - For marketplace repos, plugin entry exists in `.claude-plugin/marketplace.json`
   - `source` resolves to the plugin directory and names are unique
5. Verify documentation quality:
   - `README.md` states purpose, installation (`/plugin marketplace add`, `/plugin install`), and component coverage
6. Run `claude plugin validate <plugin-dir> --strict` and report the result.

## Checklist

- Manifest exists and parses as valid JSON
- All declared paths exist and are relative
- No broken file references
- No missing frontmatter on skills, agents, or commands
- `claude plugin validate --strict` passes
- Plugin scope is clear and focused
- Marketplace registration complete (if multi-plugin repo)

## Output

- Pass/fail report by section
- Prioritized fix list
- Final submission recommendation
