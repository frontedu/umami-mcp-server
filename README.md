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

61 read-only tools, 4 prompts, and 3 resources over [MCP](https://modelcontextprotocol.io). Built on the official [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk). Runs with `npx` — no install required.

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

### ChatGPT

ChatGPT supports MCP servers via remote connection (requires a publicly accessible URL).

1. Deploy this server behind a public HTTPS endpoint with SSE transport (e.g. using [mcp-remote](https://www.npmjs.com/package/mcp-remote) or a tunnel like ngrok)
2. In ChatGPT, go to **Settings > Connectors > Advanced > Developer Mode**
3. Add the server URL

> ChatGPT cannot connect to localhost directly. You need a public URL or tunnel.

Available for ChatGPT Pro, Team, Enterprise, and Edu plans.

### OpenAI Codex / Windsurf / Zed

Same pattern — command `npx`, args `["-y", "umami-mcp-server"]`, plus environment variables.

### Smithery

```bash
npx -y @smithery/cli install umami-mcp-server --client claude
```

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

### Website stats (11)

| Tool | Description |
|------|-------------|
| `get_websites` | List all tracked websites with IDs and creation dates |
| `get_website_by_id` | Get details for a specific website |
| `get_stats` | Aggregated stats: pageviews, visitors, visits, bounces, total time |
| `get_pageviews` | Time-series pageview and session data by time unit |
| `get_metrics` | Breakdown by path, referrer, browser, OS, device, country, etc. |
| `get_metrics_expanded` | Per-item stats: pageviews, visitors, bounces, time on page |
| `get_active` | Current active visitors |
| `get_daterange` | Available data date range for a website |
| `get_realtime` | Last 30 minutes: visitors, URLs, referrers, events, totals |
| `get_website_shares` | List public share pages for a website |
| `get_share_by_id` | Get a share page by ID |

### Events (9)

| Tool | Description |
|------|-------------|
| `get_events` | Event details within a time range (paginated, searchable) |
| `get_events_series` | Event data over time with timezone support |
| `get_events_stats` | Aggregated event statistics |
| `get_event_data_by_id` | Event data for a specific event |
| `get_event_data_events` | Event names, properties, and counts |
| `get_event_data_fields` | Event property and value counts |
| `get_event_data_properties` | Event name and property counts |
| `get_event_data_values` | Counts for a specific event/property combination |
| `get_event_data_stats` | Aggregated totals: events, properties, records |

### Sessions (8)

| Tool | Description |
|------|-------------|
| `get_sessions` | Session list with browser, OS, device, country (paginated) |
| `get_sessions_stats` | Session aggregates: pageviews, visitors, countries, events |
| `get_sessions_weekly` | Heatmap: 7 days x 24 hours of session activity |
| `get_session_by_id` | Details for an individual session |
| `get_session_activity` | Activity history (pages, events) for a session |
| `get_session_properties` | Custom properties for a session |
| `get_session_data_properties` | Session data counts by property name |
| `get_session_data_values` | Session data counts for a specific property |

### Reports (11)

| Tool | Description |
|------|-------------|
| `get_reports` | List saved reports (optionally filter by website) |
| `get_report_by_id` | Get a saved report by ID |
| `get_funnel_report` | Funnel analysis: conversion and drop-off through steps |
| `get_retention_report` | Visitor return frequency over time |
| `get_journey_report` | User navigation flow from a start page through N steps |
| `get_utm_report` | UTM campaign breakdown: source, medium, campaign, term, content |
| `get_goals_report` | Pageview and event goal tracking |
| `get_revenue_report` | Revenue data by date range and currency |
| `get_performance_report` | Core Web Vitals: LCP, INP, CLS, FCP, TTFB |
| `get_attribution_report` | Marketing attribution by source |
| `get_breakdown_report` | Segment data by multiple dimensions |

### Teams (4)

| Tool | Description |
|------|-------------|
| `get_teams` | List all teams |
| `get_team_by_id` | Team details |
| `get_team_users` | Team members and roles |
| `get_team_websites` | Websites belonging to a team |

### Auth (2)

| Tool | Description |
|------|-------------|
| `verify_token` | Verify authentication token and get user info |
| `get_me` | Current authenticated user details |

### Composite tools (16)

Tools that combine multiple API calls and return computed insights.

| Tool | Description |
|------|-------------|
| `compare_periods` | Two periods side-by-side with growth/decline % |
| `get_visitor_demographics` | Country, browser, OS, device, language in one call |
| `get_traffic_sources` | Referrers, channels, and domains combined |
| `get_session_detail` | Session info + activity + properties in one call |
| `get_event_detail` | Event names + values + time series in one call |
| `get_site_overview` | Stats + active + top pages + sources + countries |
| `get_campaign_performance` | UTM + attribution combined |
| `get_page_analysis` | Expanded page metrics + Core Web Vitals |
| `get_growth_trends` | 3-period trend with acceleration/deceleration detection |
| `get_engagement_score` | Engagement score (0–100) from bounce rate, time, pages/visit |
| `get_content_performance` | Per-page role analysis: entry door, exit door, passthrough |
| `get_acquisition_overview` | Referrers + channels + landing pages + UTM unified |
| `get_bounce_analysis` | Worst bounce rates by page, source, and device |
| `get_peak_hours_analysis` | Peak/dead hours, best day, publishing window recommendation |
| `get_geo_insights` | Country → region → city hierarchy with share % |
| `get_realtime_vs_baseline` | Current traffic vs historical average, spike/drop detection |

All tools are read-only.

## Resources

| URI | Description |
|-----|-------------|
| `umami://websites` | All tracked websites |
| `umami://teams` | All teams |
| `umami://reports` | All saved reports |

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
- "Compare this month's traffic to last month"
- "What's my engagement score for the last 30 days?"
- "Where are visitors dropping off in my signup funnel?"
- "Is my traffic right now above or below normal?"

## How it works

Implements MCP over stdio (JSON-RPC 2.0). Handles `initialize`, `tools/list`, `tools/call`, `prompts/list`, `prompts/get`, `resources/list`, `resources/read`. Makes authenticated requests to the Umami API and returns structured JSON.

No background processes, no polling, no state beyond the auth token.

## Compatibility

| Client | Method | Status |
|--------|--------|--------|
| Claude Code | `claude mcp add` or `.mcp.json` | Supported |
| Claude Desktop | `claude_desktop_config.json` or `.mcpb` extension | Supported |
| Cursor | `.cursor/mcp.json` | Supported |
| VS Code (Copilot) | `settings.json` | Supported |
| OpenAI Codex | `.mcp.json` | Supported |
| ChatGPT | Remote URL + SSE transport | Requires public endpoint |
| Windsurf / Zed | `.mcp.json` | Supported |
| Smithery | `npx @smithery/cli install` | Supported |

## Requirements

- Node.js >= 18
- Umami Cloud account or self-hosted instance

## License

MIT
