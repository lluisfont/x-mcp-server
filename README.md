# X MCP Server

TypeScript Model Context Protocol (MCP) server for the official X API.

This project lets MCP-compatible agents, including ChatGPT agents, safely read
from and publish to X accounts through a local server that runs on your own
computer.

The server supports:

- Reading the authenticated X account.
- Looking up X users by username.
- Reading posts by ID.
- Listing recent posts from a user.
- Searching recent posts with X search syntax.
- Creating posts and replies when write mode is explicitly enabled.
- Selecting a different X account per local computer installation.
- Running over `stdio` for local MCP hosts.
- Running over local Streamable HTTP for ChatGPT through OpenAI Secure MCP
  Tunnels.

## Project Status

This is a functional MVP.

Implemented:

- MCP server over `stdio`.
- MCP server over Streamable HTTP.
- Official X API client.
- Local multi-account configuration.
- Safe `read-only` mode by default.
- Explicit `read-write` mode for publishing and replies.
- Local OAuth 2.0 Authorization Code + PKCE helper for X account
  reauthorization.
- Unit tests with Vitest.
- ChatGPT connection guide through OpenAI Secure MCP Tunnels.
- Local server lifecycle guide for manual and automatic startup on Windows.

## How It Works

For local MCP hosts:

```text
MCP host
  -> stdio
  -> x-mcp-server
  -> official X API
```

For ChatGPT agents:

```text
ChatGPT agent
  -> custom MCP app
  -> OpenAI Secure MCP Tunnel
  -> tunnel-client on your computer
  -> http://127.0.0.1:3001/mcp
  -> x-mcp-server
  -> official X API
```

The X credentials stay local. ChatGPT connects to the local MCP server through
the tunnel; it does not receive your X access tokens.

## Available MCP Tools

| Tool | Type | Description |
| --- | --- | --- |
| `x_get_active_account` | Read | Returns the selected local profile, configured accounts, mode, and authenticated X user. |
| `x_get_me` | Read | Returns the authenticated X user. |
| `x_get_user` | Read | Looks up an X user by username. |
| `x_get_post` | Read | Reads a post by ID. |
| `x_get_user_posts` | Read | Lists recent posts authored by a user ID. |
| `x_search_posts` | Read | Searches recent posts using the official X query syntax. |
| `x_create_post` | Write | Publishes a new post. Requires `X_MCP_MODE=read-write`. |
| `x_reply_post` | Write | Replies to a post. Requires `X_MCP_MODE=read-write`. |

Write tools are blocked unless `X_MCP_MODE=read-write` is set.

## Requirements

- Node.js 20 or newer.
- An X Developer account.
- An X Developer App with OAuth 2.0 enabled.
- X read scopes: `tweet.read users.read`.
- X write scope for publishing and replies: `tweet.write`.
- Recommended X refresh scope: `offline.access`.
- For ChatGPT: Developer Mode enabled.
- For ChatGPT local connections: an OpenAI Secure MCP Tunnel and
  `tunnel-client`.

## Step-by-Step Installation

### 1. Clone the Repository

```powershell
git clone https://github.com/lluisfont/x-mcp-server.git
cd x-mcp-server
```

If you already have the repository:

```powershell
cd C:\Repos\x-mcp-server
git pull
```

### 2. Install Dependencies

```powershell
npm install
```

### 3. Create a Local Environment File

```powershell
Copy-Item .env.example .env
```

Edit `.env` locally.

Do not commit `.env`. It may contain access tokens, refresh tokens, client
secrets, and private API keys.

### 4. Configure the Active X Account

For a named local account:

```env
X_MCP_ACCOUNT=fcbnews2026
X_MCP_MODE=read-only
X_API_BASE_URL=https://api.x.com

X_ACCOUNT_FCBNEWS2026_USER_ACCESS_TOKEN=
X_ACCOUNT_FCBNEWS2026_REFRESH_TOKEN=
```

For multiple accounts on the same computer:

```env
X_MCP_ACCOUNT=fcbnews2026
X_MCP_MODE=read-only

X_ACCOUNT_FCBNEWS2026_USER_ACCESS_TOKEN=
X_ACCOUNT_FCBNEWS2026_REFRESH_TOKEN=

X_ACCOUNT_LLUISFONT_USER_ACCESS_TOKEN=
X_ACCOUNT_LLUISFONT_REFRESH_TOKEN=
```

