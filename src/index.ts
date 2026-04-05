#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { UmamiClient } from './umami.js';
import type { FunnelStep } from './umami.js';

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

function json(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data ?? null, null, 2) }] };
}

const server = new McpServer({
  name: 'umami-mcp-server',
  version: '2.0.0',
});

// ── Shared schemas ────────────────────────────────────────────────────

const websiteIdSchema = z.string().describe('The website ID from get_websites');
const startDateSchema = z.string().describe('Start date (ISO 8601, e.g. 2026-03-01). Must be after website createdAt.');
const endDateSchema = z.string().describe('End date (ISO 8601). Must be after start_date.');
const unitSchema = z.enum(['minute', 'hour', 'day', 'month', 'year']).optional().default('day').describe('Time unit for grouping.');
const timezoneSchema = z.string().optional().default('UTC').describe('Timezone (e.g. America/Sao_Paulo).');
const metricTypeSchema = z.enum([
  'url', 'path', 'referrer', 'browser', 'os', 'device', 'country',
  'region', 'city', 'language', 'screen', 'event', 'hostname',
  'domain', 'query', 'channel', 'tag', 'distinctId', 'title', 'entry', 'exit',
]).describe('Type of metric to retrieve.');
const limitSchema = z.number().int().optional().default(10).describe('Maximum results to return.');
const pageSchema = z.number().int().optional().default(1).describe('Page number (default: 1).');
const pageSizeSchema = z.number().int().optional().default(20).describe('Results per page (default: 20, max: 200).');

// =====================================================================
// BLOCO A — 11 tools existentes
// =====================================================================

server.tool(
  'get_websites',
  'List all tracked websites with IDs, names, domains and creation dates. CRITICAL: Always call this FIRST before any analytics queries.',
  {
    includeTeams: z.boolean().optional().default(false).describe('Include team-owned websites.'),
  },
  async ({ includeTeams }) => json(await getClient().getWebsites(includeTeams))
);

server.tool(
  'get_stats',
  'Aggregated stats: pageviews, visitors, visits, bounces, totaltime. Supports period comparison.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
  },
  async ({ website_id, start_date, end_date }) =>
    json(await getClient().getStats(website_id, start_date, end_date))
);

server.tool(
  'get_pageviews',
  'Time-series pageview and session data grouped by time unit.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    unit: unitSchema,
  },
  async ({ website_id, start_date, end_date, unit }) =>
    json(await getClient().getPageviews(website_id, start_date, end_date, unit))
);

server.tool(
  'get_metrics',
  "Breakdown by path, referrer, browser, OS, device, country, city, language, screen, event, UTM params, etc. Returns 'x' (value) and 'y' (count).",
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    metric_type: metricTypeSchema,
    limit: limitSchema,
  },
  async ({ website_id, start_date, end_date, metric_type, limit }) =>
    json(await getClient().getMetrics(website_id, start_date, end_date, metric_type, limit))
);

server.tool(
  'get_active',
  'Current active visitors in real-time. No date parameters needed.',
  { website_id: websiteIdSchema },
  async ({ website_id }) => json(await getClient().getActive(website_id))
);

server.tool(
  'get_daterange',
  'Available data date range (earliest and latest dates) for a website.',
  { website_id: websiteIdSchema },
  async ({ website_id }) => json(await getClient().getDateRange(website_id))
);

server.tool(
  'get_events_series',
  "Event data over time. Returns 'x' (event name), 't' (timestamp), 'y' (count).",
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    unit: unitSchema,
    timezone: timezoneSchema,
  },
  async ({ website_id, start_date, end_date, unit, timezone }) =>
    json(await getClient().getEventsSeries(website_id, start_date, end_date, unit, timezone))
);

server.tool(
  'get_metrics_expanded',
  'Expanded metrics with per-item stats: pageviews, visitors, visits, bounces, totaltime.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    metric_type: metricTypeSchema,
    limit: limitSchema,
  },
  async ({ website_id, start_date, end_date, metric_type, limit }) =>
    json(await getClient().getMetricsExpanded(website_id, start_date, end_date, metric_type, limit))
);

server.tool(
  'get_sessions',
  'Individual session details: browser, OS, device, country, city, views, visits. Paginated.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    page: pageSchema,
    page_size: pageSizeSchema,
  },
  async ({ website_id, start_date, end_date, page, page_size }) =>
    json(await getClient().getSessions(website_id, start_date, end_date, page, page_size))
);

server.tool(
  'get_sessions_stats',
  'Aggregated session statistics: total pageviews, unique visitors, visits, unique countries, events.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
  },
  async ({ website_id, start_date, end_date }) =>
    json(await getClient().getSessionsStats(website_id, start_date, end_date))
);

