import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { assertWriteEnabled, type AppConfig } from './config.js';
import { XApiError, XClient } from './x/client.js';

function asToolResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data as Record<string, unknown>,
  };
}

function asToolError(error: unknown) {
  const payload = error instanceof XApiError
    ? { error: 'x_api_error', status: error.status, message: error.message, details: error.body }
    : { error: 'internal_error', message: error instanceof Error ? error.message : String(error) };

  return {
    isError: true,
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
  };
}

export function buildServer(config: AppConfig): McpServer {
  const server = new McpServer({ name: 'x-mcp-server', version: '0.1.0' });
  const x = new XClient(config);

  server.registerTool('x_get_me', {
    description: 'Get the authenticated X user.',
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true },
  }, async () => {
    try { return asToolResult(await x.get('/2/users/me', { 'user.fields': 'id,name,username,created_at,description,public_metrics,verified' })); }
    catch (error) { return asToolError(error); }
  });

  server.registerTool('x_get_user', {
    description: 'Get an X user by username.',
    inputSchema: z.object({ username: z.string().min(1).describe('Username without @') }),
    annotations: { readOnlyHint: true },
  }, async ({ username }) => {
    try { return asToolResult(await x.get(`/2/users/by/username/${encodeURIComponent(username.replace(/^@/, ''))}`, { 'user.fields': 'id,name,username,created_at,description,public_metrics,verified' })); }
    catch (error) { return asToolError(error); }
  });

  server.registerTool('x_get_post', {
    description: 'Get a single X post by ID.',
    inputSchema: z.object({ postId: z.string().min(1) }),
    annotations: { readOnlyHint: true },
  }, async ({ postId }) => {
    try { return asToolResult(await x.get(`/2/tweets/${encodeURIComponent(postId)}`, { 'tweet.fields': 'id,text,author_id,created_at,conversation_id,public_metrics,referenced_tweets' })); }
    catch (error) { return asToolError(error); }
  });

  server.registerTool('x_get_user_posts', {
    description: 'Get recent posts authored by an X user ID.',
    inputSchema: z.object({ userId: z.string().min(1), maxResults: z.number().int().min(5).max(100).default(10) }),
    annotations: { readOnlyHint: true },
  }, async ({ userId, maxResults }) => {
    try { return asToolResult(await x.get(`/2/users/${encodeURIComponent(userId)}/tweets`, { max_results: maxResults, 'tweet.fields': 'id,text,author_id,created_at,conversation_id,public_metrics' })); }
    catch (error) { return asToolError(error); }
  });

  server.registerTool('x_search_posts', {
    description: 'Search recent X posts using the official X query syntax.',
    inputSchema: z.object({ query: z.string().min(1), maxResults: z.number().int().min(10).max(100).default(10) }),
    annotations: { readOnlyHint: true },
  }, async ({ query, maxResults }) => {
    try { return asToolResult(await x.get('/2/tweets/search/recent', { query, max_results: maxResults, 'tweet.fields': 'id,text,author_id,created_at,conversation_id,public_metrics' })); }
    catch (error) { return asToolError(error); }
  });

  server.registerTool('x_create_post', {
    description: 'Publish a new X post. Requires X_MCP_MODE=read-write and tweet.write scope.',
    inputSchema: z.object({ text: z.string().min(1).max(25000) }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  }, async ({ text }) => {
    try { assertWriteEnabled(config); return asToolResult(await x.post('/2/tweets', { text })); }
    catch (error) { return asToolError(error); }
  });

  server.registerTool('x_reply_post', {
    description: 'Reply to an X post. Requires X_MCP_MODE=read-write and tweet.write scope.',
    inputSchema: z.object({ postId: z.string().min(1), text: z.string().min(1).max(25000) }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  }, async ({ postId, text }) => {
    try {
      assertWriteEnabled(config);
      return asToolResult(await x.post('/2/tweets', { text, reply: { in_reply_to_tweet_id: postId } }));
    } catch (error) { return asToolError(error); }
  });

  return server;
}
