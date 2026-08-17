export type McpMode = 'read-only' | 'read-write';
export type McpTransport = 'stdio' | 'http';

export interface AppConfig {
  xApiBaseUrl: string;
  xUserAccessToken: string;
  activeAccount: string;
  configuredAccounts: string[];
  mode: McpMode;
  transport: McpTransport;
  httpPort: number;
  httpPath: string;
}

const DEFAULT_ACCOUNT = 'default';
const ACCOUNT_TOKEN_PREFIX = 'X_ACCOUNT_';
const ACCOUNT_TOKEN_SUFFIX = '_USER_ACCESS_TOKEN';

function normalizeAccountName(account: string): string {
  return account.trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function toEnvAccountName(account: string): string {
  return account.trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();
}

function getConfiguredAccounts(env: NodeJS.ProcessEnv): string[] {
  const accounts = new Set<string>();

  if (env.X_USER_ACCESS_TOKEN?.trim()) {
    accounts.add(DEFAULT_ACCOUNT);
  }

  for (const [key, value] of Object.entries(env)) {
    if (!value?.trim() || !key.startsWith(ACCOUNT_TOKEN_PREFIX) || !key.endsWith(ACCOUNT_TOKEN_SUFFIX)) {
      continue;
    }

    const rawAccount = key.slice(ACCOUNT_TOKEN_PREFIX.length, -ACCOUNT_TOKEN_SUFFIX.length);
    if (rawAccount) {
      accounts.add(normalizeAccountName(rawAccount));
    }
  }

  return [...accounts].sort();
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const mode = env.X_MCP_MODE === 'read-write' ? 'read-write' : 'read-only';
  const transport = env.X_MCP_TRANSPORT === 'http' ? 'http' : 'stdio';
  const httpPort = parseHttpPort(env.PORT ?? env.X_MCP_HTTP_PORT);
  const httpPath = parseHttpPath(env.X_MCP_HTTP_PATH);
  const configuredAccounts = getConfiguredAccounts(env);
  const activeAccount = normalizeAccountName(env.X_MCP_ACCOUNT ?? DEFAULT_ACCOUNT) || DEFAULT_ACCOUNT;
  const accountTokenKey = `X_ACCOUNT_${toEnvAccountName(activeAccount)}_USER_ACCESS_TOKEN`;
  const xUserAccessToken = (env[accountTokenKey] ?? (activeAccount === DEFAULT_ACCOUNT ? env.X_USER_ACCESS_TOKEN : undefined))?.trim();

  if (!xUserAccessToken) {
    const configured = configuredAccounts.length > 0 ? ` Configured accounts: ${configuredAccounts.join(', ')}.` : '';
    throw new Error(`No access token configured for X_MCP_ACCOUNT=${activeAccount}. Set ${accountTokenKey} or use X_USER_ACCESS_TOKEN with X_MCP_ACCOUNT=default.${configured}`);
  }

  return {
    xApiBaseUrl: (env.X_API_BASE_URL ?? 'https://api.x.com').replace(/\/$/, ''),
    xUserAccessToken,
    activeAccount,
    configuredAccounts,
    mode,
    transport,
    httpPort,
    httpPath,
  };
}

function parseHttpPort(port: string | undefined): number {
  const parsed = Number(port ?? 3001);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid HTTP port: ${port}`);
  }

  return parsed;
}

function parseHttpPath(path: string | undefined): string {
  const normalized = path?.trim() || '/mcp';

  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

export function assertWriteEnabled(config: AppConfig): void {
  if (config.mode !== 'read-write') {
    throw new Error('Write operation blocked. Set X_MCP_MODE=read-write explicitly to enable mutations.');
  }
}
