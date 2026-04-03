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

  private async request<T>(path: string, params?: Record<string, string>): Promise<T> {
    await this.authenticate();

    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== '') url.searchParams.set(k, v);
      }
    }

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.apiKey) {
      headers['x-umami-api-key'] = this.apiKey;
    } else if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(30_000) });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Umami API error ${res.status}: ${body.slice(0, 500)}`);
    }

    return res.json() as Promise<T>;
  }

  /** Validate websiteId to prevent path traversal */
  static validateWebsiteId(id: string): void {
    if (!id || id.length > 36) throw new Error('Invalid website ID');
    if (!/^[0-9a-fA-F-]+$/.test(id)) throw new Error('Invalid website ID');
  }

  async getWebsites(includeTeams = false): Promise<Website[]> {
    const params: Record<string, string> = {};
    if (includeTeams) params['includeTeams'] = 'true';

    const data = await this.request<{ data: Website[] } | Website[]>('/websites', params);
    return Array.isArray(data) ? data : data.data;
  }

  async getStats(websiteId: string, startDate: string, endDate: string): Promise<Stats> {
    UmamiClient.validateWebsiteId(websiteId);
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
    UmamiClient.validateWebsiteId(websiteId);
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
    UmamiClient.validateWebsiteId(websiteId);
    const metricType = type === 'url' ? 'path' : type;

    return this.request<Metric[]>(`/websites/${websiteId}/metrics`, {
      startAt: normalizeDate(startDate),
      endAt: normalizeDate(endDate),
      type: metricType,
      limit: String(limit),
    });
  }

  async getActive(websiteId: string): Promise<ActiveResponse[]> {
    UmamiClient.validateWebsiteId(websiteId);
    const data = await this.request<ActiveResponse | ActiveResponse[]>(
      `/websites/${websiteId}/active`
    );
    return Array.isArray(data) ? data : [data];
  }

  async getDateRange(websiteId: string): Promise<DateRange> {
    UmamiClient.validateWebsiteId(websiteId);
    return this.request<DateRange>(`/websites/${websiteId}/daterange`);
  }

  async getEventsSeries(
    websiteId: string,
    startDate: string,
    endDate: string,
    unit = 'day',
    timezone = 'UTC'
  ): Promise<EventSeries[]> {
    UmamiClient.validateWebsiteId(websiteId);
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
    UmamiClient.validateWebsiteId(websiteId);
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
    UmamiClient.validateWebsiteId(websiteId);
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
    UmamiClient.validateWebsiteId(websiteId);
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
    UmamiClient.validateWebsiteId(websiteId);
    return this.request<number[][]>(`/websites/${websiteId}/sessions/weekly`, {
      startAt: normalizeDate(startDate),
      endAt: normalizeDate(endDate),
      timezone,
    });
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
