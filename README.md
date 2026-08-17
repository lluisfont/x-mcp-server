# X MCP Server

Model Context Protocol (MCP) server that exposes a focused set of tools over the official X API.

## Status

Early MVP. The server runs locally over stdio or over Streamable HTTP for remote MCP hosts, using an OAuth 2.0 user access token supplied through the environment.

## Initial tools

- `x_get_me` — authenticated user
- `x_get_active_account` — selected local account profile and authenticated user
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
The local `dev` and `start` scripts load `.env` automatically.

> Never commit `.env`, access tokens, refresh tokens, client secrets, or private keys.

## Multiple local accounts

Each computer can select its own X account profile without changing code. The
legacy single-account setup still works:

```bash
X_MCP_ACCOUNT=default
X_USER_ACCESS_TOKEN=...
```

For multiple accounts, define one token per named profile and select the active
profile with `X_MCP_ACCOUNT`:

```bash
X_MCP_ACCOUNT=personal
X_ACCOUNT_PERSONAL_USER_ACCESS_TOKEN=...
X_ACCOUNT_WORK_USER_ACCESS_TOKEN=...
```

Account names are local labels only. For example, `X_MCP_ACCOUNT=work` uses
`X_ACCOUNT_WORK_USER_ACCESS_TOKEN`. Another installation can select a different
account by changing only its local `.env` or MCP host environment.

Use `x_get_active_account` to verify which local profile and authenticated X
user are active. The tool never returns access or refresh tokens.

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

## Run over HTTP

Use the HTTP entrypoint when a remote MCP host needs a URL instead of a local
stdio process:

```bash
npm run dev:http
```

By default this serves MCP at:

```text
http://127.0.0.1:3001/mcp
```

HTTP settings can be changed per installation:

```bash
X_MCP_TRANSPORT=http
X_MCP_HTTP_PORT=3001
X_MCP_HTTP_PATH=/mcp
```

The HTTP server also exposes `GET /healthz` for deployment checks. ChatGPT
requires the MCP endpoint to be available through a stable HTTPS URL, for
example `https://x-mcp.example.com/mcp`.

## MCP host example

After installing dependencies, configure a compatible MCP host to launch the project with Node/tsx and provide the environment variables. Exact client configuration differs between ChatGPT, Claude, Codex and other MCP hosts.

For ChatGPT, deploy the HTTP entrypoint behind HTTPS, then add the MCP endpoint
in Developer Mode and scan the available tools. Start by testing
`x_get_active_account`, then `x_get_me`, and only enable publishing with
`X_MCP_MODE=read-write` once the selected account is correct.

## Architecture

```text
MCP host
   |
   | stdio or Streamable HTTP
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
6. Add MCP resource-server authentication for shared remote deployments.

## Security

- Keep credentials outside Git.
- Start in `read-only` mode.
- Use least-privilege X scopes.
- Do not log access or refresh tokens.
- Treat publishing, deleting and account-interaction tools as privileged operations.

## License

No open-source license has been selected yet.
