# X MCP Server

Servidor Model Context Protocol (MCP) en TypeScript para operar con la API
oficial de X desde agentes compatibles con MCP, incluyendo agentes de ChatGPT.

El proyecto permite:

- Consultar la cuenta autenticada de X.
- Consultar usuarios, posts y busquedas recientes.
- Publicar posts y respuestas cuando el modo de escritura esta activado.
- Seleccionar una cuenta local distinta por ordenador.
- Ejecutar el MCP por `stdio` o por HTTP local.
- Conectarlo a ChatGPT mediante Secure MCP Tunnels de OpenAI.

## Estado del proyecto

MVP funcional.

Incluye:

- Servidor MCP sobre `stdio`.
- Servidor MCP sobre Streamable HTTP.
- Cliente para la API oficial de X.
- Configuracion multicuentas local.
- Modo seguro `read-only` por defecto.
- Helper local OAuth 2.0 Authorization Code + PKCE para reautorizar cuentas de X.
- Pruebas unitarias con Vitest.
- Guia de conexion con ChatGPT mediante tunnel.

## Herramientas MCP disponibles

| Herramienta | Tipo | Descripcion |
| --- | --- | --- |
| `x_get_active_account` | Lectura | Devuelve el perfil local activo, cuentas configuradas, modo y usuario autenticado. |
| `x_get_me` | Lectura | Devuelve el usuario autenticado en X. |
| `x_get_user` | Lectura | Busca un usuario por username. |
| `x_get_post` | Lectura | Consulta un post por ID. |
| `x_get_user_posts` | Lectura | Lista posts recientes de un usuario por ID. |
| `x_search_posts` | Lectura | Busca posts recientes usando la sintaxis oficial de X. |
| `x_create_post` | Escritura | Publica un nuevo post. Requiere `X_MCP_MODE=read-write`. |
| `x_reply_post` | Escritura | Responde a un post. Requiere `X_MCP_MODE=read-write`. |

## Requisitos

- Node.js 20 o superior.
- Cuenta de X Developer.
- App de X con OAuth 2.0 activado.
- Scopes de lectura: `tweet.read users.read`.
- Scope de escritura, si se va a publicar: `tweet.write`.
- Scope recomendado para renovar tokens: `offline.access`.
- Para ChatGPT: Developer Mode activado y un Secure MCP Tunnel creado en OpenAI Platform.

## Instalacion

```powershell
npm install
Copy-Item .env.example .env
```

Editar `.env` con la configuracion local.

Nunca commitear:

- `.env`
- access tokens
- refresh tokens
- client secrets
- API keys privadas

## Configuracion minima

Ejemplo para una sola cuenta:

```env
X_MCP_ACCOUNT=default
X_USER_ACCESS_TOKEN=
X_MCP_MODE=read-only
X_MCP_TRANSPORT=stdio
X_API_BASE_URL=https://api.x.com
```

Ejemplo multicuentas:

```env
X_MCP_ACCOUNT=fcbnews2026
X_MCP_MODE=read-write

X_ACCOUNT_FCBNEWS2026_USER_ACCESS_TOKEN=
X_ACCOUNT_FCBNEWS2026_REFRESH_TOKEN=

X_ACCOUNT_LLUISFONT_USER_ACCESS_TOKEN=
X_ACCOUNT_LLUISFONT_REFRESH_TOKEN=
```

`X_MCP_ACCOUNT` selecciona que cuenta usa esta instalacion local. Cada ordenador
puede seleccionar una cuenta distinta sin cambiar codigo.

## Ejecutar por stdio

Usar este modo para hosts MCP locales que lanzan el proceso directamente.

```powershell
npm run dev
```

En produccion local despues de compilar:

```powershell
npm run build
npm run start
```

## Ejecutar por HTTP local

Usar este modo para conectarlo a ChatGPT mediante tunnel.

```powershell
npm run dev:http
```

Endpoint MCP por defecto:

```text
http://127.0.0.1:3001/mcp
```

Health check:

```powershell
Invoke-RestMethod http://127.0.0.1:3001/healthz | ConvertTo-Json -Compress
```

Respuesta esperada:

```json
{"ok":true,"transport":"http","activeAccount":"fcbnews2026","mode":"read-write"}
```

Para arrancar, parar o automatizar el servidor local al iniciar Windows:

[docs/local-server-lifecycle.md](docs/local-server-lifecycle.md)

## Conectar con ChatGPT

Resumen del flujo:

```text
1. Ejecutar el MCP en HTTP local.
2. Crear un tunnel en OpenAI Platform.
3. Crear un perfil local de tunnel-client que apunte a http://127.0.0.1:3001/mcp.
4. Arrancar tunnel-client.
5. Crear un MCP personalizado en el agente de ChatGPT usando Conexion: Tunel.
6. Probar primero x_get_active_account o x_get_me.
```

Guia completa:

[docs/chatgpt-mcp-setup.md](docs/chatgpt-mcp-setup.md)

## Reautorizar una cuenta de X

Configurar en X Developer:

```text
Callback URI: http://127.0.0.1:3002/callback
Website URL: http://127.0.0.1:3002
App permissions: Read and write
```

Ejecutar:

```powershell
$env:X_OAUTH_CLIENT_ID = "<OAuth 2.0 Client ID>"
$env:X_MCP_ACCOUNT = "fcbnews2026"
npm run x:oauth
```

Abrir la URL generada con la cuenta correcta de X y autorizar. El helper
actualizara `.env` con el token de la cuenta seleccionada.

## Scripts

| Script | Uso |
| --- | --- |
| `npm run dev` | Arranca el MCP por `stdio`. |
| `npm run dev:http` | Arranca el MCP por HTTP local. |
| `npm run x:oauth` | Ejecuta el helper OAuth local para X. |
| `npm run build` | Compila TypeScript a `dist`. |
| `npm run start` | Arranca el servidor compilado por `stdio`. |
| `npm run start:http` | Arranca el servidor compilado por HTTP. |
| `npm run typecheck` | Ejecuta TypeScript sin emitir archivos. |
| `npm test` | Ejecuta las pruebas. |

## Documentacion

- [docs/project-architecture.md](docs/project-architecture.md): arquitectura del proyecto.
- [docs/configuration.md](docs/configuration.md): variables de entorno y multicuentas.
- [docs/local-server-lifecycle.md](docs/local-server-lifecycle.md): activar, desactivar y automatizar el servidor local.
- [docs/tools.md](docs/tools.md): herramientas MCP y contratos de uso.
- [docs/x-oauth.md](docs/x-oauth.md): reautorizacion OAuth de X.
- [docs/development.md](docs/development.md): desarrollo, pruebas y criterios de cambios.
- [docs/chatgpt-mcp-setup.md](docs/chatgpt-mcp-setup.md): creacion de MCPs locales para ChatGPT.

## Seguridad operativa

- Mantener `read-only` por defecto.
- Activar `read-write` solo para pruebas o flujos controlados.
- Verificar siempre la cuenta activa con `x_get_active_account`.
- No publicar hasta tener el texto exacto aprobado.
- No registrar nada como publicado hasta recibir un ID del servicio final.
- No exponer tokens en logs, commits o conversaciones.

## Licencia

No se ha seleccionado una licencia open-source todavia.
