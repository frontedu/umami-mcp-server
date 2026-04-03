#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { UmamiClient } from './umami.js';

let client: UmamiClient | undefined;

function getClient(): UmamiClient {
  if (!client) {
    client = new UmamiClient({
      apiKey: process.env.UMAMI_API_KEY,
      apiBase: process.env.UMAMI_API_BASE,
      url: process.env.UMAMI_URL,
      username: process.env.UMAMI_USERNAME,
      password: process.env.UMAMI_PASSWORD,
    });
  }
  return client;
}

const server = new McpServer({
  name: 'umami-mcp-server',
  version: '1.0.0',
});

// ── Tools ──────────────────────────────────────────────────────────────

server.tool(
  'get_websites',
  'Get list of all websites configured in Umami. Returns website ID, name, domain, and createdAt timestamp. CRITICAL: Always call this FIRST before any analytics queries to verify the website exists and check when it was created.',
  {
    includeTeams: z
      .boolean()
      .optional()
      .default(false)
      .describe('Set to true to include websites where you are the team owner.'),
  },
  async ({ includeTeams }) => {
    const websites = await getClient().getWebsites(includeTeams);
    return { content: [{ type: 'text', text: JSON.stringify(websites, null, 2) }] };
  }
);

server.tool(
  'get_stats',
  "Get aggregated statistics for a website. Returns pageviews, visitors (unique sessions), visits, bounces, and totaltime. IMPORTANT: First check website createdAt date — don't request data from before creation.",
  {
    website_id: z.string().describe('The website ID from get_websites'),
    start_date: z
      .string()
      .describe('Start date (ISO 8601 recommended, e.g. 2026-03-23). Must be after website createdAt.'),
    end_date: z
      .string()
      .describe('End date (ISO 8601 recommended). Must be after start_date.'),
  },
  async ({ website_id, start_date, end_date }) => {

    const stats = await getClient().getStats(website_id, start_date, end_date);
    return { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] };
  }
);

