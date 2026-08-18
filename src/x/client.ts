import { execFile } from 'node:child_process';
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
  private cachedXurlToken?: string;

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

  async getAuthStatus(): Promise<Record<string, unknown>> {
    if (this.config.xAuthProvider === 'xurl') {
      const token = await this.getAccessToken();
      return {
        provider: 'xurl',
        xurlApp: this.config.xurlApp,
        xurlUsername: this.config.xurlUsername,
        tokenAvailable: Boolean(token),
        tokenRefreshManagedBy: 'xurl',
      };
    }

    return {
      provider: 'env',
      tokenAvailable: Boolean(this.config.xUserAccessToken),
      tokenRefreshConfigured: Boolean(this.config.xRefreshToken && this.config.xOAuthClientId),
    };
  }

  private async request<T>(url: URL, init: RequestInit, allowRetry = true): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        authorization: `Bearer ${await this.getAccessToken()}`,
        accept: 'application/json',
        ...init.headers,
      },
    });

    if (response.status === 401 && allowRetry && this.config.xAuthProvider === 'xurl') {
      this.cachedXurlToken = undefined;
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

  private async getAccessToken(): Promise<string> {
    if (this.config.xAuthProvider === 'xurl') {
      this.cachedXurlToken ??= await getXurlToken(this.config);
      return this.cachedXurlToken;
    }

    if (!this.config.xUserAccessToken) {
      throw new Error('No X access token configured.');
    }

    return this.config.xUserAccessToken;
  }
}

async function getXurlToken(config: AppConfig): Promise<string> {
  if (!config.xurlApp) {
    throw new Error('X_AUTH_PROVIDER=xurl requires X_XURL_APP.');
  }

  const args = ['-y', '@xdevplatform/xurl', 'token', '--app', config.xurlApp];

  if (config.xurlUsername) {
    args.push('-u', config.xurlUsername);
  }

  try {
    const stdout = await execFileText('npx', args, {
      windowsHide: true,
      timeout: 120_000,
      maxBuffer: 1024 * 1024,
    });
    const token = stdout.trim();

    if (!token) {
      throw new Error('xurl token returned an empty token.');
    }

    return token;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get X access token from xurl. Run xurl auth oauth2 for the configured app/user. ${message}`);
  }
}

function execFileText(file: string, args: string[], options: { windowsHide: boolean; timeout: number; maxBuffer: number }): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(file, args, options, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }

      resolve(stdout);
    });
  });
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
