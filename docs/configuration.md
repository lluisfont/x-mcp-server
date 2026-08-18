# Configuracion

Este documento lista las variables de entorno que usa el servidor.

## Archivo local

Crear un `.env` local a partir de:

```powershell
Copy-Item .env.example .env
```

`.env` puede contener configuracion local sensible y no debe commitearse.

## Proveedor de autenticacion recomendado

El proveedor recomendado es `xurl`, la CLI oficial de X. `xurl` gestiona el
almacenamiento local de tokens, refresh y rotacion.

```env
X_AUTH_PROVIDER=xurl
X_XURL_APP=fcbnews
X_XURL_USERNAME=FCBNews2026
X_MCP_ACCOUNT=fcbnews2026
```

Configurar `xurl` una vez:

```powershell
$secret = Read-Host "X OAuth Client Secret" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
)
npx -y @xdevplatform/xurl auth apps add fcbnews --client-id "<OAuth 2.0 Client ID>" --client-secret $plain --redirect-uri http://localhost:8080/callback
npx -y @xdevplatform/xurl auth oauth2 --app fcbnews FCBNews2026
```

Introducir el Client Secret solo en la terminal local. No pegarlo en chats,
issues ni documentacion.

Registrar en X Developer:

```text
http://localhost:8080/callback
```

Cuando el MCP necesita llamar a X, obtiene un token valido con:

```powershell
npx -y @xdevplatform/xurl token --app fcbnews -u FCBNews2026
```

## Variables principales

| Variable | Valor por defecto | Descripcion |
| --- | --- | --- |
| `X_AUTH_PROVIDER` | `env` | Proveedor de auth: `xurl` recomendado o `env` legacy. |
| `X_XURL_APP` | vacio | App registrada en xurl. Requerida con `X_AUTH_PROVIDER=xurl`. |
| `X_XURL_USERNAME` | vacio | Usuario OAuth2 de xurl. Recomendado para fijar cuenta. |
| `X_MCP_ACCOUNT` | `default` | Etiqueta local expuesta por el MCP. |
| `X_API_BASE_URL` | `https://api.x.com` | Base URL de la API de X. |
| `X_MCP_MODE` | `read-only` | Modo de seguridad. |
| `X_MCP_TRANSPORT` | `stdio` | Transporte: `stdio` o `http`. |
| `X_MCP_HTTP_PORT` | `3001` | Puerto HTTP local. |
| `X_MCP_HTTP_PATH` | `/mcp` | Path MCP HTTP. |

## Modo seguro

Por defecto:

```env
X_MCP_MODE=read-only
```

Para permitir publicar y responder:

```env
X_MCP_MODE=read-write
```

Aunque `read-write` este activo, la cuenta de X debe tener scope `tweet.write`.

## Configuracion legacy con tokens en `.env`

Usar solo si no se quiere usar `xurl`:

```env
X_AUTH_PROVIDER=env
X_MCP_ACCOUNT=fcbnews2026
X_ACCOUNT_FCBNEWS2026_USER_ACCESS_TOKEN=
X_ACCOUNT_FCBNEWS2026_REFRESH_TOKEN=
X_OAUTH_CLIENT_ID=
```

En este modo, el MCP usa directamente los tokens configurados en `.env`. Para
instalaciones nuevas, preferir `xurl`.

## Configuracion multicuentas

Con `xurl`, registrar varias apps o usuarios y seleccionar:

```env
X_AUTH_PROVIDER=xurl
X_XURL_APP=fcbnews
X_XURL_USERNAME=FCBNews2026
X_MCP_ACCOUNT=fcbnews2026
```

Para otra cuenta:

```env
X_AUTH_PROVIDER=xurl
X_XURL_APP=personal
X_XURL_USERNAME=lluisfont
X_MCP_ACCOUNT=lluisfont
```

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

## Validaciones recomendadas

Ver cuenta activa y proveedor de auth:

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