server.tool(
  'get_sessions_weekly',
  'Session heatmap: 7 arrays (Mon-Sun) x 24 values (hours). Identify peak traffic times.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    timezone: z.string().optional().default('America/Sao_Paulo').describe('Timezone.'),
  },
  async ({ website_id, start_date, end_date, timezone }) =>
    json(await getClient().getSessionsWeekly(website_id, start_date, end_date, timezone))
);

// =====================================================================
// BLOCO B — Endpoints diretos novos
// =====================================================================

// ── Auth & Me ─────────────────────────────────────────────────────────

server.tool(
  'verify_token',
  'Verify the current authentication token and get user info. Self-hosted only — Cloud uses get_me instead.',
  {},
  async () => {
    try {
      return json(await getClient().verifyToken());
    } catch {
      return json(await getClient().getMe());
    }
  }
);

server.tool(
  'get_me',
  'Get information about the current authenticated user: token info, user details.',
  {},
  async () => json(await getClient().getMe())
);

// ── Website by ID ─────────────────────────────────────────────────────

server.tool(
  'get_website_by_id',
  'Get detailed information about a specific website by its ID.',
  { website_id: websiteIdSchema },
  async ({ website_id }) => json(await getClient().getWebsiteById(website_id))
);

// ── Events ────────────────────────────────────────────────────────────

server.tool(
  'get_events',
  'List individual event details within a time range. Paginated, with optional search.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    page: pageSchema,
    page_size: pageSizeSchema,
    search: z.string().optional().describe('Filter events by search term.'),
  },
  async ({ website_id, start_date, end_date, page, page_size, search }) =>
    json(await getClient().getEvents(website_id, start_date, end_date, page, page_size, search))
);

server.tool(
  'get_events_stats',
  'Aggregated event statistics with optional period comparison.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
  },
  async ({ website_id, start_date, end_date }) =>
    json(await getClient().getEventsStats(website_id, start_date, end_date))
);

server.tool(
  'get_event_data_by_id',
  'Get event data for a specific individual event by its ID.',
  {
    website_id: websiteIdSchema,
    event_id: z.string().describe('The event ID.'),
  },
  async ({ website_id, event_id }) =>
    json(await getClient().getEventDataById(website_id, event_id))
);

server.tool(
  'get_event_data_events',
  'Get event names, their properties, and counts. Optionally filter by event name.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    event: z.string().optional().describe('Filter by specific event name.'),
  },
  async ({ website_id, start_date, end_date, event }) =>
    json(await getClient().getEventDataEvents(website_id, start_date, end_date, event))
);

server.tool(
  'get_event_data_fields',
  'Get event property and value counts for all events.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
  },
  async ({ website_id, start_date, end_date }) =>
    json(await getClient().getEventDataFields(website_id, start_date, end_date))
);

server.tool(
  'get_event_data_properties',
  'Get event name and property counts.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
  },
  async ({ website_id, start_date, end_date }) =>
    json(await getClient().getEventDataProperties(website_id, start_date, end_date))
);

server.tool(
  'get_event_data_values',
  'Get event data counts for a specific event and property combination.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    event: z.string().describe('Event name.'),
    property_name: z.string().describe('Property name to get values for.'),
  },
  async ({ website_id, start_date, end_date, event, property_name }) =>
    json(await getClient().getEventDataValues(website_id, start_date, end_date, event, property_name))
);

server.tool(
  'get_event_data_stats',
  'Aggregated event data stats: total events, properties, and records.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
  },
  async ({ website_id, start_date, end_date }) =>
    json(await getClient().getEventDataStats(website_id, start_date, end_date))
);

// ── Sessions (detail) ─────────────────────────────────────────────────

server.tool(
  'get_session_by_id',
  'Get details for a specific individual session: browser, OS, device, country, etc.',
  {
    website_id: websiteIdSchema,
    session_id: z.string().describe('The session ID.'),
  },
  async ({ website_id, session_id }) =>
    json(await getClient().getSessionById(website_id, session_id))
);

server.tool(
  'get_session_activity',
  'Get activity history (pages visited, events fired) for a specific session.',
  {
    website_id: websiteIdSchema,
    session_id: z.string().describe('The session ID.'),
    start_date: startDateSchema,
    end_date: endDateSchema,
  },
  async ({ website_id, session_id, start_date, end_date }) =>
    json(await getClient().getSessionActivity(website_id, session_id, start_date, end_date))
);

server.tool(
  'get_session_properties',
  'Get custom properties for a specific session.',
  {
    website_id: websiteIdSchema,
    session_id: z.string().describe('The session ID.'),
  },
  async ({ website_id, session_id }) =>
    json(await getClient().getSessionProperties(website_id, session_id))
);

server.tool(
  'get_session_data_properties',
  'Get session data counts grouped by property name.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
  },
  async ({ website_id, start_date, end_date }) =>
    json(await getClient().getSessionDataProperties(website_id, start_date, end_date))
);

