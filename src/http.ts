import 'dotenv/config';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/server';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { loadConfig } from './config.js';
import { buildServer } from './server.js';

const config = loadConfig();
const transport = new WebStandardStreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
  enableJsonResponse: true,
});

await buildServer(config).connect(transport);

const server = createServer((req, res) => {
  void handleRequest(req, res).catch(error => {
    console.error(error);
    writeWebResponse(res, Response.json({ error: 'internal_error' }, { status: 500 })).catch(console.error);
  });
});

server.listen(config.httpPort, () => {
  console.error(`x-mcp-server running over HTTP on ${config.httpPath} at port ${config.httpPort} in ${config.mode} mode`);
});

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `127.0.0.1:${config.httpPort}`}`);

  if (req.method === 'GET' && url.pathname === '/healthz') {
    await writeWebResponse(res, Response.json({
      ok: true,
      transport: 'http',
      activeAccount: config.activeAccount,
      mode: config.mode,
    }));
    return;
  }

  if (url.pathname !== config.httpPath) {
    await writeWebResponse(res, new Response('Not found', { status: 404 }));
    return;
  }

  if (req.method === 'OPTIONS') {
    await writeWebResponse(res, new Response(null, { status: 204 }));
    return;
  }

  await writeWebResponse(res, await transport.handleRequest(toWebRequest(req, url)));
}

function toWebRequest(req: IncomingMessage, url: URL): Request {
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      value.forEach(item => headers.append(key, item));
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }

  const init: RequestInit & { duplex?: 'half' } = {
    method: req.method,
    headers,
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = Readable.toWeb(req) as ReadableStream<Uint8Array>;
    init.duplex = 'half';
  }

  return new Request(url, init);
}

async function writeWebResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;

  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  setDefaultCorsHeaders(res);

  if (!response.body) {
    res.end();
    return;
  }

  await new Promise<void>((resolve, reject) => {
    Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0])
      .on('error', reject)
      .on('end', resolve)
      .pipe(res);
  });
}

function setDefaultCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, MCP-Protocol-Version, Mcp-Session-Id, Last-Event-ID');
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id, MCP-Protocol-Version');
}