`X_MCP_ACCOUNT` selects the local profile used by this installation. Different
computers can select different accounts without changing code.

The legacy single-account mode is also supported:

```env
X_MCP_ACCOUNT=default
X_USER_ACCESS_TOKEN=
```

New installations should prefer named accounts.

### 5. Choose the Transport

For local MCP hosts that start the process directly:

```env
X_MCP_TRANSPORT=stdio
```

For ChatGPT through a local tunnel:

```env
X_MCP_TRANSPORT=http
X_MCP_HTTP_PORT=3001
X_MCP_HTTP_PATH=/mcp
```

### 6. Run Type Checks and Tests

```powershell
npm run typecheck
npm test
npm run build
```

### 7. Start the MCP Server

For `stdio`:

```powershell
npm run dev
```

For local HTTP:

```powershell
npm run dev:http
```

The default HTTP MCP endpoint is:

```text
http://127.0.0.1:3001/mcp
```

Health check:

```powershell
Invoke-RestMethod http://127.0.0.1:3001/healthz | ConvertTo-Json -Compress
```

Expected response:

```json
{"ok":true,"transport":"http","activeAccount":"fcbnews2026","mode":"read-only"}
```

## Local MCP Server Lifecycle

When ChatGPT uses this MCP through a tunnel, two local processes must be
running:

```text
1. The MCP HTTP server
   -> npm run dev:http
   -> http://127.0.0.1:3001/mcp

2. tunnel-client
   -> .\.tools\tunnel-client\tunnel-client.exe run --profile <profile>
   -> OpenAI Secure MCP Tunnel
```

If either process is stopped, ChatGPT cannot use the MCP tools.

### Start Manually

Terminal 1:

```powershell
cd C:\Repos\x-mcp-server
npm run dev:http
```

Terminal 2:

```powershell
cd C:\Repos\x-mcp-server
.\.tools\tunnel-client\tunnel-client.exe run --profile x-fcbnews
```

Keep both terminals open.

### Verify Local Availability

Check the MCP server:

```powershell
Invoke-RestMethod http://127.0.0.1:3001/healthz | ConvertTo-Json -Compress
```

Check the tunnel client:

```powershell
Invoke-WebRequest http://127.0.0.1:8080/readyz -UseBasicParsing
```

The tunnel readiness endpoint should return HTTP `200`.

### Stop Manually

Press `Ctrl+C` in:

- The terminal running `npm run dev:http`.
- The terminal running `tunnel-client run`.

Once both are stopped, ChatGPT no longer has access to the local MCP server.

### Change Account or Safety Mode

Edit `.env`.

Change active account:

```env
X_MCP_ACCOUNT=fcbnews2026
```

Enable write mode:

```env
X_MCP_MODE=read-write
```

Return to safe read-only mode:

```env
X_MCP_MODE=read-only
```

Restart the MCP HTTP server after changing `.env`:

```text
Ctrl+C
npm run dev:http
```

The tunnel can remain running if the local port and MCP path did not change.

### Start Automatically on Windows Login

For a computer that should regularly host this MCP, use Windows Task Scheduler.

Create a local startup script, for example:

```text
C:\Users\<user>\mcp-start\x-fcbnews-start.ps1
```

Script:

```powershell
$repo = "C:\Repos\x-mcp-server"
$profile = "x-fcbnews"

Set-Location $repo

Start-Process powershell.exe -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-Command", "cd `"$repo`"; npm run dev:http"
) -WindowStyle Minimized

Start-Sleep -Seconds 5

Start-Process powershell.exe -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-Command", "cd `"$repo`"; .\.tools\tunnel-client\tunnel-client.exe run --profile $profile"
) -WindowStyle Minimized
```

Register the scheduled task:

```powershell
$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-ExecutionPolicy Bypass -File `"C:\Users\<user>\mcp-start\x-fcbnews-start.ps1`""

$trigger = New-ScheduledTaskTrigger -AtLogOn