server.tool(
  'get_session_data_values',
  'Get session data counts for a specific property.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    property_name: z.string().describe('Property name to get values for.'),
  },
  async ({ website_id, start_date, end_date, property_name }) =>
    json(await getClient().getSessionDataValues(website_id, start_date, end_date, property_name))
);

// ── Realtime ──────────────────────────────────────────────────────────

server.tool(
  'get_realtime',
  'Realtime analytics for last 30 minutes: active visitors, top URLs, countries, referrers, events, time series, totals.',
  { website_id: websiteIdSchema },
  async ({ website_id }) => json(await getClient().getRealtime(website_id))
);

// ── Teams ─────────────────────────────────────────────────────────────

server.tool(
  'get_teams',
  'List all teams the user has access to.',
  {
    page: pageSchema,
    page_size: pageSizeSchema,
  },
  async ({ page, page_size }) => json(await getClient().getTeams(page, page_size))
);

server.tool(
  'get_team_by_id',
  'Get detailed information about a specific team.',
  { team_id: z.string().describe('The team ID.') },
  async ({ team_id }) => json(await getClient().getTeamById(team_id))
);

server.tool(
  'get_team_users',
  'List all members of a team with their roles.',
  { team_id: z.string().describe('The team ID.') },
  async ({ team_id }) => json(await getClient().getTeamUsers(team_id))
);

server.tool(
  'get_team_websites',
  'List all websites belonging to a team.',
  { team_id: z.string().describe('The team ID.') },
  async ({ team_id }) => json(await getClient().getTeamWebsites(team_id))
);

// ── Reports (CRUD read) ──────────────────────────────────────────────

server.tool(
  'get_reports',
  'List all saved reports. Optionally filter by website.',
  {
    website_id: z.string().optional().describe('Filter by website ID.'),
  },
  async ({ website_id }) => json(await getClient().getReports(website_id))
);

server.tool(
  'get_report_by_id',
  'Get a saved report by its ID.',
  { report_id: z.string().describe('The report ID.') },
  async ({ report_id }) => json(await getClient().getReportById(report_id))
);

// ── Reports (run) ─────────────────────────────────────────────────────

server.tool(
  'get_funnel_report',
  'Run a funnel analysis: conversion and drop-off rates through a sequence of steps (paths or events).',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    steps: z
      .array(z.object({
        type: z.enum(['path', 'event']).describe('Step type.'),
        value: z.string().describe('Path URL or event name.'),
      }))
      .min(2)
      .describe('Funnel steps (min 2). E.g. [{type:"path",value:"/"},{type:"path",value:"/signup"}]'),
    window: z.number().int().optional().default(60).describe('Conversion window in minutes (default: 60).'),
  },
  async ({ website_id, start_date, end_date, steps, window }) =>
    json(await getClient().runFunnelReport(website_id, start_date, end_date, steps as FunnelStep[], window))
);

server.tool(
  'get_retention_report',
  'Run a retention analysis: measure how often visitors return over time.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
  },
  async ({ website_id, start_date, end_date }) =>
    json(await getClient().runRetentionReport(website_id, start_date, end_date))
);

server.tool(
  'get_journey_report',
  'Run a user journey/flow analysis: map navigation patterns from a start page through N steps.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    steps: z.number().int().min(3).max(7).describe('Number of journey steps (3-7).'),
    start_step: z.string().describe('Starting URL path (e.g. /).'),
    end_step: z.string().optional().describe('Optional ending URL path.'),
  },
  async ({ website_id, start_date, end_date, steps, start_step, end_step }) =>
    json(await getClient().runJourneyReport(website_id, start_date, end_date, steps, start_step, end_step))
);

server.tool(
  'get_utm_report',
  'Run a UTM campaign analysis: breakdown by source, medium, campaign, term, content.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
  },
  async ({ website_id, start_date, end_date }) =>
    json(await getClient().runUtmReport(website_id, start_date, end_date))
);

server.tool(
  'get_goals_report',
  'Run a goals report: track pageview and event goals.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
  },
  async ({ website_id, start_date, end_date }) =>
    json(await getClient().runGoalsReport(website_id, start_date, end_date))
);

server.tool(
  'get_revenue_report',
  'Run a revenue report: track currency/revenue data over a date range.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    currency: z.string().describe('ISO 4217 currency code (e.g. USD, BRL, EUR).'),
  },
  async ({ website_id, start_date, end_date, currency }) =>
    json(await getClient().runRevenueReport(website_id, start_date, end_date, currency))
);

server.tool(
  'get_performance_report',
  'Run a Core Web Vitals performance report: LCP, INP, CLS, FCP, TTFB.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    metric: z.enum(['lcp', 'inp', 'cls', 'fcp', 'ttfb']).optional().describe('Specific metric to focus on.'),
  },
  async ({ website_id, start_date, end_date, metric }) =>
    json(await getClient().runPerformanceReport(website_id, start_date, end_date, metric))
);

