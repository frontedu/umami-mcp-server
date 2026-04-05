/**
 * Umami Analytics API Client
 * Supports both API key (Cloud) and username/password (self-hosted) authentication.
 */

export interface UmamiConfig {
  apiKey?: string;
  apiBase?: string;
  url?: string;
  username?: string;
  password?: string;
}

export interface Website {
  id: string;
  name: string;
  domain: string;
  createdAt: string;
}

export interface Stats {
  pageviews: { value: number; prev?: number };
  visitors: { value: number; prev?: number };
  visits: { value: number; prev?: number };
  bounces: { value: number; prev?: number };
  totaltime: { value: number; prev?: number };
}

export interface PageViewEntry {
  t: string;
  y: number;
}

export interface PageViewsResponse {
  pageviews: PageViewEntry[];
  sessions: PageViewEntry[];
}

export interface Metric {
  x: string;
  y: number;
}

export interface ActiveResponse {
  x: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface EventSeries {
  x: string;
  t: string;
  y: number;
}

export interface ExpandedMetric {
  name: string;
  pageviews: number;
  visitors: number;
  visits: number;
  bounces: number;
  totaltime: number;
}

export interface Session {
  id: string;
  websiteId: string;
  hostname: string;
  browser: string;
  os: string;
  device: string;
  screen: string;
  language: string;
  country: string;
  region: string;
  city: string;
  firstAt: string;
  lastAt: string;
  visits: number;
  views: number;
  createdAt: string;
}

export interface SessionsStats {
  pageviews: { value: number };
  visitors: { value: number };
  visits: { value: number };
  countries: { value: number };
  events: { value: number };
}

export interface RealtimeData {
  countries: Record<string, number>;
  urls: Record<string, number>;
  referrers: Record<string, number>;
  events: unknown[];
  series: { views: number[]; visitors: number[] };
  totals: { views: number; visitors: number; events: number; countries: number };
  timestamp: number;
}

export interface FunnelStep {
  type: 'path' | 'event';
  value: string;
}

export class UmamiClient {
  private baseUrl: string;
  private apiKey?: string;
  private username?: string;
  private password?: string;
  private token?: string;

  constructor(config: UmamiConfig) {
    if (config.apiKey) {
      this.apiKey = config.apiKey;
      this.baseUrl = (config.apiBase || 'https://api.umami.is/v1').replace(/\/+$/, '');
    } else if (config.url && config.username && config.password) {
      this.baseUrl = config.url.replace(/\/+$/, '');
      this.username = config.username;
      this.password = config.password;
    } else {
      throw new Error(
        'Missing configuration: provide UMAMI_API_KEY (for Cloud) or UMAMI_URL + UMAMI_USERNAME + UMAMI_PASSWORD (for self-hosted)'
      );
    }
  }

