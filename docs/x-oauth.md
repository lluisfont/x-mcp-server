# OAuth de X

Este proyecto usa OAuth 2.0 User Access Token para llamar a la API oficial de X.

El helper local:

```powershell
npm run x:oauth
```

implementa Authorization Code + PKCE y guarda el access token en `.env` para la
cuenta seleccionada.

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
