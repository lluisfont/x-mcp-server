# Configuracion

Este documento lista las variables de entorno que usa el servidor.

## Archivo local

Crear un `.env` local a partir de:

```powershell
Copy-Item .env.example .env
```

`.env` contiene secretos reales y no debe commitearse.

`.env.example` documenta las variables y si debe commitearse.

## Variables principales

| Variable | Valor por defecto | Descripcion |
| --- | --- | --- |
| `X_MCP_ACCOUNT` | `default` | Perfil local activo. |
| `X_USER_ACCESS_TOKEN` | vacio | Token legacy para `X_MCP_ACCOUNT=default`. |
| `X_API_BASE_URL` | `https://api.x.com` | Base URL de la API de X. |
| `X_MCP_MODE` | `read-only` | Modo de seguridad. |
| `X_MCP_TRANSPORT` | `stdio` | Transporte: `stdio` o `http`. |
| `X_MCP_HTTP_PORT` | `3001` | Puerto HTTP local. |
| `X_MCP_HTTP_PATH` | `/mcp` | Path MCP HTTP. |
| `X_OAUTH_CLIENT_ID` | vacio | Client ID usado por el helper OAuth y por el refresh automatico. |
| `X_OAUTH_CLIENT_SECRET` | vacio | Client Secret opcional para apps confidenciales. |

## Modo seguro

Por defecto:

```env
X_MCP_MODE=read-only
```

Para permitir publicar y responder:

```env
X_MCP_MODE=read-write
```

Aunque `read-write` este activo, el token de X debe tener scope `tweet.write`.

## Renovacion automatica de tokens

Si X devuelve `401 Unauthorized`, el cliente intenta renovar el access token una
vez antes de devolver error.

Para que funcione, deben existir:

```env
X_OAUTH_CLIENT_ID=
X_ACCOUNT_FCBNEWS2026_REFRESH_TOKEN=
```

El servidor llama a:

```text
POST https://api.x.com/2/oauth2/token
grant_type=refresh_token
```

Si X devuelve un nuevo access token, el servidor:

- Actualiza el token en memoria.
- Actualiza `.env`.
- Reintenta una vez la peticion original.

Si el refresh token tambien es invalido, hay que reautorizar con
`npm run x:oauth`.

## Configuracion multicuentas

Cada cuenta se configura con este patron:

```text
X_ACCOUNT_<NOMBRE>_USER_ACCESS_TOKEN
X_ACCOUNT_<NOMBRE>_REFRESH_TOKEN
```

El `<NOMBRE>` se normaliza:

- Mayusculas.
- Espacios y simbolos convertidos a `_`.
- Sin `_` al principio ni al final.

Ejemplo:

```env
X_MCP_ACCOUNT=fcbnews2026
X_ACCOUNT_FCBNEWS2026_USER_ACCESS_TOKEN=
X_ACCOUNT_FCBNEWS2026_REFRESH_TOKEN=
```

Otro ejemplo:

```env
X_MCP_ACCOUNT=lluisfont
X_ACCOUNT_LLUISFONT_USER_ACCESS_TOKEN=
X_ACCOUNT_LLUISFONT_REFRESH_TOKEN=
```

## Cuenta default

La cuenta `default` permite compatibilidad con configuraciones simples:

```env
X_MCP_ACCOUNT=default
X_USER_ACCESS_TOKEN=
```

Para proyectos nuevos, se recomienda usar siempre cuentas nombradas.

## Transporte stdio

```env
X_MCP_TRANSPORT=stdio
```

Comando:

```powershell
npm run dev
```

## Transporte HTTP

```env
X_MCP_TRANSPORT=http
X_MCP_HTTP_PORT=3001
X_MCP_HTTP_PATH=/mcp
```

Comando:

```powershell
npm run dev:http
```

Endpoint:

```text
http://127.0.0.1:3001/mcp
```

Health check:

```text
http://127.0.0.1:3001/healthz
```

## Variables OAuth para X

Usadas por el helper `npm run x:oauth` y por la renovacion automatica de tokens.

| Variable | Valor por defecto | Descripcion |
| --- | --- | --- |
| `X_OAUTH_CLIENT_ID` | requerido | OAuth 2.0 Client ID de X Developer. |
| `X_OAUTH_CLIENT_SECRET` | opcional | Client Secret si la app es confidencial. |
| `X_OAUTH_REDIRECT_URI` | `http://127.0.0.1:3002/callback` | Callback local. |
| `X_OAUTH_SCOPES` | `tweet.read users.read tweet.write offline.access` | Scopes solicitados. |

## Validaciones recomendadas

Ver cuenta activa:

```text
x_get_active_account
```

Ver usuario autenticado:

```text
x_get_me
```

Ver HTTP local:

```powershell
Invoke-RestMethod http://127.0.0.1:3001/healthz | ConvertTo-Json -Compress
```
