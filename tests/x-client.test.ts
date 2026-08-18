import { execFile } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../src/config.js';
import { XApiError, XClient } from '../src/x/client.js';

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

const envConfig: AppConfig = {
  xApiBaseUrl: 'https://api.x.com',
  xAuthProvider: 'env',
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

const xurlConfig: AppConfig = {
  ...envConfig,
  xAuthProvider: 'xurl',
  xUserAccessToken: undefined,
  xurlApp: 'fcbnews',
  xurlUsername: 'FCBNews2026',
};

describe('XClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends bearer auth and query parameters for env-token GET requests', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { id: '123' } }), { status: 200 }),
    );

    const client = new XClient(envConfig);
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

  it('sends JSON POST bodies with env-token auth', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { id: 'tweet-id' } }), { status: 201 }),
    );

    const client = new XClient(envConfig);
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

    const client = new XClient(envConfig);
    await expect(client.get('/2/users/me')).rejects.toMatchObject({
      name: 'XApiError',
      message: 'Bad token',
      status: 401,
      body: { title: 'Unauthorized', detail: 'Bad token' },
    });
  });

  it('gets a valid token from xurl and caches it for subsequent requests', async () => {
    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const callback = args.at(-1) as (error: Error | null, stdout: string, stderr: string) => void;
      callback?.(null, 'xurl-token\n', '');
      return undefined as never;
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: '1' } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: '2' } }), { status: 200 }));

    const client = new XClient(xurlConfig);
    await expect(client.get('/2/users/me')).resolves.toEqual({ data: { id: '1' } });
    await expect(client.get('/2/users/me')).resolves.toEqual({ data: { id: '2' } });

    expect(execFile).toHaveBeenCalledTimes(1);
    expect(execFile).toHaveBeenCalledWith(
      'npx',
      ['-y', '@xdevplatform/xurl', 'token', '--app', 'fcbnews', '-u', 'FCBNews2026'],
      expect.objectContaining({ windowsHide: true }),
      expect.any(Function),
    );
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ authorization: 'Bearer xurl-token' });
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({ authorization: 'Bearer xurl-token' });
  });

  it('clears the cached xurl token and retries once after a 401', async () => {
    vi.mocked(execFile)
      .mockImplementationOnce((...args: unknown[]) => {
        const callback = args.at(-1) as (error: Error | null, stdout: string, stderr: string) => void;
        callback?.(null, 'expired-token\n', '');
        return undefined as never;
      })
      .mockImplementationOnce((...args: unknown[]) => {
        const callback = args.at(-1) as (error: Error | null, stdout: string, stderr: string) => void;
        callback?.(null, 'fresh-token\n', '');
        return undefined as never;
      });
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ title: 'Unauthorized' }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: 'ok' } }), { status: 200 }));

    const client = new XClient(xurlConfig);
    await expect(client.get('/2/users/me')).resolves.toEqual({ data: { id: 'ok' } });

    expect(execFile).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ authorization: 'Bearer expired-token' });
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({ authorization: 'Bearer fresh-token' });
  });

  it('reports xurl auth status without exposing the token', async () => {
    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const callback = args.at(-1) as (error: Error | null, stdout: string, stderr: string) => void;
      callback?.(null, 'xurl-token\n', '');
      return undefined as never;
    });

    const client = new XClient(xurlConfig);

    await expect(client.getAuthStatus()).resolves.toEqual({
      provider: 'xurl',
      xurlApp: 'fcbnews',
      xurlUsername: 'FCBNews2026',
      tokenAvailable: true,
      tokenRefreshManagedBy: 'xurl',
    });
  });
});