server.tool(
  'get_attribution_report',
  'Run a marketing attribution report: analyze engagement and conversions by source.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
  },
  async ({ website_id, start_date, end_date }) =>
    json(await getClient().runAttributionReport(website_id, start_date, end_date))
);

server.tool(
  'get_breakdown_report',
  'Run a breakdown/segmentation report: segment data by multiple dimensions.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    fields: z
      .array(z.string())
      .min(1)
      .describe('Fields to break down by: path, title, referrer, browser, os, device, country, region, city, event, etc.'),
  },
  async ({ website_id, start_date, end_date, fields }) =>
    json(await getClient().runBreakdownReport(website_id, start_date, end_date, fields))
);

// ── Shares ────────────────────────────────────────────────────────────

server.tool(
  'get_website_shares',
  'List all public share pages for a website.',
  { website_id: websiteIdSchema },
  async ({ website_id }) => json(await getClient().getWebsiteShares(website_id))
);

server.tool(
  'get_share_by_id',
  'Get a specific share page by its ID.',
  { share_id: z.string().describe('The share ID.') },
  async ({ share_id }) => json(await getClient().getShareById(share_id))
);

// =====================================================================
// BLOCO D — 8 tools compostas (nosso diferencial exclusivo)
// =====================================================================

server.tool(
  'compare_periods',
  'Compare two time periods side-by-side: calculates growth/decline % for all metrics (pageviews, visitors, visits, bounces, totaltime).',
  {
    website_id: websiteIdSchema,
    current_start: z.string().describe('Current period start date (ISO 8601).'),
    current_end: z.string().describe('Current period end date.'),
    previous_start: z.string().describe('Previous period start date.'),
    previous_end: z.string().describe('Previous period end date.'),
  },
  async ({ website_id, current_start, current_end, previous_start, previous_end }) => {
    const c = getClient();
    const [current, previous] = await Promise.all([
      c.getStats(website_id, current_start, current_end),
      c.getStats(website_id, previous_start, previous_end),
    ]);
    const pct = (cur: number, prev: number) =>
      prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 10000) / 100;

    const comparison = {
      period: {
        current: { start: current_start, end: current_end },
        previous: { start: previous_start, end: previous_end },
      },
      metrics: {} as Record<string, { current: number; previous: number; change_pct: number }>,
    };

    for (const key of ['pageviews', 'visitors', 'visits', 'bounces', 'totaltime'] as const) {
      const cur = current[key].value;
      const prev = previous[key].value;
      comparison.metrics[key] = { current: cur, previous: prev, change_pct: pct(cur, prev) };
    }
    return json(comparison);
  }
);

server.tool(
  'get_visitor_demographics',
  'Complete visitor demographics in one call: country, browser, OS, device, and language breakdown.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    limit: z.number().int().optional().default(10).describe('Top N results per category.'),
  },
  async ({ website_id, start_date, end_date, limit }) => {
    const c = getClient();
    const [country, browser, os, device, language] = await Promise.all([
      c.getMetrics(website_id, start_date, end_date, 'country', limit),
      c.getMetrics(website_id, start_date, end_date, 'browser', limit),
      c.getMetrics(website_id, start_date, end_date, 'os', limit),
      c.getMetrics(website_id, start_date, end_date, 'device', limit),
      c.getMetrics(website_id, start_date, end_date, 'language', limit),
    ]);
    return json({ country, browser, os, device, language });
  }
);

server.tool(
  'get_traffic_sources',
  'Unified traffic sources: referrers, channels, and domains in one call.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    limit: z.number().int().optional().default(10).describe('Top N results per category.'),
  },
  async ({ website_id, start_date, end_date, limit }) => {
    const c = getClient();
    const [referrer, channel, domain] = await Promise.all([
      c.getMetrics(website_id, start_date, end_date, 'referrer', limit),
      c.getMetrics(website_id, start_date, end_date, 'channel', limit),
      c.getMetrics(website_id, start_date, end_date, 'domain', limit),
    ]);
    return json({ referrer, channel, domain });
  }
);

server.tool(
  'get_session_detail',
  'Complete session view: basic info + activity log + custom properties in one call.',
  {
    website_id: websiteIdSchema,
    session_id: z.string().describe('The session ID.'),
    start_date: startDateSchema,
    end_date: endDateSchema,
  },
  async ({ website_id, session_id, start_date, end_date }) => {
    const c = getClient();
    const [info, activity, properties] = await Promise.all([
      c.getSessionById(website_id, session_id),
      c.getSessionActivity(website_id, session_id, start_date, end_date),
      c.getSessionProperties(website_id, session_id),
    ]);
    return json({ info, activity, properties });
  }
);