server.tool(
  'get_pageviews',
  'Get pageview and session data grouped by time unit. Returns pageviews array (total views) and sessions array (unique visitors) per time period.',
  {
    website_id: z.string().describe('The website ID from get_websites'),
    start_date: z
      .string()
      .describe('Start date (ISO 8601 recommended). Must be after website createdAt.'),
    end_date: z.string().describe('End date (ISO 8601 recommended). Must be after start_date.'),
    unit: z
      .enum(['minute', 'hour', 'day', 'month', 'year'])
      .optional()
      .default('day')
      .describe('Time unit for grouping data.'),
  },
  async ({ website_id, start_date, end_date, unit }) => {

    const data = await getClient().getPageviews(website_id, start_date, end_date, unit);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  'get_metrics',
  "Get metrics for a website. Returns array with 'x' (metric value) and 'y' (count). Types: url/path, referrer, browser, os, device, country, region, city, language, screen, event, title, entry, exit, and more.",
  {
    website_id: z.string().describe('The website ID from get_websites'),
    start_date: z
      .string()
      .describe('Start date (ISO 8601 recommended). Must be after website createdAt.'),
    end_date: z.string().describe('End date (ISO 8601 recommended). Must be after start_date.'),
    metric_type: z
      .enum([
        'url', 'path', 'referrer', 'browser', 'os', 'device', 'country',
        'region', 'city', 'language', 'screen', 'event', 'hostname',
        'domain', 'query', 'channel', 'tag', 'distinctId', 'title', 'entry', 'exit',
      ])
      .describe('Type of metric to retrieve.'),
    limit: z
      .number()
      .int()
      .optional()
      .default(10)
      .describe('Maximum results to return. Use 50-100 for complete data.'),
  },
  async ({ website_id, start_date, end_date, metric_type, limit }) => {

    const metrics = await getClient().getMetrics(website_id, start_date, end_date, metric_type, limit);
    return { content: [{ type: 'text', text: JSON.stringify(metrics, null, 2) }] };
  }
);

server.tool(
  'get_active',
  'Get count of current active visitors on the website in real-time. No date parameters needed.',
  {
    website_id: z.string().describe('The website ID from get_websites'),
  },
  async ({ website_id }) => {

    const active = await getClient().getActive(website_id);
    return { content: [{ type: 'text', text: JSON.stringify(active, null, 2) }] };
  }
);

server.tool(
  'get_daterange',
  'Get the available data date range for a website. Returns the earliest and latest dates with analytics data. Useful to know the boundaries before querying.',
  {
    website_id: z.string().describe('The website ID from get_websites'),
  },
  async ({ website_id }) => {

    const range = await getClient().getDateRange(website_id);
    return { content: [{ type: 'text', text: JSON.stringify(range, null, 2) }] };
  }
);

server.tool(
  'get_events_series',
  "Get event data grouped by time unit. Returns array with 'x' (event name), 't' (timestamp), 'y' (count). Useful for tracking custom events over time.",
  {
    website_id: z.string().describe('The website ID from get_websites'),
    start_date: z.string().describe('Start date (ISO 8601 recommended). Must be after website createdAt.'),
    end_date: z.string().describe('End date (ISO 8601 recommended). Must be after start_date.'),
    unit: z
      .enum(['minute', 'hour', 'day', 'month', 'year'])
      .optional()
      .default('day')
      .describe('Time unit for grouping data.'),
    timezone: z.string().optional().default('UTC').describe('Timezone (e.g. America/Sao_Paulo).'),
  },
  async ({ website_id, start_date, end_date, unit, timezone }) => {

    const data = await getClient().getEventsSeries(website_id, start_date, end_date, unit, timezone);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  'get_metrics_expanded',
  'Get expanded metrics with additional stats per item: pageviews, visitors, visits, bounces, totaltime. Richer than get_metrics which only returns count.',
  {
    website_id: z.string().describe('The website ID from get_websites'),
    start_date: z.string().describe('Start date (ISO 8601 recommended). Must be after website createdAt.'),
    end_date: z.string().describe('End date (ISO 8601 recommended). Must be after start_date.'),
    metric_type: z
      .enum([
        'url', 'path', 'referrer', 'browser', 'os', 'device', 'country',
        'region', 'city', 'language', 'screen', 'event', 'hostname',
        'domain', 'query', 'channel', 'tag', 'distinctId', 'title', 'entry', 'exit',
      ])
      .describe('Type of metric to retrieve.'),
    limit: z.number().int().optional().default(10).describe('Maximum results to return.'),
  },
  async ({ website_id, start_date, end_date, metric_type, limit }) => {

    const data = await getClient().getMetricsExpanded(website_id, start_date, end_date, metric_type, limit);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  'get_sessions',
  'Get individual session details for a website. Returns browser, OS, device, country, city, views, visits per session. Paginated.',
  {
    website_id: z.string().describe('The website ID from get_websites'),
    start_date: z.string().describe('Start date (ISO 8601 recommended).'),
    end_date: z.string().describe('End date (ISO 8601 recommended).'),
    page: z.number().int().optional().default(1).describe('Page number (default: 1).'),
    page_size: z.number().int().optional().default(20).describe('Results per page (default: 20, max recommended: 50).'),
  },
  async ({ website_id, start_date, end_date, page, page_size }) => {

    const sessions = await getClient().getSessions(website_id, start_date, end_date, page, page_size);
    return { content: [{ type: 'text', text: JSON.stringify(sessions, null, 2) }] };
  }
);

server.tool(
  'get_sessions_stats',
  'Get aggregated session statistics: total pageviews, unique visitors, visits, unique countries, and events count.',
  {
    website_id: z.string().describe('The website ID from get_websites'),
    start_date: z.string().describe('Start date (ISO 8601 recommended).'),
    end_date: z.string().describe('End date (ISO 8601 recommended).'),
  },
  async ({ website_id, start_date, end_date }) => {

    const stats = await getClient().getSessionsStats(website_id, start_date, end_date);
    return { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] };
  }
);

server.tool(
  'get_sessions_weekly',
  'Get session heatmap data: 7 arrays (Mon-Sun) of 24 values (hours). Perfect for identifying peak traffic times by day of week and hour.',
  {
    website_id: z.string().describe('The website ID from get_websites'),
    start_date: z.string().describe('Start date (ISO 8601 recommended).'),
    end_date: z.string().describe('End date (ISO 8601 recommended).'),
    timezone: z.string().optional().default('America/Sao_Paulo').describe('Timezone (default: America/Sao_Paulo).'),
  },
  async ({ website_id, start_date, end_date, timezone }) => {

    const data = await getClient().getSessionsWeekly(website_id, start_date, end_date, timezone);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Prompts ────────────────────────────────────────────────────────────

server.prompt(
  'analytics-report',
  'Generate a comprehensive analytics report for a website',
  { days: z.string().optional().default('30').describe('Number of days to analyze (default: 30)') },
  ({ days }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Generate a comprehensive analytics report for the last ${days} days. Include stats, top pages, traffic sources, and visitor demographics.`,
        },
      },
    ],
  })
);

server.prompt(
  'top-pages',
  'Show the most visited pages on a website',
  {
    days: z.string().optional().default('7').describe('Number of days to look back (default: 7)'),
    limit: z.string().optional().default('10').describe('Number of pages to show (default: 10)'),
  },
  ({ days, limit }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Show the top ${limit} most visited pages over the last ${days} days.`,
        },
      },
    ],
  })
);

server.prompt(
  'visitor-insights',
  'Break down visitors by country, device, browser, and OS',
  { days: z.string().optional().default('30').describe('Number of days to analyze (default: 30)') },
  ({ days }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Break down visitors by country, device, browser, and OS for the last ${days} days.`,
        },
      },
    ],
  })
);

server.prompt(
  'realtime-check',
  'Check current active visitors on a website',
  {},
  () => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: 'Check the current active visitors on the website and provide a summary.',
        },
      },
    ],
  })
);

// ── Start ──────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