  private async authenticate(): Promise<void> {
    if (this.apiKey || this.token) return;

    const res = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: this.username, password: this.password }),
    });

    if (!res.ok) {
      throw new Error(`Authentication failed with status ${res.status}`);
    }

    const data = (await res.json()) as { token: string };
    this.token = data.token;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.apiKey) {
      headers['x-umami-api-key'] = this.apiKey;
    } else if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private async request<T>(path: string, params?: Record<string, string>): Promise<T> {
    await this.authenticate();

    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== '') url.searchParams.set(k, v);
      }
    }

    const res = await fetch(url.toString(), {
      headers: this.getHeaders(),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Umami API error ${res.status}: ${body.slice(0, 500)}`);
    }

    return res.json() as Promise<T>;
  }

  private async postRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
    await this.authenticate();

    const url = new URL(`${this.baseUrl}${path}`);
    const headers = this.getHeaders();
    headers['Content-Type'] = 'application/json';

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Umami API error ${res.status}: ${text.slice(0, 500)}`);
    }

    return res.json() as Promise<T>;
  }

  /** Validate ID format to prevent path traversal */
  static validateId(id: string, name = 'ID'): void {
    if (!id || id.length > 50) throw new Error(`Invalid ${name}`);
    if (!/^[0-9a-fA-F-]+$/.test(id)) throw new Error(`Invalid ${name}`);
  }

  // ── Auth ──────────────────────────────────────────────────────────────

  async verifyToken(): Promise<unknown> {
    return this.request<unknown>('/auth/verify');
  }

  async getMe(): Promise<unknown> {
    return this.request<unknown>('/me');
  }

  // ── Websites ────────────────────���─────────────────────────────────────

  async getWebsites(includeTeams = false): Promise<Website[]> {
    const params: Record<string, string> = {};
    if (includeTeams) params['includeTeams'] = 'true';
    const data = await this.request<{ data: Website[] } | Website[]>('/websites', params);
    return Array.isArray(data) ? data : data.data;
  }

  async getWebsiteById(websiteId: string): Promise<unknown> {
    UmamiClient.validateId(websiteId, 'website ID');
    return this.request<unknown>(`/websites/${websiteId}`);
  }

  async getStats(websiteId: string, startDate: string, endDate: string): Promise<Stats> {
    UmamiClient.validateId(websiteId, 'website ID');
    return this.request<Stats>(`/websites/${websiteId}/stats`, {
      startAt: normalizeDate(startDate),
      endAt: normalizeDate(endDate),
    });
  }

  async getPageviews(
    websiteId: string,
    startDate: string,
    endDate: string,
    unit = 'day'
  ): Promise<PageViewsResponse> {
    UmamiClient.validateId(websiteId, 'website ID');
    return this.request<PageViewsResponse>(`/websites/${websiteId}/pageviews`, {
      startAt: normalizeDate(startDate),
      endAt: normalizeDate(endDate),
      unit,
    });
  }

  async getMetrics(
    websiteId: string,
    startDate: string,
    endDate: string,
    type: string,
    limit = 10
  ): Promise<Metric[]> {
    UmamiClient.validateId(websiteId, 'website ID');
    const metricType = type === 'url' ? 'path' : type;
    return this.request<Metric[]>(`/websites/${websiteId}/metrics`, {
      startAt: normalizeDate(startDate),
      endAt: normalizeDate(endDate),
      type: metricType,
      limit: String(limit),
    });
  }

  async getActive(websiteId: string): Promise<ActiveResponse[]> {
    UmamiClient.validateId(websiteId, 'website ID');
    const data = await this.request<ActiveResponse | ActiveResponse[]>(
      `/websites/${websiteId}/active`
    );
    return Array.isArray(data) ? data : [data];
  }

  async getDateRange(websiteId: string): Promise<DateRange> {
    UmamiClient.validateId(websiteId, 'website ID');
    return this.request<DateRange>(`/websites/${websiteId}/daterange`);
  }

  async getEventsSeries(
    websiteId: string,
    startDate: string,
    endDate: string,
    unit = 'day',
    timezone = 'UTC'
  ): Promise<EventSeries[]> {
    UmamiClient.validateId(websiteId, 'website ID');
    return this.request<EventSeries[]>(`/websites/${websiteId}/events/series`, {
      startAt: normalizeDate(startDate),
      endAt: normalizeDate(endDate),
      unit,
      timezone,
    });
  }

  async getMetricsExpanded(
    websiteId: string,
    startDate: string,
    endDate: string,
    type: string,
    limit = 10
  ): Promise<ExpandedMetric[]> {
    UmamiClient.validateId(websiteId, 'website ID');
    const metricType = type === 'url' ? 'path' : type;
    return this.request<ExpandedMetric[]>(`/websites/${websiteId}/metrics/expanded`, {
      startAt: normalizeDate(startDate),
      endAt: normalizeDate(endDate),
      type: metricType,
      limit: String(limit),
    });
  }

  async getSessions(
    websiteId: string,
    startDate: string,
    endDate: string,
    page = 1,
    pageSize = 20
  ): Promise<Session[]> {
    UmamiClient.validateId(websiteId, 'website ID');
    const clampedPageSize = Math.min(Math.max(pageSize, 1), 200);
    const data = await this.request<{ data: Session[] } | Session[]>(
      `/websites/${websiteId}/sessions`,
      {
        startAt: normalizeDate(startDate),
        endAt: normalizeDate(endDate),
        page: String(page),
        pageSize: String(clampedPageSize),
      }
    );
    return Array.isArray(data) ? data : data.data;
  }

  async getSessionsStats(
    websiteId: string,
    startDate: string,
    endDate: string
  ): Promise<SessionsStats> {
    UmamiClient.validateId(websiteId, 'website ID');
    return this.request<SessionsStats>(`/websites/${websiteId}/sessions/stats`, {
      startAt: normalizeDate(startDate),
      endAt: normalizeDate(endDate),
    });
  }

  async getSessionsWeekly(
    websiteId: string,
    startDate: string,
    endDate: string,
    timezone = 'UTC'
  ): Promise<number[][]> {
    UmamiClient.validateId(websiteId, 'website ID');
    return this.request<number[][]>(`/websites/${websiteId}/sessions/weekly`, {
      startAt: normalizeDate(startDate),
      endAt: normalizeDate(endDate),
      timezone,
    });
  }

  // ── Events (new) ─────────────────────────────────────────────────────

  async getEvents(
    websiteId: string,
    startDate: string,
    endDate: string,
    page = 1,
    pageSize = 20,
    search?: string
  ): Promise<unknown[]> {
    UmamiClient.validateId(websiteId, 'website ID');
    const params: Record<string, string> = {
      startAt: normalizeDate(startDate),
      endAt: normalizeDate(endDate),
      page: String(page),
      pageSize: String(Math.min(Math.max(pageSize, 1), 200)),
    };
    if (search) params.search = search;
    const data = await this.request<{ data: unknown[] } | unknown[]>(
      `/websites/${websiteId}/events`,
      params
    );
    return Array.isArray(data) ? data : data.data;
  }

  async getEventsStats(
    websiteId: string,
    startDate: string,
    endDate: string
  ): Promise<unknown> {
    UmamiClient.validateId(websiteId, 'website ID');
    return this.request<unknown>(`/websites/${websiteId}/events/stats`, {
      startAt: normalizeDate(startDate),
      endAt: normalizeDate(endDate),
    });
  }

  async getEventDataById(websiteId: string, eventId: string): Promise<unknown> {
    UmamiClient.validateId(websiteId, 'website ID');
    UmamiClient.validateId(eventId, 'event ID');
    return this.request<unknown>(`/websites/${websiteId}/event-data/${eventId}`);
  }

  async getEventDataEvents(
    websiteId: string,
    startDate: string,
    endDate: string,
    event?: string
  ): Promise<unknown[]> {
    UmamiClient.validateId(websiteId, 'website ID');
    const params: Record<string, string> = {
      startAt: normalizeDate(startDate),
      endAt: normalizeDate(endDate),
    };
    if (event) params.event = event;
    return this.request<unknown[]>(`/websites/${websiteId}/event-data/events`, params);
  }

  async getEventDataFields(
    websiteId: string,
    startDate: string,
    endDate: string
  ): Promise<unknown[]> {
    UmamiClient.validateId(websiteId, 'website ID');
    return this.request<unknown[]>(`/websites/${websiteId}/event-data/fields`, {
      startAt: normalizeDate(startDate),
      endAt: normalizeDate(endDate),
    });
  }

  async getEventDataProperties(
    websiteId: string,
    startDate: string,
    endDate: string
  ): Promise<unknown[]> {
    UmamiClient.validateId(websiteId, 'website ID');
    return this.request<unknown[]>(`/websites/${websiteId}/event-data/properties`, {
      startAt: normalizeDate(startDate),
      endAt: normalizeDate(endDate),
    });
  }

  async getEventDataValues(
    websiteId: string,
    startDate: string,
    endDate: string,
    event: string,
    propertyName: string
  ): Promise<unknown[]> {
    UmamiClient.validateId(websiteId, 'website ID');
    return this.request<unknown[]>(`/websites/${websiteId}/event-data/values`, {
      startAt: normalizeDate(startDate),
      endAt: normalizeDate(endDate),
      event,
      propertyName,
    });
  }

  async getEventDataStats(
    websiteId: string,
    startDate: string,
    endDate: string
  ): Promise<unknown> {
    UmamiClient.validateId(websiteId, 'website ID');
    return this.request<unknown>(`/websites/${websiteId}/event-data/stats`, {
      startAt: normalizeDate(startDate),
      endAt: normalizeDate(endDate),
    });
  }

  // ── Sessions (new) ───────────────────────────────────────────────────

  async getSessionById(websiteId: string, sessionId: string): Promise<unknown> {
    UmamiClient.validateId(websiteId, 'website ID');
    UmamiClient.validateId(sessionId, 'session ID');
    return this.request<unknown>(`/websites/${websiteId}/sessions/${sessionId}`);
  }

  async getSessionActivity(
    websiteId: string,
    sessionId: string,
    startDate: string,
    endDate: string
  ): Promise<unknown[]> {
    UmamiClient.validateId(websiteId, 'website ID');
    UmamiClient.validateId(sessionId, 'session ID');
    return this.request<unknown[]>(
      `/websites/${websiteId}/sessions/${sessionId}/activity`,
      {
        startAt: normalizeDate(startDate),
        endAt: normalizeDate(endDate),
      }
    );
  }

  async getSessionProperties(websiteId: string, sessionId: string): Promise<unknown> {
    UmamiClient.validateId(websiteId, 'website ID');
    UmamiClient.validateId(sessionId, 'session ID');
    return this.request<unknown>(`/websites/${websiteId}/sessions/${sessionId}/properties`);
  }

  async getSessionDataProperties(
    websiteId: string,
    startDate: string,
    endDate: string
  ): Promise<unknown[]> {
    UmamiClient.validateId(websiteId, 'website ID');
    return this.request<unknown[]>(`/websites/${websiteId}/session-data/properties`, {
      startAt: normalizeDate(startDate),
      endAt: normalizeDate(endDate),
    });
  }

  async getSessionDataValues(
    websiteId: string,
    startDate: string,
    endDate: string,
    propertyName: string
  ): Promise<unknown[]> {
    UmamiClient.validateId(websiteId, 'website ID');
    return this.request<unknown[]>(`/websites/${websiteId}/session-data/values`, {
      startAt: normalizeDate(startDate),
      endAt: normalizeDate(endDate),
      propertyName,
    });
  }

  // ── Realtime ───────���───────────────────────────────��──────────────────

  async getRealtime(websiteId: string): Promise<RealtimeData> {
    UmamiClient.validateId(websiteId, 'website ID');
    return this.request<RealtimeData>(`/realtime/${websiteId}`);
  }

  // ── Teams ─────────────────────────────────────────────────────────────

  async getTeams(page = 1, pageSize = 20): Promise<unknown[]> {
    const data = await this.request<{ data: unknown[] } | unknown[]>('/teams', {
      page: String(page),
      pageSize: String(pageSize),
    });
    return Array.isArray(data) ? data : data.data;
  }

  async getTeamById(teamId: string): Promise<unknown> {
    UmamiClient.validateId(teamId, 'team ID');
    return this.request<unknown>(`/teams/${teamId}`);
  }

  async getTeamUsers(teamId: string): Promise<unknown[]> {
    UmamiClient.validateId(teamId, 'team ID');
    const data = await this.request<{ data: unknown[] } | unknown[]>(`/teams/${teamId}/users`);
    return Array.isArray(data) ? data : data.data;
  }

  async getTeamWebsites(teamId: string): Promise<unknown[]> {
    UmamiClient.validateId(teamId, 'team ID');
    const data = await this.request<{ data: unknown[] } | unknown[]>(
      `/teams/${teamId}/websites`
    );
    return Array.isArray(data) ? data : data.data;
  }

  // ── Reports ───────��───────────────────────────────────────────────────

  async getReports(websiteId?: string): Promise<unknown[]> {
    const params: Record<string, string> = {};
    if (websiteId) {
      UmamiClient.validateId(websiteId, 'website ID');
      params.websiteId = websiteId;
    }
    const data = await this.request<{ data: unknown[] } | unknown[]>('/reports', params);
    return Array.isArray(data) ? data : data.data;
  }

  async getReportById(reportId: string): Promise<unknown> {
    UmamiClient.validateId(reportId, 'report ID');
    return this.request<unknown>(`/reports/${reportId}`);
  }

  async runFunnelReport(
    websiteId: string,
    startDate: string,
    endDate: string,
    steps: FunnelStep[],
    window = 60
  ): Promise<unknown> {
    UmamiClient.validateId(websiteId, 'website ID');
    return this.postRequest<unknown>('/reports/funnel', {
      websiteId,
      dateRange: { startDate, endDate },
      steps,
      window,
    });
  }

  async runRetentionReport(
    websiteId: string,
    startDate: string,
    endDate: string
  ): Promise<unknown> {
    UmamiClient.validateId(websiteId, 'website ID');
    return this.postRequest<unknown>('/reports/retention', {
      websiteId,
      dateRange: { startDate, endDate },
    });
  }

  async runJourneyReport(
    websiteId: string,
    startDate: string,
    endDate: string,
    steps: number,
    startStep: string,
    endStep?: string
  ): Promise<unknown> {
    UmamiClient.validateId(websiteId, 'website ID');
    const body: Record<string, unknown> = {
      websiteId,
      dateRange: { startDate, endDate },
      steps,
      startStep,
    };
    if (endStep) body.endStep = endStep;
    return this.postRequest<unknown>('/reports/journey', body);
  }

  async runUtmReport(
    websiteId: string,
    startDate: string,
    endDate: string
  ): Promise<unknown> {
    UmamiClient.validateId(websiteId, 'website ID');
    return this.postRequest<unknown>('/reports/utm', {
      websiteId,
      dateRange: { startDate, endDate },
    });
  }

  async runGoalsReport(
    websiteId: string,
    startDate: string,
    endDate: string
  ): Promise<unknown> {
    UmamiClient.validateId(websiteId, 'website ID');
    return this.postRequest<unknown>('/reports/goal', {
      websiteId,
      dateRange: { startDate, endDate },
    });
  }

  async runRevenueReport(
    websiteId: string,
    startDate: string,
    endDate: string,
    currency: string
  ): Promise<unknown> {
    UmamiClient.validateId(websiteId, 'website ID');
    return this.postRequest<unknown>('/reports/revenue', {
      websiteId,
      dateRange: { startDate, endDate },
      currency,
    });
  }

  async runPerformanceReport(
    websiteId: string,
    startDate: string,
    endDate: string,
    metric?: string
  ): Promise<unknown> {
    UmamiClient.validateId(websiteId, 'website ID');
    const body: Record<string, unknown> = {
      websiteId,
      dateRange: { startDate, endDate },
    };
    if (metric) body.metric = metric;
    return this.postRequest<unknown>('/reports/performance', body);
  }

  async runAttributionReport(
    websiteId: string,
    startDate: string,
    endDate: string
  ): Promise<unknown> {
    UmamiClient.validateId(websiteId, 'website ID');
    return this.postRequest<unknown>('/reports/attribution', {
      websiteId,
      dateRange: { startDate, endDate },
    });
  }

  async runBreakdownReport(
    websiteId: string,
    startDate: string,
    endDate: string,
    fields: string[]
  ): Promise<unknown> {
    UmamiClient.validateId(websiteId, 'website ID');
    return this.postRequest<unknown>('/reports/breakdown', {
      websiteId,
      dateRange: { startDate, endDate },
      fields,
    });
  }

  // ── Shares ──────────��─────────────────────────��───────────────────────

  async getWebsiteShares(websiteId: string): Promise<unknown[]> {
    UmamiClient.validateId(websiteId, 'website ID');
    const data = await this.request<{ data: unknown[] } | unknown[]>(
      `/websites/${websiteId}/shares`
    );
    return Array.isArray(data) ? data : data.data;
  }

  async getShareById(shareId: string): Promise<unknown> {
    UmamiClient.validateId(shareId, 'share ID');
    return this.request<unknown>(`/share/id/${shareId}`);
  }
}

function normalizeDate(input: string): string {
  if (!input) return input;

  // Already a unix timestamp in milliseconds (13+ digits)
  if (/^\d{13,}$/.test(input)) return input;

  // Try parsing as date
  const d = new Date(input);
  if (!isNaN(d.getTime())) return String(d.getTime());

  return input;
}
