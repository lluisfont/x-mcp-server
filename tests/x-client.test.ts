import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFile, writeFile } from 'node:fs/promises';
import { XApiError, XClient } from '../src/x/client.js';
import type { AppConfig } from '../src/config.js';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue(''),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

const config: AppConfig = {
  xApiBaseUrl: 'https://api.x.com',
  xUserAccessToken: 'token',
  xAccessTokenEnvKey: 'X_ACCOUNT_DEFAULT_USER_ACCESS_TOKEN',
  xRefreshTokenEnvKey: 'X_ACCOUNT_DEFAULT_REFRESH_TOKEN',
  activeAccount: 'default',
  configuredAccounts: ['default'],
  mode: 'read-only',
  transport: 'stdio',
  httpPort: 3001,
  httpPath: '/mcp',
};

describe('XClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(readFile).mockResolvedValue('');
    vi.mocked(writeFile).mockResolvedValue(undefined);
  });

  it('sends bearer auth and query parameters for GET requests', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { id: '123' } }), { status: 200 }),
    );

    const client = new XClient(config);
    await expect(client.get('/2/users/me', { 'user.fields': 'username', max_results: 10 })).resolves.toEqual({
      data: { id: '123' },
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://api.x.com/2/users/me?user.fields=username&max_results=10');
    expect(init?.method).toBe('GET');
    expect(init?.headers).toMatchObject({
      authorization: 'Bearer token',
      accept: 'application/json',
    });
  });

  it('sends JSON POST bodies', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { id: 'tweet-id' } }), { status: 201 }),
    );

    const client = new XClient(config);
    await expect(client.post('/2/tweets', { text: 'hello' })).resolves.toEqual({
      data: { id: 'tweet-id' },
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({ text: 'hello' }));
    expect(init?.headers).toMatchObject({
      authorization: 'Bearer token',
      accept: 'application/json',
      'content-type': 'application/json',
    });
  });

  it('throws XApiError with parsed API details for failed responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ title: 'Unauthorized', detail: 'Bad token' }), { status: 401 }),
    );

    const client = new XClient(config);
    await expect(client.get('/2/users/me')).rejects.toMatchObject({
      name: 'XApiError',
      message: 'Bad token',
      status: 401,
      body: { title: 'Unauthorized', detail: 'Bad token' },
    });
  });

  it('refreshes the access token once after a 401 and retries the original request', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ title: 'Unauthorized', detail: 'Expired token' }), { status: 401 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
        }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { id: '123' } }), { status: 200 }),
      );

    vi.mocked(readFile).mockResolvedValue('X_ACCOUNT_DEFAULT_USER_ACCESS_TOKEN=old\nX_ACCOUNT_DEFAULT_REFRESH_TOKEN=old-refresh\n');

    const client = new XClient({
      ...config,
      xRefreshToken: 'refresh-token',
      xOAuthClientId: 'client-id',
    });

    await expect(client.get('/2/users/me')).resolves.toEqual({ data: { id: '123' } });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toBe('https://api.x.com/2/oauth2/token');
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
      },
    });
    expect(String(fetchMock.mock.calls[1][1]?.body)).toBe('grant_type=refresh_token&refresh_token=refresh-token&client_id=client-id');
    expect(fetchMock.mock.calls[2][1]?.headers).toMatchObject({
      authorization: 'Bearer new-access-token',
    });
    expect(writeFile).toHaveBeenCalledWith(
      '.env',
      'X_ACCOUNT_DEFAULT_USER_ACCESS_TOKEN=new-access-token\nX_ACCOUNT_DEFAULT_REFRESH_TOKEN=new-refresh-token\n',
    );
  });
});
