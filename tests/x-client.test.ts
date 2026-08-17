import { afterEach, describe, expect, it, vi } from 'vitest';
import { XApiError, XClient } from '../src/x/client.js';
import type { AppConfig } from '../src/config.js';

const config: AppConfig = {
  xApiBaseUrl: 'https://api.x.com',
  xUserAccessToken: 'token',
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
});
