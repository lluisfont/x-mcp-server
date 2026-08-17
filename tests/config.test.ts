import { describe, expect, it } from 'vitest';
import { assertWriteEnabled, loadConfig, type AppConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('defaults to read-only mode and trims the token', () => {
    expect(loadConfig({ X_USER_ACCESS_TOKEN: ' token ' })).toEqual({
      xApiBaseUrl: 'https://api.x.com',
      xUserAccessToken: 'token',
      xRefreshToken: undefined,
      xOAuthClientId: undefined,
      xOAuthClientSecret: undefined,
      xAccessTokenEnvKey: 'X_ACCOUNT_DEFAULT_USER_ACCESS_TOKEN',
      xRefreshTokenEnvKey: 'X_ACCOUNT_DEFAULT_REFRESH_TOKEN',
      activeAccount: 'default',
      configuredAccounts: ['default'],
      mode: 'read-only',
      transport: 'stdio',
      httpPort: 3001,
      httpPath: '/mcp',
    });
  });

  it('accepts read-write mode and trims a custom base URL', () => {
    expect(loadConfig({
      X_USER_ACCESS_TOKEN: 'token',
      X_REFRESH_TOKEN: 'refresh-token',
      X_OAUTH_CLIENT_ID: 'client-id',
      X_OAUTH_CLIENT_SECRET: 'client-secret',
      X_MCP_MODE: 'read-write',
      X_API_BASE_URL: 'https://proxy.example.test/',
    })).toEqual({
      xApiBaseUrl: 'https://proxy.example.test',
      xUserAccessToken: 'token',
      xRefreshToken: 'refresh-token',
      xOAuthClientId: 'client-id',
      xOAuthClientSecret: 'client-secret',
      xAccessTokenEnvKey: 'X_ACCOUNT_DEFAULT_USER_ACCESS_TOKEN',
      xRefreshTokenEnvKey: 'X_ACCOUNT_DEFAULT_REFRESH_TOKEN',
      activeAccount: 'default',
      configuredAccounts: ['default'],
      mode: 'read-write',
      transport: 'stdio',
      httpPort: 3001,
      httpPath: '/mcp',
    });
  });

  it('requires a user access token', () => {
    expect(() => loadConfig({})).toThrow(/No access token configured for X_MCP_ACCOUNT=default/);
  });

  it('selects a named account token for this installation', () => {
    expect(loadConfig({
      X_MCP_ACCOUNT: 'personal',
      X_ACCOUNT_PERSONAL_USER_ACCESS_TOKEN: ' personal-token ',
      X_ACCOUNT_PERSONAL_REFRESH_TOKEN: ' personal-refresh ',
      X_ACCOUNT_WORK_USER_ACCESS_TOKEN: 'work-token',
    })).toEqual({
      xApiBaseUrl: 'https://api.x.com',
      xUserAccessToken: 'personal-token',
      xRefreshToken: 'personal-refresh',
      xOAuthClientId: undefined,
      xOAuthClientSecret: undefined,
      xAccessTokenEnvKey: 'X_ACCOUNT_PERSONAL_USER_ACCESS_TOKEN',
      xRefreshTokenEnvKey: 'X_ACCOUNT_PERSONAL_REFRESH_TOKEN',
      activeAccount: 'personal',
      configuredAccounts: ['personal', 'work'],
      mode: 'read-only',
      transport: 'stdio',
      httpPort: 3001,
      httpPath: '/mcp',
    });
  });

  it('loads HTTP transport settings', () => {
    expect(loadConfig({
      X_USER_ACCESS_TOKEN: 'token',
      X_MCP_TRANSPORT: 'http',
      X_MCP_HTTP_PORT: '4010',
      X_MCP_HTTP_PATH: 'custom-mcp',
    })).toMatchObject({
      transport: 'http',
      httpPort: 4010,
      httpPath: '/custom-mcp',
    });
  });

  it('rejects invalid HTTP ports', () => {
    expect(() => loadConfig({
      X_USER_ACCESS_TOKEN: 'token',
      X_MCP_HTTP_PORT: '99999',
    })).toThrow(/Invalid HTTP port/);
  });

  it('normalizes selected account names to environment variable names', () => {
    expect(loadConfig({
      X_MCP_ACCOUNT: 'Luis Font',
      X_ACCOUNT_LUIS_FONT_USER_ACCESS_TOKEN: 'token',
    }).activeAccount).toBe('luis-font');
  });

  it('reports available accounts when the selected account is missing a token', () => {
    expect(() => loadConfig({
      X_MCP_ACCOUNT: 'missing',
      X_ACCOUNT_PERSONAL_USER_ACCESS_TOKEN: 'token',
    })).toThrow(/Configured accounts: personal/);
  });
});

describe('assertWriteEnabled', () => {
  const baseConfig: AppConfig = {
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

  it('blocks writes unless read-write mode is explicit', () => {
    expect(() => assertWriteEnabled(baseConfig)).toThrow(/Write operation blocked/);
  });

  it('allows writes in read-write mode', () => {
    expect(() => assertWriteEnabled({ ...baseConfig, mode: 'read-write' })).not.toThrow();
  });
});
