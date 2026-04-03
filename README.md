<p align="center">
  <img src="logo.png" alt="Umami" width="80" height="80" />
</p>

# umami-mcp-server

The most complete MCP server for [Umami Analytics](https://umami.is). **11 tools**, 4 prompt templates, built on the official [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk). Node.js — runs everywhere with `npx`, no Python or Go toolchain required.

Works with **Umami Cloud** (API key) and **self-hosted** instances (username/password).

## Why this one?

Other Umami MCP servers exist. Here's why this one is different:

| | **umami-mcp-server** (this) | lukasschmit/umami-mcp | Macawls/umami-mcp-server |
|---|---|---|---|
| **Runtime** | Node.js (`npx`) | Python (`uvx`) | Go (binary) |
| **Tools** | **11** | 5 | 5 |
| **Expanded metrics** | pageviews + visitors + bounces per page | count only | count only |
| **Session data** | individual sessions, weekly heatmap, session stats | -- | -- |
| **Event series** | time-series event tracking | -- | -- |
| **Date range discovery** | `get_daterange` | -- | -- |
| **Prompt templates** | 4 built-in | -- | 4 built-in |
| **Cloud + self-hosted** | both | both | self-hosted only |
| **Install** | `npx` (zero setup) | requires `uv` + Python | requires Go or binary download |

Most developers already have Node.js. No need to install Python, `uv`, `uvx`, or download platform-specific binaries.

## Quick start

### 1. Get your credentials

- **Umami Cloud**: Settings > API Keys > Create key
- **Self-hosted**: Use your login username and password

### 2. Add to your MCP client

No install required — `npx` fetches and runs it directly.

#### Claude Desktop / Claude Code

Add to your MCP config (`~/.claude.json`, Claude Desktop settings, or `.mcp.json` in your project):

**Umami Cloud:**

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

**Self-hosted:**

```json
{
  "mcpServers": {
    "umami": {
      "command": "npx",
      "args": ["-y", "umami-mcp-server"],
      "env": {
        "UMAMI_URL": "https://your-umami-instance.com",
        "UMAMI_USERNAME": "admin",
        "UMAMI_PASSWORD": "your-password"
      }
    }
  }
}
```

#### Cursor

Add to `.cursor/mcp.json` in your project root:

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

#### VS Code (Copilot)

Add to your VS Code `settings.json`:

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

#### Windsurf / Zed / Other MCP clients

Same pattern — point `command` to `npx` with args `["-y", "umami-mcp-server"]` and set the environment variables below.

### 3. Or install globally

```bash
npm install -g umami-mcp-server
```

Then use `umami-mcp-server` as the command (no `npx` needed).

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `UMAMI_API_KEY` | Cloud | API key from Umami Cloud dashboard |
| `UMAMI_API_BASE` | No | API base URL (default: `https://api.umami.is/v1`) |
| `UMAMI_URL` | Self-hosted | Your Umami instance URL |
| `UMAMI_USERNAME` | Self-hosted | Login username |
| `UMAMI_PASSWORD` | Self-hosted | Login password |

Set either `UMAMI_API_KEY` (Cloud) or both `UMAMI_USERNAME` + `UMAMI_PASSWORD` (self-hosted). The server auto-detects which mode to use.

## Tools (11)

### Core analytics

| Tool | Description |
|------|-------------|
| `get_websites` | List all tracked websites with IDs and creation dates |
| `get_stats` | Aggregated stats: pageviews, visitors, visits, bounces, total time |
| `get_pageviews` | Time-series pageview and session data (by minute/hour/day/month/year) |
| `get_metrics` | Breakdown by 20+ dimensions: path, referrer, browser, OS, device, country, city, language, screen, event, UTM params, and more |
| `get_active` | Current active visitors in real-time |

### Extended (not available in other Umami MCP servers)

| Tool | Description |
|------|-------------|
| `get_daterange` | Available data boundaries for a website — know what you can query before querying |
| `get_events_series` | Custom event tracking over time with timezone support |
| `get_metrics_expanded` | Rich per-page stats: pageviews + unique visitors + visits + bounces + time on page |
| `get_sessions` | Individual session details: browser, OS, device, country, city, page views (paginated) |
| `get_sessions_stats` | Session aggregates: total pageviews, unique visitors, countries reached, events fired |
| `get_sessions_weekly` | Weekly heatmap: 7 days x 24 hours — find your peak traffic windows |

### Why the extended tools matter

**`get_metrics_expanded`** is the difference between knowing "/blog/my-post got 50 views" and knowing "/blog/my-post got 50 views from 30 unique visitors, 25 bounced, average 12s on page". The basic `get_metrics` (which is all other servers offer) only gives you the count.

**`get_sessions_weekly`** returns a 7x24 heatmap of traffic patterns. Your AI assistant can tell you "your audience peaks on Wednesdays at 4pm" instead of just "you had 200 visitors this week".

**`get_daterange`** prevents wasted API calls. Instead of guessing when data starts, the AI knows the exact boundaries upfront.

## Prompts (4)

Built-in prompt templates that guide the AI to call the right tools in the right order:

| Prompt | Description | Default |
|--------|-------------|---------|
| `analytics-report` | Full analytics report: stats, top pages, traffic sources, demographics | 30 days |
| `top-pages` | Most visited pages ranked by traffic | 7 days, top 10 |
| `visitor-insights` | Visitor breakdown by country, device, browser, OS | 30 days |
| `realtime-check` | Current active visitors summary | -- |

## Usage examples

Once connected, ask your AI assistant:

- "What are my top 20 pages this month?"
- "Show me visitor trends for the last 90 days"
- "Which countries are my visitors from?"
- "How many people are on my site right now?"
- "What day and hour do I get the most traffic?"
- "Compare page performance — which posts have the highest bounce rate?"
- "Show me all sessions from Brazil in the last week"
- "What custom events fired today?"

## How it works

The server implements the [Model Context Protocol](https://modelcontextprotocol.io) over stdio (JSON-RPC 2.0). When an MCP client starts it:

1. Reads JSON-RPC messages from stdin
2. Handles `initialize`, `tools/list`, `tools/call`, `prompts/list`, `prompts/get`
3. Makes authenticated HTTP requests to the Umami API
4. Returns structured JSON results

No background processes, no polling, no state beyond the auth token. Built on the official [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) with Zod schema validation for all tool inputs.

## Requirements

- Node.js >= 18
- An Umami Cloud account or self-hosted Umami instance

## License

MIT
