import type { AppConfig } from '../config.js';

export interface XApiErrorBody {
  title?: string;
  detail?: string;
  type?: string;
  status?: number;
  errors?: unknown;
}

export class XApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'XApiError';
  }
}

export class XClient {
  constructor(private readonly config: AppConfig) {}

  async get<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(`${this.config.xApiBaseUrl}${path}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(new URL(`${this.config.xApiBaseUrl}${path}`), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private async request<T>(url: URL, init: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        authorization: `Bearer ${this.config.xUserAccessToken}`,
        accept: 'application/json',
        ...init.headers,
      },
    });

    const raw = await response.text();
    let payload: unknown = undefined;
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = raw;
      }
    }

    if (!response.ok) {
      const errorBody = payload as XApiErrorBody | undefined;
      const detail = errorBody && typeof errorBody === 'object' ? errorBody.detail ?? errorBody.title : undefined;
      throw new XApiError(detail ?? `X API request failed with HTTP ${response.status}`, response.status, payload);
    }

    return payload as T;
  }
}