server.tool(
  'get_event_detail',
  'Complete event analysis: event names/properties + values + time series in one call.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    event: z.string().describe('Event name to analyze.'),
    property_name: z.string().optional().describe('Property to get values for.'),
    unit: unitSchema,
    timezone: timezoneSchema,
  },
  async ({ website_id, start_date, end_date, event, property_name, unit, timezone }) => {
    const c = getClient();
    const promises: Promise<unknown>[] = [
      c.getEventDataEvents(website_id, start_date, end_date, event),
      c.getEventsSeries(website_id, start_date, end_date, unit, timezone),
    ];
    if (property_name) {
      promises.push(c.getEventDataValues(website_id, start_date, end_date, event, property_name));
    }
    const results = await Promise.all(promises);
    const result: Record<string, unknown> = {
      events: results[0],
      series: results[1],
    };
    if (property_name) result.values = results[2];
    return json(result);
  }
);

server.tool(
  'get_site_overview',
  'Full site dashboard in one call: stats + active visitors + top pages + top sources + top countries.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    limit: z.number().int().optional().default(10).describe('Top N for pages/sources/countries.'),
  },
  async ({ website_id, start_date, end_date, limit }) => {
    const c = getClient();
    const [stats, active, pages, sources, countries] = await Promise.all([
      c.getStats(website_id, start_date, end_date),
      c.getActive(website_id),
      c.getMetrics(website_id, start_date, end_date, 'path', limit),
      c.getMetrics(website_id, start_date, end_date, 'referrer', limit),
      c.getMetrics(website_id, start_date, end_date, 'country', limit),
    ]);
    return json({ stats, active, top_pages: pages, top_sources: sources, top_countries: countries });
  }
);

server.tool(
  'get_campaign_performance',
  'Combined UTM + attribution analysis for marketing campaigns in one call.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
  },
  async ({ website_id, start_date, end_date }) => {
    const c = getClient();
    const [utm, attribution] = await Promise.all([
      c.runUtmReport(website_id, start_date, end_date),
      c.runAttributionReport(website_id, start_date, end_date),
    ]);
    return json({ utm, attribution });
  }
);

server.tool(
  'get_page_analysis',
  'Deep page analysis: expanded metrics (views, bounces, time) + Core Web Vitals performance.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    limit: z.number().int().optional().default(10).describe('Top N pages.'),
  },
  async ({ website_id, start_date, end_date, limit }) => {
    const c = getClient();
    const [metrics, performance] = await Promise.all([
      c.getMetricsExpanded(website_id, start_date, end_date, 'path', limit),
      c.runPerformanceReport(website_id, start_date, end_date),
    ]);
    return json({ page_metrics: metrics, web_vitals: performance });
  }
);

// =====================================================================
// BLOCO E — 8 tools compostas estratégicas
// =====================================================================

server.tool(
  'get_growth_trends',
  'Multi-period growth analysis: compares 3 consecutive periods, calculates month-over-month growth rate, identifies trend direction (accelerating/decelerating/stagnating).',
  {
    website_id: websiteIdSchema,
    period1_start: z.string().describe('Oldest period start (ISO 8601).'),
    period1_end: z.string().describe('Oldest period end.'),
    period2_start: z.string().describe('Middle period start.'),
    period2_end: z.string().describe('Middle period end.'),
    period3_start: z.string().describe('Most recent period start.'),
    period3_end: z.string().describe('Most recent period end.'),
  },
  async ({ website_id, period1_start, period1_end, period2_start, period2_end, period3_start, period3_end }) => {
    const c = getClient();
    const [p1, p2, p3] = await Promise.all([
      c.getStats(website_id, period1_start, period1_end),
      c.getStats(website_id, period2_start, period2_end),
      c.getStats(website_id, period3_start, period3_end),
    ]);

    const pct = (cur: number, prev: number) =>
      prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 10000) / 100;

    const analyze = (key: 'pageviews' | 'visitors' | 'visits' | 'bounces' | 'totaltime') => {
      const v1 = p1[key].value, v2 = p2[key].value, v3 = p3[key].value;
      const growth1to2 = pct(v2, v1);
      const growth2to3 = pct(v3, v2);
      let trend: string;
      if (growth2to3 > growth1to2 + 5) trend = 'accelerating';
      else if (growth2to3 < growth1to2 - 5) trend = 'decelerating';
      else trend = 'stable';
      return {
        period1: v1, period2: v2, period3: v3,
        growth_p1_to_p2: growth1to2,
        growth_p2_to_p3: growth2to3,
        trend,
      };
    };

    return json({
      periods: {
        p1: { start: period1_start, end: period1_end },
        p2: { start: period2_start, end: period2_end },
        p3: { start: period3_start, end: period3_end },
      },
      pageviews: analyze('pageviews'),
      visitors: analyze('visitors'),
      visits: analyze('visits'),
      bounces: analyze('bounces'),
      totaltime: analyze('totaltime'),
    });
  }
);

