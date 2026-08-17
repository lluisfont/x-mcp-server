export type McpMode = 'read-only' | 'read-write';

export interface AppConfig {
  xApiBaseUrl: string;
  xUserAccessToken: string;
  mode: McpMode;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const mode = env.X_MCP_MODE === 'read-write' ? 'read-write' : 'read-only';
  const xUserAccessToken = env.X_USER_ACCESS_TOKEN?.trim();

  if (!xUserAccessToken) {
    throw new Error('X_USER_ACCESS_TOKEN is required. Copy .env.example and provide an OAuth 2.0 user access token.');
  }

  return {
    xApiBaseUrl: (env.X_API_BASE_URL ?? 'https://api.x.com').replace(/\/$/, ''),
    xUserAccessToken,
    mode,
  };
}

export function assertWriteEnabled(config: AppConfig): void {
  if (config.mode !== 'read-write') {
    throw new Error('Write operation blocked. Set X_MCP_MODE=read-write explicitly to enable mutations.');
  }
}
