<p align="center">
  <img src="logo.png" alt="Umami" width="80" height="80" />
</p>

<h1 align="center">umami-mcp-server</h1>

<p align="center">
  MCP server for <a href="https://umami.is">Umami Analytics</a> — Cloud and self-hosted.<br/><br/>
  <a href="https://www.npmjs.com/package/umami-mcp-server"><img src="https://img.shields.io/npm/v/umami-mcp-server?color=blue" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/umami-mcp-server"><img src="https://img.shields.io/npm/dm/umami-mcp-server" alt="npm downloads" /></a>
  <a href="https://github.com/frontedu/umami-mcp-server/blob/main/LICENSE"><img src="https://img.shields.io/github/license/frontedu/umami-mcp-server" alt="license" /></a>
</p>

---

Exposes 11 read-only tools and 4 prompt templates over [MCP](https://modelcontextprotocol.io). Built on the official [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk). Runs with `npx` — no install required.

## Quick start

```bash
npx umami-mcp-server
```

Or install globally:

```bash
npm install -g umami-mcp-server
```

## Setup

### Claude Code

```bash
claude mcp add -e UMAMI_API_KEY=your-api-key umami -- npx -y umami-mcp-server
```

Or add to `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "umami": {
      "command": "npx",
      "args": ["-y", "umami-mcp-server"],
      "env": {
        "UMAMI_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Claude Desktop

Settings > Developer > Edit Config > `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "umami": {
      "command": "npx",
      "args": ["-y", "umami-mcp-server"],
      "env": {
        "UMAMI_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Cursor

`.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "umami": {
      "command": "npx",
      "args": ["-y", "umami-mcp-server"],
      "env": {
        "UMAMI_API_KEY": "your-api-key"
      }
    }
  }
}
```

### VS Code (Copilot)

`settings.json`:

```json
{
  "mcp": {
    "servers": {
      "umami": {
        "command": "npx",
        "args": ["-y", "umami-mcp-server"],
        "env": {
          "UMAMI_API_KEY": "your-api-key"
        }
      }
    }
  }
}
```

### OpenAI Codex / Windsurf / Zed

Same pattern — command `npx`, args `["-y", "umami-mcp-server"]`, plus environment variables.

### Self-hosted Umami

Replace the `env` block in any config above:

```json
{
  "UMAMI_URL": "https://your-umami-instance.com",
  "UMAMI_USERNAME": "admin",
  "UMAMI_PASSWORD": "your-password"
}
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `UMAMI_API_KEY` | Cloud | API key from Umami Cloud Settings > API Keys |
| `UMAMI_API_BASE` | No | API base URL (default: `https://api.umami.is/v1`) |
| `UMAMI_URL` | Self-hosted | Umami instance URL |
| `UMAMI_USERNAME` | Self-hosted | Login username |
| `UMAMI_PASSWORD` | Self-hosted | Login password |

Set `UMAMI_API_KEY` for Cloud, or `UMAMI_URL` + `UMAMI_USERNAME` + `UMAMI_PASSWORD` for self-hosted. Auto-detected.

## Tools

| Tool | Description |
|------|-------------|
| `get_websites` | List all tracked websites with IDs and creation dates |
| `get_stats` | Aggregated stats: pageviews, visitors, visits, bounces, total time |
| `get_pageviews` | Time-series pageview and session data by time unit |
| `get_metrics` | Breakdown by path, referrer, browser, OS, device, country, city, language, screen, event, UTM params, and more |
| `get_active` | Current active visitors in real-time |
| `get_daterange` | Available data date range for a website |
| `get_events_series` | Event data over time with timezone support |
| `get_metrics_expanded` | Per-item stats: pageviews, unique visitors, visits, bounces, time on page |
| `get_sessions` | Individual session details (paginated) |
| `get_sessions_stats` | Session aggregates: pageviews, visitors, countries, events |
| `get_sessions_weekly` | Heatmap: 7 days x 24 hours of session activity |

All tools are read-only.

## Prompts

| Prompt | Description | Default |
|--------|-------------|---------|
| `analytics-report` | Full analytics report | 30 days |
| `top-pages` | Most visited pages | 7 days, top 10 |
| `visitor-insights` | Visitors by country, device, browser, OS | 30 days |
| `realtime-check` | Current active visitors | — |

## Example queries

- "What are my top 20 pages this month?"
- "Show me visitor trends for the last 90 days"
- "Which countries are my visitors from?"
- "How many people are on my site right now?"
- "What day and hour do I get the most traffic?"
- "Which pages have the highest bounce rate?"

## How it works

Implements MCP over stdio (JSON-RPC 2.0). Handles `initialize`, `tools/list`, `tools/call`, `prompts/list`, `prompts/get`. Makes authenticated requests to the Umami API and returns structured JSON.

No background processes, no polling, no state beyond the auth token.

## Requirements

- Node.js >= 18
- Umami Cloud account or self-hosted instance

## License

MIT