server.tool(
  'get_engagement_score',
  'Site engagement score (0-100): combines bounce rate, avg time per visit, pages per visit into a single weighted score. Also returns individual KPIs.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
  },
  async ({ website_id, start_date, end_date }) => {
    const c = getClient();
    const [stats, sessionsStats] = await Promise.all([
      c.getStats(website_id, start_date, end_date),
      c.getSessionsStats(website_id, start_date, end_date),
    ]);

    const visits = stats.visits.value || 1;
    const bounceRate = Math.round((stats.bounces.value / visits) * 10000) / 100;
    const avgTimePerVisit = Math.round(stats.totaltime.value / visits);
    const pagesPerVisit = Math.round((stats.pageviews.value / visits) * 100) / 100;
    const totalEvents = sessionsStats.events.value;

    // Engagement score (0-100):
    // - Bounce rate inverted: lower bounce = higher score (40% weight)
    // - Avg time: capped at 300s for max score (30% weight)
    // - Pages per visit: capped at 5 for max score (20% weight)
    // - Events per visit: capped at 2 for max score (10% weight)
    const bounceScore = Math.max(0, 100 - bounceRate);
    const timeScore = Math.min(100, (avgTimePerVisit / 300) * 100);
    const pagesScore = Math.min(100, (pagesPerVisit / 5) * 100);
    const eventsPerVisit = totalEvents / visits;
    const eventsScore = Math.min(100, (eventsPerVisit / 2) * 100);

    const engagementScore = Math.round(
      bounceScore * 0.4 + timeScore * 0.3 + pagesScore * 0.2 + eventsScore * 0.1
    );

    let rating: string;
    if (engagementScore >= 80) rating = 'excellent';
    else if (engagementScore >= 60) rating = 'good';
    else if (engagementScore >= 40) rating = 'average';
    else if (engagementScore >= 20) rating = 'below_average';
    else rating = 'poor';

    return json({
      engagement_score: engagementScore,
      rating,
      kpis: {
        bounce_rate_pct: bounceRate,
        avg_time_per_visit_seconds: avgTimePerVisit,
        pages_per_visit: pagesPerVisit,
        events_per_visit: Math.round(eventsPerVisit * 100) / 100,
      },
      totals: {
        pageviews: stats.pageviews.value,
        visitors: stats.visitors.value,
        visits,
        bounces: stats.bounces.value,
        totaltime: stats.totaltime.value,
        events: totalEvents,
      },
    });
  }
);

server.tool(
  'get_content_performance',
  'Content performance analysis: for each top page, shows views, bounce rate, time, and whether it acts as entry door or exit door.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    limit: z.number().int().optional().default(20).describe('Top N pages to analyze.'),
  },
  async ({ website_id, start_date, end_date, limit }) => {
    const c = getClient();
    const [pages, entries, exits] = await Promise.all([
      c.getMetricsExpanded(website_id, start_date, end_date, 'path', limit),
      c.getMetricsExpanded(website_id, start_date, end_date, 'entry', limit),
      c.getMetricsExpanded(website_id, start_date, end_date, 'exit', limit),
    ]);

    const entryMap = new Map(entries.map(e => [e.name, e.visitors]));
    const exitMap = new Map(exits.map(e => [e.name, e.visitors]));

    const content = pages.map(p => {
      const visits = p.visits || 1;
      const bounceRate = Math.round((p.bounces / visits) * 10000) / 100;
      const avgTime = Math.round(p.totaltime / visits);
      const entryCount = entryMap.get(p.name) || 0;
      const exitCount = exitMap.get(p.name) || 0;

      let role: string;
      if (entryCount > exitCount * 1.5) role = 'entry_door';
      else if (exitCount > entryCount * 1.5) role = 'exit_door';
      else if (entryCount > 0 && exitCount > 0) role = 'passthrough';
      else role = 'internal';

      return {
        path: p.name,
        pageviews: p.pageviews,
        visitors: p.visitors,
        bounce_rate_pct: bounceRate,
        avg_time_seconds: avgTime,
        entries: entryCount,
        exits: exitCount,
        role,
      };
    });

    return json({ pages: content });
  }
);

server.tool(
  'get_acquisition_overview',
  'Complete acquisition overview: referrers + channels + landing pages + UTM campaigns combined.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    limit: z.number().int().optional().default(10).describe('Top N per category.'),
  },
  async ({ website_id, start_date, end_date, limit }) => {
    const c = getClient();
    const [referrers, channels, landingPages, utm] = await Promise.all([
      c.getMetrics(website_id, start_date, end_date, 'referrer', limit),
      c.getMetrics(website_id, start_date, end_date, 'channel', limit),
      c.getMetricsExpanded(website_id, start_date, end_date, 'entry', limit),
      c.runUtmReport(website_id, start_date, end_date),
    ]);

    return json({
      top_referrers: referrers,
      channels,
      top_landing_pages: landingPages,
      utm_campaigns: utm,
    });
  }
);

