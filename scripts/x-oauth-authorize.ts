import 'dotenv/config';
import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';

const DEFAULT_SCOPES = 'tweet.read users.read tweet.write offline.access';
const DEFAULT_REDIRECT_URI = 'http://127.0.0.1:3002/callback';

const clientId = requiredEnv('X_OAUTH_CLIENT_ID');
const clientSecret = process.env.X_OAUTH_CLIENT_SECRET?.trim();
const redirectUri = process.env.X_OAUTH_REDIRECT_URI?.trim() || DEFAULT_REDIRECT_URI;
const scopes = process.env.X_OAUTH_SCOPES?.trim() || DEFAULT_SCOPES;
const account = normalizeAccountName(process.env.X_MCP_ACCOUNT ?? 'default') || 'default';
const callbackUrl = new URL(redirectUri);
const verifier = base64Url(randomBytes(64));
const state = base64Url(randomBytes(24));
const challenge = base64Url(createHash('sha256').update(verifier).digest());

if (callbackUrl.hostname !== '127.0.0.1' && callbackUrl.hostname !== 'localhost') {
  throw new Error('X_OAUTH_REDIRECT_URI must point to localhost or 127.0.0.1 for this local helper.');
}

const authorizeUrl = new URL('https://x.com/i/oauth2/authorize');
authorizeUrl.searchParams.set('response_type', 'code');
authorizeUrl.searchParams.set('client_id', clientId);
authorizeUrl.searchParams.set('redirect_uri', redirectUri);
authorizeUrl.searchParams.set('scope', scopes);
authorizeUrl.searchParams.set('state', state);
authorizeUrl.searchParams.set('code_challenge', challenge);
authorizeUrl.searchParams.set('code_challenge_method', 'S256');

const server = createServer((req, res) => {
  void handleCallback(req.url ?? '/', res).catch(error => {
    console.error(error);
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Authorization failed. Check the terminal.');
    server.close();
  });
});

server.listen(Number(callbackUrl.port || 80), callbackUrl.hostname, () => {
  console.error(`Listening for X OAuth callback on ${redirectUri}`);
  console.error(`Open this URL while logged into the intended X account (${account}):`);
  console.log(authorizeUrl.toString());
});

async function handleCallback(path: string, res: { writeHead: (status: number, headers?: Record<string, string>) => void; end: (body: string) => void }): Promise<void> {
  const requestUrl = new URL(path, redirectUri);

  if (requestUrl.pathname !== callbackUrl.pathname) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const error = requestUrl.searchParams.get('error');
  if (error) {
    throw new Error(`X authorization error: ${error}`);
  }

  const receivedState = requestUrl.searchParams.get('state');
  if (receivedState !== state) {
    throw new Error('Invalid OAuth state.');
  }

  const code = requestUrl.searchParams.get('code');
  if (!code) {
    throw new Error('Missing OAuth code.');
  }

  const tokenResponse = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: tokenHeaders(),
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
      client_id: clientId,
    }),
  });

  const raw = await tokenResponse.text();
  const payload = raw ? JSON.parse(raw) as TokenPayload : {};

  if (!tokenResponse.ok || !payload.access_token) {
    throw new Error(`X token exchange failed with HTTP ${tokenResponse.status}: ${raw}`);
  }

  await updateDotEnv(account, payload.access_token, payload.refresh_token);

  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(`X authorization saved for ${account}. You can close this tab.`);
  console.error(`Saved fresh X OAuth token for ${account}. Restart the MCP HTTP server before testing ChatGPT again.`);
  server.close();
}

function tokenHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': 'application/x-www-form-urlencoded',
    accept: 'application/json',
  };

  if (clientSecret) {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    headers.authorization = `Basic ${basic}`;
  }

  return headers;
}

async function updateDotEnv(targetAccount: string, accessToken: string, refreshToken?: string): Promise<void> {
  const path = '.env';
  const existing = await readFile(path, 'utf8').catch(() => '');
  const accessKey = `X_ACCOUNT_${toEnvAccountName(targetAccount)}_USER_ACCESS_TOKEN`;
  const refreshKey = `X_ACCOUNT_${toEnvAccountName(targetAccount)}_REFRESH_TOKEN`;
  let updated = upsertEnv(existing, accessKey, accessToken);

  if (refreshToken) {
    updated = upsertEnv(updated, refreshKey, refreshToken);
  }

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

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function normalizeAccountName(accountName: string): string {
  return accountName.trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function toEnvAccountName(accountName: string): string {
  return accountName.trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();
}

function base64Url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface TokenPayload {
  access_token?: string;
  refresh_token?: string;
}
