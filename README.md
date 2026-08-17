# X MCP Server

Model Context Protocol (MCP) server that exposes a focused set of tools over the official X API.

## Status

Early MVP. The server currently runs locally over stdio and uses an OAuth 2.0 user access token supplied through the environment.

## Initial tools

- `x_get_me` — authenticated user
- `x_get_user` — user lookup by username
- `x_get_post` — post lookup by ID
- `x_get_user_posts` — recent posts for a user ID
- `x_search_posts` — recent search
- `x_create_post` — publish a post
- `x_reply_post` — reply to a post

Write tools are disabled by default.

## Requirements

- Node.js 20+
- An approved X developer App
- OAuth 2.0 user access token
- Read scopes: `tweet.read users.read`
- Write scope for publishing/replies: `tweet.write`
- `offline.access` is recommended later when refresh-token support is implemented

## Setup

```bash
npm install
cp .env.example .env
```

Set `X_USER_ACCESS_TOKEN` in `.env` or in the environment used by your MCP host.

> Never commit `.env`, access tokens, refresh tokens, client secrets, or private keys.

## Safety mode

The default is read-only:

```bash
X_MCP_MODE=read-only
```

To allow publishing and replies, explicitly use:

```bash
X_MCP_MODE=read-write
```

The OAuth token must also contain `tweet.write`.

## Run locally

```bash
npm run dev
```

The server uses stdio. stdout is reserved for MCP protocol traffic; diagnostic output goes to stderr.

## MCP host example

After installing dependencies, configure a compatible MCP host to launch the project with Node/tsx and provide the environment variables. Exact client configuration differs between ChatGPT, Claude, Codex and other MCP hosts.

## Architecture

```text
MCP host
   |
   | stdio
   v
x-mcp-server
   |
   | OAuth 2.0 user access token
   v
Official X API v2
```

The current MVP keeps X operations atomic. Higher-level workflows such as content planning, mention classification or automated engagement should live in the calling agent until their behavior and safeguards are defined.

## Roadmap

1. Validate the MVP against a real X developer App.
2. Add OAuth 2.0 Authorization Code + PKCE and refresh-token storage.
3. Add delete, like/unlike, repost/unrepost and mentions tools.
4. Add rate-limit metadata and retry policy.
5. Add automated tests and CI.
6. Add Streamable HTTP deployment mode if remote/shared access is needed.

## Security

- Keep credentials outside Git.
- Start in `read-only` mode.
- Use least-privilege X scopes.
- Do not log access or refresh tokens.
- Treat publishing, deleting and account-interaction tools as privileged operations.

## License

No open-source license has been selected yet.