server.tool(
  'get_bounce_analysis',
  'Deep bounce analysis: identifies worst-performing pages, sources, and devices by bounce rate. Helps answer "where and why am I losing visitors?"',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    limit: z.number().int().optional().default(15).describe('Top N items per category.'),
  },
  async ({ website_id, start_date, end_date, limit }) => {
    const c = getClient();
    const [pages, referrers, devices] = await Promise.all([
      c.getMetricsExpanded(website_id, start_date, end_date, 'path', limit),
      c.getMetricsExpanded(website_id, start_date, end_date, 'referrer', limit),
      c.getMetricsExpanded(website_id, start_date, end_date, 'device', limit),
    ]);

    const calcBounce = (items: typeof pages) =>
      items
        .map(i => ({
          name: i.name,
          visits: i.visits,
          bounces: i.bounces,
          bounce_rate_pct: i.visits > 0 ? Math.round((i.bounces / i.visits) * 10000) / 100 : 0,
        }))
        .sort((a, b) => b.bounce_rate_pct - a.bounce_rate_pct);

    return json({
      by_page: calcBounce(pages),
      by_referrer: calcBounce(referrers),
      by_device: calcBounce(devices),
    });
  }
);

server.tool(
  'get_peak_hours_analysis',
  'Peak traffic analysis: identifies top 5 peak hours, best/worst days, dead hours, and recommends optimal publishing/campaign windows.',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    timezone: z.string().optional().default('America/Sao_Paulo').describe('Timezone.'),
  },
  async ({ website_id, start_date, end_date, timezone }) => {
    const c = getClient();
    const [weekly, stats] = await Promise.all([
      c.getSessionsWeekly(website_id, start_date, end_date, timezone),
      c.getStats(website_id, start_date, end_date),
    ]);

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Build flat list of all slots
    const slots: { day: string; dayIndex: number; hour: number; sessions: number }[] = [];
    for (let d = 0; d < weekly.length; d++) {
      for (let h = 0; h < (weekly[d]?.length || 0); h++) {
        slots.push({ day: dayNames[d] || `Day${d}`, dayIndex: d, hour: h, sessions: weekly[d][h] });
      }
    }

    // Top 5 peak slots
    const sorted = [...slots].sort((a, b) => b.sessions - a.sessions);
    const peak_slots = sorted.slice(0, 5).map(s => ({
      day: s.day, hour: `${String(s.hour).padStart(2, '0')}:00`, sessions: s.sessions,
    }));

    // Dead slots (lowest 5 with > 0 check)
    const dead_slots = [...slots].sort((a, b) => a.sessions - b.sessions).slice(0, 5).map(s => ({
      day: s.day, hour: `${String(s.hour).padStart(2, '0')}:00`, sessions: s.sessions,
    }));

    // Best/worst days
    const dailyTotals = dayNames.map((name, i) => ({
      day: name,
      total: weekly[i] ? weekly[i].reduce((sum: number, v: number) => sum + v, 0) : 0,
    }));
    dailyTotals.sort((a, b) => b.total - a.total);
    const best_day = dailyTotals[0];
    const worst_day = dailyTotals[dailyTotals.length - 1];

    // Best publishing window: top peak slot
    const topSlot = sorted[0];
    const recommendation = topSlot
      ? `Best time to publish: ${topSlot.day} around ${String(topSlot.hour).padStart(2, '0')}:00 (${timezone})`
      : 'Not enough data';

    return json({
      peak_slots,
      dead_slots,
      best_day,
      worst_day,
      daily_totals: dailyTotals,
      recommendation,
      total_visits: stats.visits.value,
    });
  }
);

server.tool(
  'get_geo_insights',
  'Deep geographic insights: hierarchical country → region → city breakdown with language correlation. Helps answer "which markets should I localize for?"',
  {
    website_id: websiteIdSchema,
    start_date: startDateSchema,
    end_date: endDateSchema,
    limit: z.number().int().optional().default(10).describe('Top N per level.'),
  },
  async ({ website_id, start_date, end_date, limit }) => {
    const c = getClient();
    const [countries, regions, cities, languages] = await Promise.all([
      c.getMetrics(website_id, start_date, end_date, 'country', limit),
      c.getMetrics(website_id, start_date, end_date, 'region', limit),
      c.getMetrics(website_id, start_date, end_date, 'city', limit),
      c.getMetrics(website_id, start_date, end_date, 'language', limit),
    ]);

    const totalVisitors = countries.reduce((sum, c) => sum + c.y, 0) || 1;
    const countriesWithPct = countries.map(c => ({
      country: c.x,
      visitors: c.y,
      share_pct: Math.round((c.y / totalVisitors) * 10000) / 100,
    }));

    return json({
      countries: countriesWithPct,
      top_regions: regions,
      top_cities: cities,
      languages,
      total_visitors: totalVisitors,
    });
  }
);

