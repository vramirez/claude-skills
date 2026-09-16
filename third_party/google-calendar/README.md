# Google Calendar

Claude Code plugin that connects agents to [Google Calendar](https://calendar.google.com) through Google's remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

List calendars, search and inspect events, suggest times, and create, update, or respond to meetings.

## Install

```
/plugin marketplace add vramirez/claude-skills
/plugin install google-calendar@claude-skills
```

After installing, complete the Google sign-in prompt.

## MCP

```json
{
  "mcpServers": {
    "google-calendar": {
      "type": "http",
      "url": "https://calendarmcp.googleapis.com/mcp/v1"
    }
  }
}
```

Auth is OAuth 2.0 against Google. Claude Code prompts for Google sign-in when the plugin connects.

## Docs

- Google MCP setup: https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server
- Workspace MCP overview: https://developers.google.com/workspace/guides/configure-mcp-servers

Logo is the official Google Calendar product icon, placed on a white tile with padding so it reads well in the marketplace UI:
https://www.gstatic.com/images/branding/productlogos/calendar_2026/v1/192px.svg

## License

MIT
