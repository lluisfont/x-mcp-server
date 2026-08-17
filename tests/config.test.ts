import { describe, expect, it } from 'vitest';
import { assertWriteEnabled, loadConfig, type AppConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('defaults to read-only mode and trims the token', () => {
    expect(loadConfig({ X_USER_ACCESS_TOKEN: ' token ' })).toEqual({
      xApiBaseUrl: 'https://api.x.com',
      xUserAccessToken: 'token',
      mode: 'read-only',
    });
  });

  it('accepts read-write mode and trims a custom base URL', () => {
    expect(loadConfig({
      X_USER_ACCESS_TOKEN: 'token',
      X_MCP_MODE: 'read-write',
      X_API_BASE_URL: 'https://proxy.example.test/',
    })).toEqual({
      xApiBaseUrl: 'https://proxy.example.test',
      xUserAccessToken: 'token',
      mode: 'read-write',
    });
  });

  it('requires a user access token', () => {
    expect(() => loadConfig({})).toThrow(/X_USER_ACCESS_TOKEN is required/);
  });
});

describe('assertWriteEnabled', () => {
  const baseConfig: AppConfig = {
    xApiBaseUrl: 'https://api.x.com',
    xUserAccessToken: 'token',
    mode: 'read-only',
  };

  it('blocks writes unless read-write mode is explicit', () => {
    expect(() => assertWriteEnabled(baseConfig)).toThrow(/Write operation blocked/);
  });

  it('allows writes in read-write mode', () => {
    expect(() => assertWriteEnabled({ ...baseConfig, mode: 'read-write' })).not.toThrow();
  });
});
