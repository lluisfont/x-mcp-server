import type { AppConfig } from '../config.js';
import { readFile, writeFile } from 'node:fs/promises';

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
  private accessToken: string;
  private refreshToken?: string;

  constructor(private readonly config: AppConfig) {
    this.accessToken = config.xUserAccessToken;
    this.refreshToken = config.xRefreshToken;
  }

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

  private async request<T>(url: URL, init: RequestInit, allowRefresh = true): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        authorization: `Bearer ${this.accessToken}`,
        accept: 'application/json',
        ...init.headers,
      },
    });

    if (response.status === 401 && allowRefresh && this.canRefresh()) {
      await this.refreshAccessToken();
      return this.request<T>(url, init, false);
    }

    const payload = await parseResponsePayload(response);

    if (!response.ok) {
      const errorBody = payload as XApiErrorBody | undefined;
      const detail = errorBody && typeof errorBody === 'object' ? errorBody.detail ?? errorBody.title : undefined;
      throw new XApiError(detail ?? `X API request failed with HTTP ${response.status}`, response.status, payload);
    }

    return payload as T;
  }

  private canRefresh(): boolean {
    return Boolean(this.refreshToken && this.config.xOAuthClientId);
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken || !this.config.xOAuthClientId) {
      throw new Error('Cannot refresh X access token without X refresh token and OAuth client ID.');
    }

    const response = await fetch(new URL(`${this.config.xApiBaseUrl}/2/oauth2/token`), {
      method: 'POST',
      headers: this.tokenHeaders(),
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.config.xOAuthClientId,
      }),
    });

    const payload = await parseResponsePayload(response) as TokenPayload;

    if (!response.ok || !payload.access_token) {
      const detail = typeof payload === 'object' && payload ? JSON.stringify(payload) : String(payload);
      throw new XApiError(`X OAuth refresh failed with HTTP ${response.status}: ${detail}`, response.status, payload);
    }

    this.accessToken = payload.access_token;
    this.refreshToken = payload.refresh_token ?? this.refreshToken;
    process.env[this.config.xAccessTokenEnvKey] = this.accessToken;
    process.env[this.config.xRefreshTokenEnvKey] = this.refreshToken;
    await updateDotEnv(this.config.xAccessTokenEnvKey, this.accessToken, this.config.xRefreshTokenEnvKey, this.refreshToken);
  }

  private tokenHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    };

    if (this.config.xOAuthClientSecret) {
      headers.authorization = `Basic ${Buffer.from(`${this.config.xOAuthClientId}:${this.config.xOAuthClientSecret}`).toString('base64')}`;
    }

    return headers;
  }
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const raw = await response.text();

  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

async function updateDotEnv(accessKey: string, accessToken: string, refreshKey: string, refreshToken: string): Promise<void> {
  const path = '.env';
  const existing = await readFile(path, 'utf8').catch(() => '');
  const updated = upsertEnv(upsertEnv(existing, accessKey, accessToken), refreshKey, refreshToken);

  await writeFile(path, updated);
}

function upsertEnv(contents: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${escapeRegExp(key)}=.*$`, 'm');

  if (pattern.test(contents)) {
    return contents.replace(pattern, line);
  }

  const suffix = contents.endsWith('\n') || contents.length === 0 ? '' : '\n';
  return `${contents}${suffix}${line}\n`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface TokenPayload {
  access_token?: string;
  refresh_token?: string;
}
