# Otter.ai

Claude Code plugin that connects agents to [Otter.ai](https://otter.ai) through Otter.ai's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search your Otter meeting history and pull full transcripts into the editor to summarize decisions and pull out action items.

## Install

```
/plugin marketplace add vramirez/claude-skills
/plugin install otter@claude-skills
```

After installing, complete the Otter.ai sign-in prompt.

## MCP

```json
{
  "mcpServers": {
    "otter": {
      "type": "http",
      "url": "https://mcp.otter.ai/mcp"
    }
  }
}
```

Auth is OAuth. Claude Code prompts for Otter sign-in when the plugin connects. Otter does not offer a public API key, so OAuth is the only path.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Identity | Confirm the signed-in Otter user |
| Search | Search across your meeting history |
| Transcripts | Fetch a full transcript by ID |

The hosted runtime is the source of truth for tool names and schemas. Call `get_user_info` as a read-only smoke test after connecting.

## Notes

- Tool calls run as the Otter user who authorizes the connection.
- All three tools are read-only — the server cannot edit or delete Otter content.
- Despite launching under the "Otter for Enterprise" banner, the MCP server is listed as a Basic-tier feature.

## Docs

- Otter MCP server: https://help.otter.ai/hc/en-us/articles/35287607569687-Otter-MCP-Server
- Server URL: https://mcp.otter.ai/mcp

Logo is Otter.ai's official mark, from the `otter-ai` GitHub organization.

## License

MIT