Register-ScheduledTask `
  -TaskName "X MCP FCBNews2026" `
  -Action $action `
  -Trigger $trigger `
  -Description "Starts the local X MCP server and OpenAI tunnel-client at Windows logon."
```

Disable automatic startup:

```powershell
Disable-ScheduledTask -TaskName "X MCP FCBNews2026"
```

Enable it again:

```powershell
Enable-ScheduledTask -TaskName "X MCP FCBNews2026"
```

Delete it:

```powershell
Unregister-ScheduledTask -TaskName "X MCP FCBNews2026" -Confirm:$false
```

Full lifecycle guide:

[docs/local-server-lifecycle.md](docs/local-server-lifecycle.md)

## Connect to ChatGPT

High-level flow:

```text
1. Run the MCP server over local HTTP.
2. Create a tunnel in OpenAI Platform.
3. Create a local tunnel-client profile pointing to http://127.0.0.1:3001/mcp.
4. Start tunnel-client.
5. Create a custom MCP app in the ChatGPT agent using Connection: Tunnel.
6. Test x_get_active_account or x_get_me before any write operation.
```

Recommended ChatGPT custom MCP settings:

```text
Connection: Tunnel
Tunnel: <your OpenAI tunnel>
Authentication: No authentication
```

Use `No authentication` when the MCP server manages the final service
credentials locally, for example through `.env`.

Full ChatGPT setup guide:

[docs/chatgpt-mcp-setup.md](docs/chatgpt-mcp-setup.md)

## Reauthorize an X Account

In X Developer, configure the app:

```text
OAuth 2.0: Enabled
App permissions: Read and write
Callback URI: http://127.0.0.1:3002/callback
Website URL: http://127.0.0.1:3002
```

Run:

```powershell
$env:X_OAUTH_CLIENT_ID = "<OAuth 2.0 Client ID>"
$env:X_MCP_ACCOUNT = "fcbnews2026"
npm run x:oauth
```

Open the generated URL while logged into the intended X account. After
authorization, the helper updates `.env` with the selected account token.

Restart the MCP server after reauthorization:

```powershell
npm run dev:http
```

Then verify with:

```text
x_get_active_account
```

Detailed OAuth guide:

[docs/x-oauth.md](docs/x-oauth.md)

## Safety Model

The server starts in read-only mode by default:

```env
X_MCP_MODE=read-only
```

Write tools require:

```env
X_MCP_MODE=read-write
```

Before publishing:

- Verify the active account with `x_get_active_account`.
- Confirm the exact text to publish.
- Ensure the X token has `tweet.write`.
- Ask the agent to return the generated `post_id`.
- Do not treat a post as published until X returns an ID.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Starts the MCP server over `stdio`. |
| `npm run dev:http` | Starts the MCP server over local HTTP. |
| `npm run x:oauth` | Runs the local X OAuth authorization helper. |
| `npm run build` | Compiles TypeScript to `dist`. |
| `npm run start` | Starts the compiled server over `stdio`. |
| `npm run start:http` | Starts the compiled server over HTTP. |
| `npm run typecheck` | Runs TypeScript without emitting files. |
| `npm test` | Runs the Vitest test suite. |

## Documentation

- [docs/project-architecture.md](docs/project-architecture.md): project architecture.
- [docs/configuration.md](docs/configuration.md): environment variables and multi-account setup.
- [docs/local-server-lifecycle.md](docs/local-server-lifecycle.md): start, stop, and automate the local MCP server.
- [docs/tools.md](docs/tools.md): MCP tools and usage contracts.
- [docs/x-oauth.md](docs/x-oauth.md): X OAuth reauthorization.
- [docs/development.md](docs/development.md): development, testing, and change guidelines.
- [docs/chatgpt-mcp-setup.md](docs/chatgpt-mcp-setup.md): step-by-step ChatGPT MCP setup.

## Operational Security

- Keep credentials outside Git.
- Keep `read-only` as the default mode.
- Enable `read-write` only for controlled workflows.
- Verify the active account before publishing.
- Do not log access tokens or refresh tokens.
- Do not paste tokens into chats, issues, docs, or pull requests.
- Do not run automatic startup in `read-write` mode on shared computers.

## License

No open-source license has been selected yet.