server.tool(
  'get_realtime_vs_baseline',
  'Compare current realtime traffic against historical baseline: shows if traffic is normal, spiking, or dropping. Answers "is something happening right now?"',
  {
    website_id: websiteIdSchema,
    baseline_start: z.string().describe('Baseline period start (e.g. 30 days ago).'),
    baseline_end: z.string().describe('Baseline period end (e.g. today).'),
  },
  async ({ website_id, baseline_start, baseline_end }) => {
    const c = getClient();
    const [realtime, stats] = await Promise.all([
      c.getRealtime(website_id),
      c.getStats(website_id, baseline_start, baseline_end),
    ]);

    const baselineStart = new Date(baseline_start).getTime();
    const baselineEnd = new Date(baseline_end).getTime();
    const baselineDays = Math.max(1, Math.round((baselineEnd - baselineStart) / 86400000));

    const avgDailyVisitors = Math.round(stats.visitors.value / baselineDays);
    const avgDailyPageviews = Math.round(stats.pageviews.value / baselineDays);

    // Realtime is 30 min, daily has 48 half-hours
    const expectedHalfHourVisitors = Math.round(avgDailyVisitors / 48);
    const expectedHalfHourPageviews = Math.round(avgDailyPageviews / 48);

    const currentVisitors = realtime.totals.visitors;
    const currentPageviews = realtime.totals.views;

    const visitorRatio = expectedHalfHourVisitors > 0
      ? Math.round((currentVisitors / expectedHalfHourVisitors) * 100)
      : currentVisitors > 0 ? 999 : 0;

    let status: string;
    if (visitorRatio >= 200) status = 'spike';
    else if (visitorRatio >= 120) status = 'above_normal';
    else if (visitorRatio >= 80) status = 'normal';
    else if (visitorRatio >= 40) status = 'below_normal';
    else status = 'very_low';

    return json({
      status,
      realtime: {
        visitors: currentVisitors,
        pageviews: currentPageviews,
        events: realtime.totals.events,
        countries: realtime.totals.countries,
        top_urls: realtime.urls,
        top_referrers: realtime.referrers,
      },
      baseline: {
        period: { start: baseline_start, end: baseline_end },
        days: baselineDays,
        avg_daily_visitors: avgDailyVisitors,
        avg_daily_pageviews: avgDailyPageviews,
        expected_30min_visitors: expectedHalfHourVisitors,
        expected_30min_pageviews: expectedHalfHourPageviews,
      },
      comparison: {
        visitor_ratio_pct: visitorRatio,
        status_description: status === 'spike'
          ? `Traffic is ${visitorRatio}% of expected — significant spike detected`
          : status === 'above_normal'
          ? `Traffic is ${visitorRatio}% of expected — slightly above normal`
          : status === 'normal'
          ? `Traffic is ${visitorRatio}% of expected — within normal range`
          : status === 'below_normal'
          ? `Traffic is ${visitorRatio}% of expected — below normal`
          : `Traffic is ${visitorRatio}% of expected — very low activity`,
      },
    });
  }
);

// =====================================================================
// PROMPTS
// =====================================================================

server.prompt(
  'analytics-report',
  'Generate a comprehensive analytics report for a website',
  { days: z.string().optional().default('30').describe('Number of days to analyze (default: 30)') },
  ({ days }) => ({
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
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
    days: z.string().optional().default('7').describe('Number of days (default: 7)'),
    limit: z.string().optional().default('10').describe('Number of pages (default: 10)'),
  },
  ({ days, limit }) => ({
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Show the top ${limit} most visited pages over the last ${days} days.`,
        },
      },
    ],
  })
);

server.prompt(
  'visitor-insights',
  'Break down visitors by country, device, browser, and OS',
  { days: z.string().optional().default('30').describe('Number of days (default: 30)') },
  ({ days }) => ({
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
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
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: 'Check the current active visitors on the website and provide a summary.',
        },
      },
    ],
  })
);

// =====================================================================
// RESOURCES
// =====================================================================

server.resource(
  'websites-list',
  'umami://websites',
  { description: 'List of all tracked websites', mimeType: 'application/json' },
  async () => ({
    contents: [{
      uri: 'umami://websites',
      text: JSON.stringify(await getClient().getWebsites(true), null, 2),
      mimeType: 'application/json',
    }],
  })
);

server.resource(
  'teams-list',
  'umami://teams',
  { description: 'List of all teams', mimeType: 'application/json' },
  async () => ({
    contents: [{
      uri: 'umami://teams',
      text: JSON.stringify(await getClient().getTeams(), null, 2),
      mimeType: 'application/json',
    }],
  })
);

server.resource(
  'reports-list',
  'umami://reports',
  { description: 'List of all saved reports', mimeType: 'application/json' },
  async () => ({
    contents: [{
      uri: 'umami://reports',
      text: JSON.stringify(await getClient().getReports(), null, 2),
      mimeType: 'application/json',
    }],
  })
);

// =====================================================================
// START
// =====================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
