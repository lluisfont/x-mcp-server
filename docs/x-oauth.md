# OAuth de X

Para instalaciones nuevas, usar `xurl`, la CLI oficial de X, como gestor de
OAuth, tokens, refresh y rotacion.

```powershell
npx -y @xdevplatform/xurl auth apps add fcbnews --client-id "<OAuth 2.0 Client ID>" --redirect-uri http://localhost:8080/callback
npx -y @xdevplatform/xurl auth oauth2 --app fcbnews FCBNews2026
```

El MCP se configura con:

```env
X_AUTH_PROVIDER=xurl
X_XURL_APP=fcbnews
X_XURL_USERNAME=FCBNews2026
```

## Helper legacy

El helper local:

```powershell
npm run x:oauth
```

implementa Authorization Code + PKCE y guarda el access token en `.env` para la
cuenta seleccionada.

Este helper queda como compatibilidad para `X_AUTH_PROVIDER=env`.

## Configuracion en X Developer

En la app de X Developer:

```text
OAuth 2.0: Enabled
App permissions: Read and write
Type of App: Web App, Automated App or Bot, Native App, etc.
```

URLs locales:

```text
Callback URI: http://127.0.0.1:3002/callback
Website URL: http://127.0.0.1:3002
```

Scopes recomendados:

```text
tweet.read users.read tweet.write offline.access
```

## Ejecutar autorizacion

Seleccionar la cuenta local:

```powershell
$env:X_MCP_ACCOUNT = "fcbnews2026"
```

Configurar el Client ID:

```powershell
$env:X_OAUTH_CLIENT_ID = "<OAuth 2.0 Client ID>"
```

Ejecutar:

```powershell
npm run x:oauth
```

El script mostrara una URL. Abrirla en el navegador estando logueado en X con la
cuenta correcta.

Al autorizar, el helper guarda:

```env
X_ACCOUNT_FCBNEWS2026_USER_ACCESS_TOKEN=
X_ACCOUNT_FCBNEWS2026_REFRESH_TOKEN=
```

Con `X_AUTH_PROVIDER=xurl`, el MCP no lee estos tokens de `.env`; los gestiona
`xurl` en su propio almacenamiento local.

Si `X_MCP_ACCOUNT=default`, guarda:

```env
X_ACCOUNT_DEFAULT_USER_ACCESS_TOKEN=
X_ACCOUNT_DEFAULT_REFRESH_TOKEN=
```

## Despues de autorizar

Reiniciar el servidor MCP:

```powershell
# Detener npm run dev:http con Ctrl+C
npm run dev:http
```

Validar:

```powershell
Invoke-RestMethod http://127.0.0.1:3001/healthz | ConvertTo-Json -Compress
```

Desde el agente o cliente MCP, ejecutar:

```text
x_get_active_account
```

Confirmar que la cuenta devuelta es la esperada.

## Cuando reautorizar

Reautorizar cuando:

- X devuelve `401 Unauthorized`.
- Se han cambiado scopes en X Developer.
- Se ha revocado el token.
- Se quiere cambiar la cuenta asociada a un perfil local.
- Se cambia de app de X Developer.

## Buenas practicas

- Autorizar siempre con la cuenta de X correcta abierta en el navegador.
- Verificar con `x_get_me` antes de publicar.
- Mantener `offline.access` para recibir refresh token.
- No copiar tokens a documentacion, issues o chats.
