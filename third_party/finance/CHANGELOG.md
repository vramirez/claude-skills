# Changelog

All notable changes to this plugin will be documented here.

## 1.1.0 — MCP server

- Added the `finance` MCP server pointing at `https://connectors-gateway.grok.com/gateway/v1/finance/mcp`, the streamable-HTTP transport of the Grok Finance connector.
- Auth is the caller's linked Grok account, attached by the Claude Code backend; no client sign-in prompt.
- Still Grok Bot 0.49 or newer only, and never allowed in Claude Code.

## 1.0.0 — initial release

- Added an empty Finance marketplace card that mirrors the Grok Finance connector.
- No skills and no connector are bundled. The Claude Code backend handles this plugin.
- Requires Grok Bot 0.49 or newer, and is never allowed in Claude Code.
